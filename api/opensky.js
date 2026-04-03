const API_BASE = 'https://opensky-network.org/api'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { icao24, tail } = req.query

  if (tail) {
    const cleanTail = tail.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    const hex = nNumberToIcao24(cleanTail)

    console.log(`[opensky] tail=${cleanTail} → icao24=${hex || 'N/A'}`)

    // Strategy 1: If we have an ICAO24 hex, query directly (fast, small response)
    if (hex) {
      const data = await fetchOpenSky(`icao24=${hex}`)
      if (data && data.states && data.states.length > 0) {
        console.log(`[opensky] ✓ Found via icao24=${hex}`)
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=50')
        return res.status(200).json(data)
      }
      console.log(`[opensky] icao24=${hex} returned no states, trying callsign search...`)
    }

    // Strategy 2: Search all states by callsign (needed for non-N-numbers like JRE809)
    // OpenSky doesn't support callsign as a query filter, so we fetch all and filter
    const callsignResult = await searchByCallsign(cleanTail)
    if (callsignResult) {
      console.log(`[opensky] ✓ Found via callsign search: ${cleanTail}`)
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=50')
      return res.status(200).json(callsignResult)
    }

    // Neither worked — aircraft likely not airborne
    console.log(`[opensky] ✗ No results for tail=${cleanTail}`)
    return res.status(200).json({ time: Math.floor(Date.now() / 1000), states: null })
  }

  // Legacy: direct icao24 parameter
  if (icao24) {
    const data = await fetchOpenSky(`icao24=${icao24}`)
    if (!data) return res.status(502).json({ error: 'OpenSky API error' })
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=50')
    return res.status(200).json(data)
  }

  return res.status(400).json({ error: 'Missing tail or icao24 parameter' })
}

// --- Fetch with icao24 filter (small, fast response) ---
async function fetchOpenSky(queryParam) {
  const url = `${API_BASE}/states/all?${queryParam}`
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const apiRes = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (apiRes.status === 429) return { error: 'rate_limited', states: null }
    if (!apiRes.ok) {
      console.warn(`[opensky] API returned ${apiRes.status} for ${queryParam}`)
      return null
    }
    return await apiRes.json()
  } catch (err) {
    console.warn(`[opensky] ${err.name === 'AbortError' ? 'Timeout' : 'Error'} for ${queryParam}`)
    return null
  }
}

// --- Search all states by callsign (larger download, needed for non-N-numbers) ---
// OpenSky callsigns are 8 chars right-padded with spaces, e.g. "JRE809  "
let statesCache = null
let statesCacheTime = 0
const STATES_CACHE_TTL = 15000 // 15 seconds

async function searchByCallsign(callsign) {
  const now = Date.now()

  // Use cached full states if fresh enough
  let allStates = null
  if (statesCache && (now - statesCacheTime) < STATES_CACHE_TTL) {
    allStates = statesCache
    console.log(`[opensky] Using cached states (${allStates.length} aircraft)`)
  } else {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const apiRes = await fetch(`${API_BASE}/states/all`, { signal: controller.signal })
      clearTimeout(timeout)

      if (!apiRes.ok) {
        console.warn(`[opensky] Full states fetch returned ${apiRes.status}`)
        return null
      }
      const json = await apiRes.json()
      allStates = json.states || []
      statesCache = allStates
      statesCacheTime = now
      console.log(`[opensky] Fetched ${allStates.length} aircraft states for callsign search`)
    } catch (err) {
      console.warn(`[opensky] Full states fetch failed: ${err.message}`)
      return null
    }
  }

  // Search for matching callsign (field index 1, right-padded with spaces)
  const target = callsign.toUpperCase()
  const matches = allStates.filter(s => {
    const cs = (s[1] || '').trim().toUpperCase()
    return cs === target
  })

  if (matches.length > 0) {
    return { time: Math.floor(now / 1000), states: matches }
  }
  return null
}

// --- N-number to ICAO24 hex conversion ---
// FAA N-numbers map algorithmically to the A00001-AFFFFF ICAO24 range
// Format: N + d1(1-9) + [d2 + [d3 + [d4 + [d5 | L1] | L1[L2]] | L1[L2]] | L1[L2]]
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
