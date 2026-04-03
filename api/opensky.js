const API_BASE = 'https://opensky-network.org/api'

export default async function handler(req, res) {
  const { icao24, callsign } = req.query

  if (!icao24 && !callsign) {
    return res.status(400).json({ error: 'Missing icao24 or callsign parameter' })
  }

  let apiUrl = `${API_BASE}/states/all?`
  if (icao24) apiUrl += `icao24=${icao24}`
  else apiUrl += `callsign=${callsign}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const apiRes = await fetch(apiUrl, { signal: controller.signal })
    clearTimeout(timeout)

    if (apiRes.status === 429) {
      return res.status(429).json({ error: 'rate_limited' })
    }

    if (!apiRes.ok) {
      return res.status(502).json({ error: `OpenSky API error: ${apiRes.status}` })
    }

    const data = await apiRes.json()
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=50')
    return res.status(200).json(data)
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'OpenSky API timeout' })
    }
    return res.status(500).json({ error: 'Internal error' })
  }
}
