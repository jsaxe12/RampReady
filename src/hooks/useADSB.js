import { useState, useEffect, useRef, useCallback } from 'react'
import { getFlightData } from '../lib/opensky'

const POLL_INTERVAL = 30000 // 30 seconds — matches OpenSky update rate

/**
 * Hook to fetch and auto-refresh ADS-B data for a tail number / callsign.
 * Returns { adsb, loading } where adsb is the flight data or null.
 * Pauses polling when tab is hidden, resumes on visibility.
 */
export function useADSB(identifier, enabled = true) {
  const [adsb, setAdsb] = useState(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)
  const activeRef = useRef(true)

  const doFetch = useCallback(async () => {
    if (!activeRef.current || !identifier) return
    const data = await getFlightData(identifier)
    if (!activeRef.current) return
    if (data !== undefined) {
      setAdsb((prev) => data ?? prev)
    }
    setLoading(false)
  }, [identifier])

  useEffect(() => {
    if (!enabled || !identifier) {
      setAdsb(null)
      setLoading(false)
      return
    }

    activeRef.current = true
    setLoading(true)
    doFetch()

    // Start polling
    intervalRef.current = setInterval(doFetch, POLL_INTERVAL)

    // Pause when tab is hidden, resume when visible (prevents burst of requests)
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      } else {
        // Fetch immediately on return, then resume interval
        doFetch()
        intervalRef.current = setInterval(doFetch, POLL_INTERVAL)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      activeRef.current = false
      clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [identifier, enabled, doFetch])

  return { adsb, loading }
}
