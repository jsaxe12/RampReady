const OPENSKY_BASE = 'https://opensky-network.org/api'
const FR24_FEED = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js'

// ── Persistent caches (survive across warm Vercel invocations) ──
const callsignToIcao24 = new Map() // "EJA386" → "a47303"

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { icao24, tail, callsign } = req.query

  const identifier = (callsign || tail || '').replace(/[^A-Z0-9]/gi, '').toUpperCase()

  if (identifier) {
    console.log(`[opensky] Lookup: ${identifier}`)

    // ── Strategy 1: N-number → ICAO24 → direct OpenSky query (fastest) ──
    const hex = nNumberToIcao24(identifier)
    if (hex) {
      console.log(`[opensky] N-number ${identifier} → icao24=${hex}`)
      const data = await fetchOpenSkyFiltered(hex)
      if (data?.states?.length > 0) {
        return ok(res, data)
      }
      console.log(`[opensky] icao24=${hex} not airborne, trying callsign...`)
    }

    // ── Strategy 2: Cached callsign → ICAO24 → direct OpenSky query ──
    const cachedHex = callsignToIcao24.get(identifier)
    if (cachedHex) {
      console.log(`[opensky] Cache hit: ${identifier} → icao24=${cachedHex}`)
      const data = await fetchOpenSkyFiltered(cachedHex)
      if (data?.states?.length > 0) {
        const cs = (data.states[0][1] || '').trim().toUpperCase()
        if (cs === identifier) return ok(res, data)
        // Stale — different callsign now on this transponder
        callsignToIcao24.delete(identifier)
      } else {
        callsignToIcao24.delete(identifier)
      }
    }

    // ── Strategy 3: FR24 callsign lookup → get ICAO24 → OpenSky filtered query ──
    // FR24 feed is fast and supports direct callsign search
    const fr24Hex = await resolveCallsignViaFR24(identifier)
    if (fr24Hex) {
      console.log(`[opensky] FR24 resolved ${identifier} → icao24=${fr24Hex}`)
      callsignToIcao24.set(identifier, fr24Hex)
      const data = await fetchOpenSkyFiltered(fr24Hex)
      if (data?.states?.length > 0) {
        return ok(res, data)
      }
      // OpenSky might not have this aircraft — return FR24 data directly
      console.log(`[opensky] OpenSky has no data for ${fr24Hex}, using FR24 fallback`)
      const fr24Data = await fetchFR24AsOpenSkyFormat(identifier)
      if (fr24Data) return ok(res, fr24Data)
    }

    // ── Strategy 4: Fallback — try OpenSky with bounded region fetch ──
    console.log(`[opensky] Trying bounded states search for ${identifier}...`)
    const boundedResult = await searchByCallsignBounded(identifier)
    if (boundedResult) return ok(res, boundedResult)

    console.log(`[opensky] ✗ No results for ${identifier}`)
    return res.status(200).json({ time: Math.floor(Date.now() / 1000), states: null })
  }

  // Legacy: direct icao24 parameter
  if (icao24) {
    const data = await fetchOpenSkyFiltered(icao24)
    if (!data) return res.status(502).json({ error: 'OpenSky API error' })
    return ok(res, data)
  }

  return res.status(400).json({ error: 'Missing tail, callsign, or icao24 parameter' })
}

function ok(res, data) {
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=50')
  return res.status(200).json(data)
}

// ── OpenSky filtered ICAO24 query (small, fast, reliable from Vercel) ──
async function fetchOpenSkyFiltered(hex) {
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 8000)
    const apiRes = await fetch(`${OPENSKY_BASE}/states/all?icao24=${hex}`, { signal: controller.signal })
    clearTimeout(tid)
    if (apiRes.status === 429) return { error: 'rate_limited', states: null }
    if (!apiRes.ok) {
      console.warn(`[opensky] OpenSky ${apiRes.status} for icao24=${hex}`)
      return null
    }
    return await apiRes.json()
  } catch (err) {
    console.warn(`[opensky] ${err.name === 'AbortError' ? 'Timeout' : 'Error'} icao24=${hex}`)
    return null
  }
}

// ── FR24 callsign → ICAO24 resolution (fast, ~200ms) ──
async function resolveCallsignViaFR24(callsign) {
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 5000)
    const url = `${FR24_FEED}?callsign=${callsign}&faa=1&satellite=1&mlat=1&adsb=1&gnd=0&air=1&vehicles=0&estimated=0&maxage=14400&gliders=0&stats=0`
    const apiRes = await fetch(url, { signal: controller.signal })
    clearTimeout(tid)
    if (!apiRes.ok) {
      console.warn(`[opensky] FR24 returned ${apiRes.status}`)
      return null
    }
    const data = await apiRes.json()
    // FR24 response: { "full_count":..., "version":..., "<flight_id>": [icao24, lat, lon, ...] }
    for (const [key, val] of Object.entries(data)) {
      if (key === 'full_count' || key === 'version' || key === 'stats') continue
      if (Array.isArray(val) && val[0]) {
        const hex = val[0].toLowerCase()
        console.log(`[opensky] FR24: ${callsign} → icao24=${hex} (reg=${val[9]}, type=${val[8]})`)
        return hex
      }
    }
    return null
  } catch (err) {
    console.warn(`[opensky] FR24 error: ${err.message}`)
    return null
  }
}

// ── FR24 full data as OpenSky-format fallback ──
// Returns FR24 data formatted like OpenSky state vectors so the client doesn't need to change
async function fetchFR24AsOpenSkyFormat(callsign) {
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 5000)
    const url = `${FR24_FEED}?callsign=${callsign}&faa=1&satellite=1&mlat=1&adsb=1&gnd=0&air=1&vehicles=0&estimated=0&maxage=14400&gliders=0&stats=0`
    const apiRes = await fetch(url, { signal: controller.signal })
    clearTimeout(tid)
    if (!apiRes.ok) return null
    const data = await apiRes.json()
    for (const [key, val] of Object.entries(data)) {
      if (key === 'full_count' || key === 'version' || key === 'stats') continue
      if (Array.isArray(val) && val[0]) {
        // FR24 array: [0]icao24, [1]lat, [2]lon, [3]heading, [4]alt_ft, [5]speed_kts,
        //             [6]squawk, [7]radar, [8]type, [9]registration, [10]timestamp,
        //             [11]origin, [12]destination, [13]flight_id, [14]on_ground,
        //             [15]vert_rate, [16]callsign, [17]source
        const altM = val[4] != null ? val[4] / 3.28084 : null // Convert ft → meters (OpenSky format)
        const speedMs = val[5] != null ? val[5] / 1.94384 : null // Convert kts → m/s
        const vertMs = val[15] != null ? val[15] / 196.85 : null // Convert fpm → m/s
        const state = [
          val[0].toLowerCase(),   // [0] icao24
          (val[16] || callsign).padEnd(8), // [1] callsign
          'United States',        // [2] origin_country
          val[10] || Math.floor(Date.now() / 1000), // [3] time_position
          val[10] || Math.floor(Date.now() / 1000), // [4] last_contact
          val[2],                 // [5] longitude
          val[1],                 // [6] latitude
          altM,                   // [7] baro_altitude (meters)
          val[14] === 1,          // [8] on_ground
          speedMs,                // [9] velocity (m/s)
          val[3],                 // [10] true_track (heading)
          vertMs,                 // [11] vertical_rate (m/s)
          null,                   // [12] sensors
          val[4] != null ? val[4] / 3.28084 : null, // [13] geo_altitude
          val[6] || '',           // [14] squawk
          false,                  // [15] spi
          0,                      // [16] position_source
        ]
        console.log(`[opensky] FR24 fallback: ${callsign} alt=${val[4]}ft gs=${val[5]}kts`)
        return { time: Math.floor(Date.now() / 1000), states: [state] }
      }
    }
    return null
  } catch (err) {
    console.warn(`[opensky] FR24 fallback error: ${err.message}`)
    return null
  }
}

// ── Bounded OpenSky search (last resort for callsigns) ──
let statesCache = null
let statesCacheTime = 0
const STATES_CACHE_TTL = 45000

async function searchByCallsignBounded(callsign) {
  const now = Date.now()
  let allStates = null

  if (statesCache && (now - statesCacheTime) < STATES_CACHE_TTL) {
    allStates = statesCache
  } else {
    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), 20000)
      // Southwest US region centered on Arizona — covers inbound flights within ~600nm
      const apiRes = await fetch(`${OPENSKY_BASE}/states/all?lamin=25&lamax=45&lomin=-125&lomax=-95`, {
        signal: controller.signal,
      })
      clearTimeout(tid)
      if (!apiRes.ok) {
        console.warn(`[opensky] Bounded fetch returned ${apiRes.status}`)
        return null
      }
      const json = await apiRes.json()
      allStates = json.states || []
      statesCache = allStates
      statesCacheTime = now
      console.log(`[opensky] Bounded fetch: ${allStates.length} aircraft`)
    } catch (err) {
      console.warn(`[opensky] Bounded fetch failed: ${err.message}`)
      return null
    }
  }

  const target = callsign.toUpperCase()
  const matches = allStates.filter(s => (s[1] || '').trim().toUpperCase() === target)
  if (matches.length > 0) {
    callsignToIcao24.set(target, matches[0][0])
    console.log(`[opensky] ✓ Bounded search found ${target} → icao24=${matches[0][0]}`)
    return { time: Math.floor(now / 1000), states: matches }
  }
  return null
}

// ── N-number to ICAO24 hex conversion ──
function letterIndex(ch) {
  const c = ch.charCodeAt(0) - 65
  if (c >= 15) return c - 2
  if (c >= 9) return c - 1
  return c
}

function nNumberToIcao24(tail) {
  const n = tail.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!n.startsWith('N')) return null
  const suffix = n.substring(1)
  if (!suffix || suffix.length > 5) return null
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
