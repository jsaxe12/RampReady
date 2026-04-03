const API_BASE = 'https://opensky-network.org/api'

// ── Persistent caches (survive across warm Vercel invocations) ──
// Once we find a callsign's ICAO24, all future requests use the fast direct query
const callsignToIcao24 = new Map() // "EJA386" → "a47303"
let statesCache = null
let statesCacheTime = 0
const STATES_CACHE_TTL = 30000 // 30 seconds

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { icao24, tail, callsign } = req.query

  // Accept both ?tail= and ?callsign= (callsign takes priority for airline flight IDs)
  const identifier = (callsign || tail || '').replace(/[^A-Z0-9]/gi, '').toUpperCase()

  if (identifier) {
    console.log(`[opensky] Lookup: identifier=${identifier}`)

    // ── Strategy 1: N-number → ICAO24 direct lookup (instant, <200ms) ──
    const hex = nNumberToIcao24(identifier)
    if (hex) {
      console.log(`[opensky] N-number ${identifier} → icao24=${hex}`)
      const data = await fetchFiltered(hex)
      if (data?.states?.length > 0) {
        return ok(res, data)
      }
      // N-number not airborne, also try as callsign (some N-numbers are used as callsigns)
      console.log(`[opensky] icao24=${hex} not airborne, trying callsign fallback...`)
    }

    // ── Strategy 2: Callsign → cached ICAO24 direct lookup (instant, <200ms) ──
    const cachedHex = callsignToIcao24.get(identifier)
    if (cachedHex) {
      console.log(`[opensky] Cached: ${identifier} → icao24=${cachedHex}`)
      const data = await fetchFiltered(cachedHex)
      if (data?.states?.length > 0) {
        // Verify the callsign still matches (aircraft may have changed callsigns)
        const cs = (data.states[0][1] || '').trim().toUpperCase()
        if (cs === identifier) {
          return ok(res, data)
        }
        // Stale mapping — clear it and fall through to full search
        callsignToIcao24.delete(identifier)
        console.log(`[opensky] Stale cache: ${cachedHex} now cs=${cs}, not ${identifier}`)
      } else {
        // Aircraft no longer airborne — clear stale cache
        callsignToIcao24.delete(identifier)
      }
    }

    // ── Strategy 3: Full callsign search (slower, but caches result for next time) ──
    const result = await searchByCallsign(identifier)
    if (result) {
      return ok(res, result)
    }

    // Nothing found — aircraft likely not airborne
    console.log(`[opensky] ✗ No results for ${identifier}`)
    return res.status(200).json({ time: Math.floor(Date.now() / 1000), states: null })
  }

  // Legacy: direct icao24 parameter
  if (icao24) {
    const data = await fetchFiltered(icao24)
    if (!data) return res.status(502).json({ error: 'OpenSky API error' })
    return ok(res, data)
  }

  return res.status(400).json({ error: 'Missing tail, callsign, or icao24 parameter' })
}

function ok(res, data) {
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=50')
  return res.status(200).json(data)
}

// ── Fast direct ICAO24 query (small response, <500ms) ──
async function fetchFiltered(hex) {
  const url = `${API_BASE}/states/all?icao24=${hex}`
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 8000)
    const apiRes = await fetch(url, { signal: controller.signal })
    clearTimeout(tid)
    if (apiRes.status === 429) return { error: 'rate_limited', states: null }
    if (!apiRes.ok) {
      console.warn(`[opensky] API ${apiRes.status} for icao24=${hex}`)
      return null
    }
    return await apiRes.json()
  } catch (err) {
    console.warn(`[opensky] ${err.name === 'AbortError' ? 'Timeout' : 'Error'} icao24=${hex}`)
    return null
  }
}

// ── Callsign search — uses bounding box + caches ICAO24 for future fast lookups ──
async function searchByCallsign(callsign) {
  const now = Date.now()
  let allStates = null

  // Use cached states if fresh
  if (statesCache && (now - statesCacheTime) < STATES_CACHE_TTL) {
    allStates = statesCache
    console.log(`[opensky] Using cached states (${allStates.length} aircraft)`)
  } else {
    // Try US bounding box first — ~950KB / ~1.5s vs ~1.5MB / ~3s for global
    allStates = await fetchAllStates(true)
    if (!allStates) {
      // Fallback: global (no bounding box)
      console.log(`[opensky] Bounded fetch failed, trying global...`)
      allStates = await fetchAllStates(false)
    }
    if (!allStates) return null
    statesCache = allStates
    statesCacheTime = now
    console.log(`[opensky] Fetched ${allStates.length} aircraft for callsign search`)
  }

  // Match callsign (OpenSky pads to 8 chars with spaces)
  const target = callsign.toUpperCase()
  const matches = allStates.filter(s => (s[1] || '').trim().toUpperCase() === target)

  if (matches.length > 0) {
    // Cache callsign → ICAO24 so ALL future requests are fast direct queries
    const foundHex = matches[0][0]
    callsignToIcao24.set(target, foundHex)
    console.log(`[opensky] ✓ Found ${target} → icao24=${foundHex} (cached for fast future lookups)`)
    return { time: Math.floor(now / 1000), states: matches }
  }
  return null
}

async function fetchAllStates(useBoundingBox) {
  // Continental US + Mexico + Southern Canada covers nearly all domestic flights
  let url = `${API_BASE}/states/all`
  if (useBoundingBox) {
    url += '?lamin=20&lamax=55&lomin=-130&lomax=-60'
  }
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 20000) // 20s — plenty of room with maxDuration=30
    const apiRes = await fetch(url, { signal: controller.signal })
    clearTimeout(tid)
    if (apiRes.status === 429) {
      console.warn(`[opensky] Rate limited on states fetch`)
      return null
    }
    if (!apiRes.ok) {
      console.warn(`[opensky] States fetch returned ${apiRes.status}`)
      return null
    }
    const json = await apiRes.json()
    return json.states || []
  } catch (err) {
    console.warn(`[opensky] States fetch failed: ${err.message}`)
    return null
  }
}

// ── N-number to ICAO24 hex conversion ──
// FAA N-numbers map algorithmically to the A00001–AFFFFF ICAO24 range
// Letters exclude I and O (24 valid: A-H, J-N, P-Z)

function letterIndex(ch) {
  const c = ch.charCodeAt(0) - 65
  if (c >= 15) return c - 2  // P-Z → 13-23
  if (c >= 9) return c - 1   // J-N → 8-12
  return c                     // A-H → 0-7
}

function nNumberToIcao24(tail) {
  const n = tail.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!n.startsWith('N')) return null
  const suffix = n.substring(1)
  if (!suffix || suffix.length > 5) return null
  // Must start with a digit 1-9
  if (suffix[0] < '1' || suffix[0] > '9') return null

  const chars = []
  for (const ch of suffix) {
    if (ch >= '0' && ch <= '9') chars.push({ type: 'digit', value: parseInt(ch) })
    else if (ch >= 'A' && ch <= 'Z' && ch !== 'I' && ch !== 'O') chars.push({ type: 'letter', value: ch })
    else return null
  }

  if (chars.length === 0 || chars[0].type !== 'digit' || chars[0].value === 0) return null

  const digitSize = [101711, 10111, 951, 35, 1]
  const letterSpace = [601, 601, 601, 601, 25]

  const base = 0xA00001
  let offset = (chars[0].value - 1) * digitSize[0]
  let digitLevel = 1
  let i = 1

  while (i < chars.length) {
    const ch = chars[i]
    if (ch.type === 'digit') {
      offset += letterSpace[digitLevel] + ch.value * digitSize[digitLevel]
      digitLevel++
      i++
    } else {
      const l1 = letterIndex(ch.value)
      if (digitLevel <= 3) {
        offset += 1 + l1 * 25
        i++
        if (i < chars.length && chars[i].type === 'letter') {
          offset += 1 + letterIndex(chars[i].value)
          i++
        }
      } else {
        offset += 1 + l1
        i++
      }
      break
    }
  }

  return (base + offset).toString(16).toLowerCase().padStart(6, '0')
}
