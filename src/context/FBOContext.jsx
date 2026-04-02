import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const FBOContext = createContext(null)

export function FBOProvider({ children }) {
  const { user, fboProfile } = useAuth()
  const [arrivals, setArrivals] = useState([])
  const [departures, setDepartures] = useState([])
  const [fuelPrices, setFuelPrices] = useState({ avgas: 0, jetA: 0, lastUpdated: null })
  const [loadingArrivals, setLoadingArrivals] = useState(true)
  const [loadingDepartures, setLoadingDepartures] = useState(true)

  // Fetch arrivals from Supabase
  const fetchArrivals = useCallback(async () => {
    if (!user) return
    setLoadingArrivals(true)
    const { data, error } = await supabase
      .from('arrivals')
      .select('*')
      .eq('fbo_id', user.id)
      .in('status', ['pending', 'confirmed'])
      .order('eta', { ascending: true })
    if (!error && data) setArrivals(data)
    setLoadingArrivals(false)
  }, [user])

  // Fetch departures from Supabase
  const fetchDepartures = useCallback(async () => {
    if (!user) return
    setLoadingDepartures(true)
    const { data, error } = await supabase
      .from('departures')
      .select('*')
      .eq('fbo_id', user.id)
      .in('status', ['scheduled', 'fueled', 'taxiing'])
      .order('etd', { ascending: true })
    if (!error && data) setDepartures(data)
    setLoadingDepartures(false)
  }, [user])

  // Load arrivals + departures on mount / user change
  useEffect(() => {
    fetchArrivals()
    fetchDepartures()
  }, [fetchArrivals, fetchDepartures])

  // Sync fuel prices from fboProfile
  useEffect(() => {
    if (fboProfile) {
      setFuelPrices({
        avgas: parseFloat(fboProfile.avgas_price) || 0,
        jetA: parseFloat(fboProfile.jeta_price) || 0,
        lastUpdated: fboProfile.price_last_updated ? new Date(fboProfile.price_last_updated) : new Date(),
      })
    }
  }, [fboProfile])

  // Real-time subscription for arrivals
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('arrivals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arrivals',
          filter: `fbo_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setArrivals((prev) => [...prev, payload.new].sort((a, b) => a.eta.localeCompare(b.eta)))
          } else if (payload.eventType === 'UPDATE') {
            setArrivals((prev) => {
              // If status changed to declined, remove it
              if (payload.new.status === 'declined') {
                return prev.filter((a) => a.id !== payload.new.id)
              }
              return prev.map((a) => (a.id === payload.new.id ? payload.new : a))
            })
          } else if (payload.eventType === 'DELETE') {
            setArrivals((prev) => prev.filter((a) => a.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Real-time subscription for departures
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('departures-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'departures',
          filter: `fbo_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDepartures((prev) => [...prev, payload.new].sort((a, b) => a.etd.localeCompare(b.etd)))
          } else if (payload.eventType === 'UPDATE') {
            setDepartures((prev) => {
              if (payload.new.status === 'departed') {
                return prev.filter((d) => d.id !== payload.new.id)
              }
              return prev.map((d) => (d.id === payload.new.id ? payload.new : d))
            })
          } else if (payload.eventType === 'DELETE') {
            setDepartures((prev) => prev.filter((d) => d.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Confirm arrival — update in Supabase
  const confirmArrival = useCallback(async (id) => {
    const { error } = await supabase
      .from('arrivals')
      .update({ status: 'confirmed' })
      .eq('id', id)
    if (!error) {
      setArrivals((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'confirmed' } : a)))
    }
  }, [])

  // Decline arrival — update status in Supabase
  const declineArrival = useCallback(async (id) => {
    const { error } = await supabase
      .from('arrivals')
      .update({ status: 'declined' })
      .eq('id', id)
    if (!error) {
      setArrivals((prev) => prev.filter((a) => a.id !== id))
    }
  }, [])

  // Add arrival — insert into Supabase
  const addArrival = useCallback(async (arrival) => {
    if (!user) return
    const { data, error } = await supabase
      .from('arrivals')
      .insert({
        fbo_id: user.id,
        tail_number: arrival.tailNumber,
        aircraft_type: arrival.aircraftType,
        eta: arrival.eta,
        pax_count: arrival.paxCount,
        services: arrival.services,
        pilot_notes: arrival.pilotNotes,
        status: 'pending',
      })
      .select()
      .single()
    if (!error && data) {
      setArrivals((prev) => [...prev, data].sort((a, b) => a.eta.localeCompare(b.eta)))
    }
  }, [user])

  // Mark departure as fueled
  const markFueled = useCallback(async (id) => {
    const { error } = await supabase
      .from('departures')
      .update({ status: 'fueled' })
      .eq('id', id)
    if (!error) {
      setDepartures((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'fueled' } : d)))
    }
  }, [])

  // Mark departure as departed
  const markDeparted = useCallback(async (id) => {
    const { error } = await supabase
      .from('departures')
      .update({ status: 'departed' })
      .eq('id', id)
    if (!error) {
      setDepartures((prev) => prev.filter((d) => d.id !== id))
    }
  }, [])

  // Undo departed — restore to fueled
  const undoDeparted = useCallback(async (id) => {
    const { data, error } = await supabase
      .from('departures')
      .update({ status: 'fueled' })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setDepartures((prev) => [...prev, data].sort((a, b) => a.etd.localeCompare(b.etd)))
    }
  }, [])

  // Update fuel price — write to Supabase
  const updateFuelPrice = useCallback(async (type, price) => {
    if (!user) return
    const field = type === 'avgas' ? 'avgas_price' : 'jeta_price'
    const { error } = await supabase
      .from('fbo_profiles')
      .update({ [field]: price, price_last_updated: new Date().toISOString() })
      .eq('id', user.id)
    if (!error) {
      setFuelPrices((prev) => ({
        ...prev,
        [type]: price,
        lastUpdated: new Date(),
      }))
    }
  }, [user])

  const pendingArrivals = arrivals.filter((a) => a.status === 'pending')
  const confirmedArrivals = arrivals.filter((a) => a.status === 'confirmed')

  return (
    <FBOContext.Provider
      value={{
        arrivals,
        pendingArrivals,
        confirmedArrivals,
        loadingArrivals,
        addArrival,
        confirmArrival,
        declineArrival,
        departures,
        loadingDepartures,
        markFueled,
        markDeparted,
        undoDeparted,
        fuelPrices,
        updateFuelPrice,
      }}
    >
      {children}
    </FBOContext.Provider>
  )
}

export function useFBO() {
  const ctx = useContext(FBOContext)
  if (!ctx) throw new Error('useFBO must be used within FBOProvider')
  return ctx
}
