// OpenSky Network ADS-B API service
// Routes through Supabase Edge Function to avoid CORS and protect credentials

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// --- Rate limiting ---
const queryCache = new Map() // tailNumber -> { data, timestamp }
const MIN_INTERVAL = 60000 // 60 seconds per tail
let rateLimitedUntil = 0

function isRateLimited() {
  return Date.now() < rateLimitedUntil
}

function handleRateLimit() {
  const backoffMs = 5 * 60 * 1000 // 5 minutes
  rateLimitedUntil = Date.now() + backoffMs
  console.warn(`[OpenSky] Rate limited — backing off until ${new Date(rateLimitedUntil).toLocaleTimeString()}`)
}

// --- ICAO24 hex code lookup ---
// US N-numbers: algorithmic conversion to ICAO24 hex
function tailToIcao24(tail) {
  if (!tail) return null
  const t = tail.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (t.startsWith('N')) return nNumberToIcao24(t)
  return null
}

function nNumberToIcao24(nNumber) {
  const base = 0xA00001
  const n = nNumber.substring(1)
  if (!n) return null

  const digits = []
  const letters = []
  for (const ch of n) {
    if (ch >= '0' && ch <= '9') digits.push(ch)
    else if (ch >= 'A' && ch <= 'Z') letters.push(ch)
  }

  if (digits.length === 0) return null

  const d1 = parseInt(digits[0]) - 1
  if (d1 < 0) return null

  let offset = d1 * 101711

  if (digits.length >= 2) offset += 1 + parseInt(digits[1]) * 10111
  if (digits.length >= 3) offset += 1 + parseInt(digits[2]) * 951
  if (digits.length >= 4) offset += 1 + parseInt(digits[3]) * 35
  if (digits.length >= 5) offset += 1 + parseInt(digits[4])

  if (letters.length >= 1 && digits.length < 5) {
    const l1 = letters[0].charCodeAt(0) - 65
    if (digits.length <= 3) offset += 1 + l1 * (digits.length <= 2 ? 35 : 1)
    else offset += 1 + l1
  }
  if (letters.length >= 2 && digits.length <= 3) {
    offset += 1 + (letters[1].charCodeAt(0) - 65)
  }

  return (base + offset).toString(16).toLowerCase().padStart(6, '0')
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
  if (!tailNumber || !SUPABASE_URL) return null

  // Check rate limit — return cached data
  if (isRateLimited()) {
    return queryCache.get(tailNumber)?.data || null
  }

  // Check per-tail cache
  const cached = queryCache.get(tailNumber)
  if (cached && Date.now() - cached.timestamp < MIN_INTERVAL) {
    return cached.data
  }

  const icao24 = tailToIcao24(tailNumber)

  try {
    const params = icao24
      ? `icao24=${icao24}`
      : `callsign=${tailNumber.replace(/[^A-Z0-9]/gi, '')}`

    const res = await fetch(`${SUPABASE_URL}/functions/v1/opensky-proxy?${params}`, {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    })

    if (res.status === 429) {
      handleRateLimit()
      return cached?.data || null
    }

    if (!res.ok) {
      console.warn(`[OpenSky] Proxy error ${res.status} for ${tailNumber}`)
      return cached?.data || null
    }

    const json = await res.json()
    const states = json.states

    if (!states || states.length === 0) {
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

    queryCache.set(tailNumber, { data: result, timestamp: Date.now() })
    return result
  } catch (err) {
    console.error(`[OpenSky] Error for ${tailNumber}:`, err.message)
    return cached?.data || null
  }
}
