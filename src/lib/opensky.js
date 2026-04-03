// OpenSky Network ADS-B API service
// Routes through Vercel serverless function (/api/opensky) to avoid CORS
// The proxy handles both ICAO24 and callsign lookups with automatic fallback

// --- Rate limiting ---
const queryCache = new Map() // tailNumber -> { data, timestamp }
const MIN_INTERVAL = 30000   // 30 seconds per tail (OpenSky updates every ~10s)
let rateLimitedUntil = 0

function isRateLimited() {
  return Date.now() < rateLimitedUntil
}

function handleRateLimit() {
  const backoffMs = 5 * 60 * 1000
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

// --- Main API function ---
export async function getFlightData(tailNumber) {
  if (!tailNumber) return null

  // Check rate limit — return cached data
  if (isRateLimited()) {
    console.log(`[OpenSky] Rate limited, returning cached data for ${tailNumber}`)
    return queryCache.get(tailNumber)?.data || null
  }

  // Check per-tail cache
  const cached = queryCache.get(tailNumber)
  if (cached && Date.now() - cached.timestamp < MIN_INTERVAL) {
    return cached.data
  }

  try {
    // Send tail number to proxy — it handles ICAO24 conversion + callsign fallback
    const cleanTail = tailNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    console.log(`[OpenSky] Fetching ADS-B for ${cleanTail}`)

    const res = await fetch(`/api/opensky?tail=${encodeURIComponent(cleanTail)}`)

    if (res.status === 429) {
      handleRateLimit()
      return cached?.data || null
    }

    if (!res.ok) {
      console.warn(`[OpenSky] Proxy error ${res.status} for ${tailNumber}`)
      return cached?.data || null
    }

    const json = await res.json()

    if (json.error === 'rate_limited') {
      handleRateLimit()
      return cached?.data || null
    }

    const states = json.states

    if (!states || states.length === 0) {
      console.log(`[OpenSky] No ADS-B data for ${cleanTail} — aircraft may not be airborne`)
      queryCache.set(tailNumber, { data: null, timestamp: Date.now() })
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
      tailNumber,
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

    console.log(`[OpenSky] ✓ Got ADS-B for ${cleanTail}: icao24=${s[0]}, alt=${altitudeFt}ft, dist=${distanceNm}nm, gs=${groundspeedKts}kt`)
    queryCache.set(tailNumber, { data: result, timestamp: Date.now() })
    return result
  } catch (err) {
    console.error(`[OpenSky] Error for ${tailNumber}:`, err.message)
    return cached?.data || null
  }
}
