// OpenSky Network ADS-B API service
// Routes through Vercel serverless function (/api/opensky) to avoid CORS
// The proxy handles N-number ICAO24 conversion + callsign search with caching

// --- Rate limiting ---
const queryCache = new Map() // key -> { data, timestamp }
const MIN_INTERVAL = 15000   // 15 seconds between queries for same identifier
let rateLimitedUntil = 0

function isRateLimited() {
  return Date.now() < rateLimitedUntil
}

function handleRateLimit() {
  const backoffMs = 3 * 60 * 1000
  rateLimitedUntil = Date.now() + backoffMs
  console.warn(`[OpenSky] Rate limited — backing off until ${new Date(rateLimitedUntil).toLocaleTimeString()}`)
}

// --- Haversine distance calculation ---
// KSDL: 33.6229° N, 111.9105° W
const KSDL_LAT = 33.6229
const KSDL_LON = -111.9105

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3440.065 // Earth radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function calculateETA(distanceNm, groundspeedKts) {
  if (!groundspeedKts || groundspeedKts <= 0) return null
  const eta = new Date(Date.now() + (distanceNm / groundspeedKts) * 3600000)
  return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Detect if an identifier looks like an N-number vs a callsign
function isNNumber(id) {
  return /^N\d/.test(id)
}

// --- Main API function ---
// identifier: tail number (N12345) OR callsign (EJA386)
export async function getFlightData(identifier) {
  if (!identifier) return null

  const clean = identifier.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  if (!clean) return null

  // Check rate limit — return cached data
  if (isRateLimited()) {
    console.log(`[OpenSky] Rate limited, returning cached data for ${clean}`)
    return queryCache.get(clean)?.data || null
  }

  // Check per-identifier cache
  const cached = queryCache.get(clean)
  if (cached && Date.now() - cached.timestamp < MIN_INTERVAL) {
    return cached.data
  }

  try {
    // Use ?tail= for N-numbers, ?callsign= for everything else
    // The proxy handles both, but the param name helps it prioritize the right strategy
    const param = isNNumber(clean) ? 'tail' : 'callsign'
    console.log(`[OpenSky] Fetching ADS-B: ${param}=${clean}`)

    const res = await fetch(`/api/opensky?${param}=${encodeURIComponent(clean)}`)

    if (res.status === 429) {
      handleRateLimit()
      return cached?.data || null
    }

    if (!res.ok) {
      console.warn(`[OpenSky] Proxy error ${res.status} for ${clean}`)
      return cached?.data || null
    }

    const json = await res.json()

    if (json.error === 'rate_limited') {
      handleRateLimit()
      return cached?.data || null
    }

    const states = json.states

    if (!states || states.length === 0) {
      console.log(`[OpenSky] No ADS-B data for ${clean} — aircraft may not be airborne`)
      queryCache.set(clean, { data: null, timestamp: Date.now() })
      return null
    }

    // OpenSky state vector:
    // [0] icao24, [1] callsign, [2] origin_country, [3] time_position,
    // [4] last_contact, [5] longitude, [6] latitude, [7] baro_altitude,
    // [8] on_ground, [9] velocity, [10] true_track, [11] vertical_rate
    const s = states[0]

    const latitude = s[6]
    const longitude = s[5]
    const altitudeFt = s[7] != null ? Math.round(s[7] * 3.28084) : null
    const onGround = s[8]
    const groundspeedKts = s[9] != null ? Math.round(s[9] * 1.94384) : null
    const headingDeg = s[10] != null ? Math.round(s[10]) : null
    const verticalRateFpm = s[11] != null ? Math.round(s[11] * 196.85) : null
    const lastContact = s[4]

    let distanceNm = null
    if (latitude != null && longitude != null) {
      distanceNm = Math.round(haversineDistance(latitude, longitude, KSDL_LAT, KSDL_LON))
    }

    const etaCalc = distanceNm != null && groundspeedKts ? calculateETA(distanceNm, groundspeedKts) : null

    const result = {
      identifier: clean,
      tailNumber: isNNumber(clean) ? clean : (s[0] || '').toUpperCase(),
      icao24: s[0],
      callsign: (s[1] || '').trim(),
      latitude,
      longitude,
      altitude: altitudeFt,
      groundspeed: groundspeedKts,
      heading: headingDeg,
      verticalRate: verticalRateFpm,
      onGround,
      distanceNm,
      etaCalculated: etaCalc,
      lastContact: lastContact ? new Date(lastContact * 1000) : null,
      timestamp: new Date(),
    }

    console.log(`[OpenSky] ✓ ${clean}: icao24=${s[0]}, cs=${result.callsign}, alt=${altitudeFt}ft, dist=${distanceNm}nm`)
    queryCache.set(clean, { data: result, timestamp: Date.now() })
    return result
  } catch (err) {
    console.error(`[OpenSky] Error for ${clean}:`, err.message)
    return cached?.data || null
  }
}
