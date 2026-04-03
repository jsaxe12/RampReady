const API_BASE = 'https://opensky-network.org/api'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { icao24, callsign, tail } = req.query

  // If 'tail' is provided, try both icao24 and callsign approaches
  if (tail) {
    const hex = nNumberToIcao24(tail)
    const cs = tail.replace(/[^A-Z0-9]/gi, '').toUpperCase()

    console.log(`[opensky] tail=${tail} → icao24=${hex}, callsign=${cs}`)

    // Try icao24 first (most reliable if conversion is correct)
    if (hex) {
      const data = await fetchOpenSky(`icao24=${hex}`)
      if (data && data.states && data.states.length > 0) {
        console.log(`[opensky] Found via icao24=${hex}`)
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=50')
        return res.status(200).json(data)
      }
    }

    // Fallback: try callsign (GA aircraft often broadcast N-number as callsign)
    if (cs) {
      const data = await fetchOpenSky(`callsign=${cs}`)
      if (data && data.states && data.states.length > 0) {
        console.log(`[opensky] Found via callsign=${cs}`)
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=50')
        return res.status(200).json(data)
      }
    }

    // Neither worked — aircraft likely not airborne
    console.log(`[opensky] No results for tail=${tail}`)
    return res.status(200).json({ time: Math.floor(Date.now() / 1000), states: null })
  }

  // Legacy direct params
  if (!icao24 && !callsign) {
    return res.status(400).json({ error: 'Missing icao24, callsign, or tail parameter' })
  }

  const param = icao24 ? `icao24=${icao24}` : `callsign=${callsign}`
  const data = await fetchOpenSky(param)
  if (!data) {
    return res.status(502).json({ error: 'OpenSky API error' })
  }
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=50')
  return res.status(200).json(data)
}

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
    if (err.name === 'AbortError') {
      console.warn(`[opensky] Timeout for ${queryParam}`)
    } else {
      console.error(`[opensky] Fetch error for ${queryParam}:`, err.message)
    }
    return null
  }
}

// --- N-number to ICAO24 hex conversion ---
// FAA N-numbers map algorithmically to the A00001-AFFFFF ICAO24 range
// Format: N + d1(1-9) + [d2(0-9) + [d3 + [d4 + [d5 | L1] | L1[L2]] | L1[L2]] | L1[L2]]
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
    else return null // Invalid character (I, O, or non-alpha)
  }

  if (chars.length === 0 || chars[0].type !== 'digit' || chars[0].value === 0) return null

  // Bucket sizes at each digit level:
  // Level 0 (d1): 101711 per digit
  // Level 1 (d2): 10111 per digit, letter_space = 601
  // Level 2 (d3): 951 per digit, letter_space = 601
  // Level 3 (d4): 35 per digit, letter_space = 601
  // Level 4 (d5): 1 per digit, letter_space = 25
  const digitSize = [101711, 10111, 951, 35, 1]
  const letterSpace = [601, 601, 601, 601, 25]  // letter_space before digits at each level

  const base = 0xA00001
  let offset = (chars[0].value - 1) * digitSize[0] // d1 is 1-9, maps to 0-8 blocks
  let digitLevel = 1  // Next expected digit level
  let i = 1

  while (i < chars.length) {
    const ch = chars[i]
    if (ch.type === 'digit') {
      // Jump past the letter section at this level, then into the digit's sub-block
      offset += letterSpace[digitLevel] + ch.value * digitSize[digitLevel]
      digitLevel++
      i++
    } else {
      // Letter suffix — L1 [L2]
      const l1 = letterIndex(ch.value)
      if (digitLevel <= 3) {
        // Can have 0, 1, or 2 letters (25 slots per L1: 1 for L1 alone + 24 for L1+L2)
        offset += 1 + l1 * 25
        i++
        if (i < chars.length && chars[i].type === 'letter') {
          offset += 1 + letterIndex(chars[i].value)
          i++
        }
      } else {
        // After d4: can only have 1 letter (no L2)
        offset += 1 + l1
        i++
      }
      break // Letters are always at the end
    }
  }

  const hex = (base + offset).toString(16).toLowerCase().padStart(6, '0')
  return hex
}
