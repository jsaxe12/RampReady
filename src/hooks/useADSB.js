import { useState, useEffect, useRef } from 'react'
import { getFlightData } from '../lib/opensky'

const POLL_INTERVAL = 30000 // 30 seconds — matches OpenSky update rate

/**
 * Hook to fetch and auto-refresh ADS-B data for a tail number.
 * Returns { adsb, loading } where adsb is the flight data or null.
 * Keeps last known position in state on errors/rate limits.
 */
export function useADSB(tailNumber, enabled = true) {
  const [adsb, setAdsb] = useState(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!enabled || !tailNumber) {
      setAdsb(null)
      setLoading(false)
      return
    }

    let active = true

    const fetch = async () => {
      const data = await getFlightData(tailNumber)
      if (!active) return
      // Only update if we got data — keep stale data on null (rate limit)
      if (data !== undefined) {
        setAdsb((prev) => data ?? prev)
      }
      setLoading(false)
    }

    setLoading(true)
    fetch()

    intervalRef.current = setInterval(fetch, POLL_INTERVAL)

    return () => {
      active = false
      clearInterval(intervalRef.current)
    }
  }, [tailNumber, enabled])

  return { adsb, loading }
}
