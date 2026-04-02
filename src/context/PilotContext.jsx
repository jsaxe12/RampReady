import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const PilotContext = createContext(null)

export function PilotProvider({ children }) {
  const { user, pilotProfile } = useAuth()
  const [myArrivals, setMyArrivals] = useState([])
  const [loadingArrivals, setLoadingArrivals] = useState(true)
  const [fboResults, setFboResults] = useState([])
  const [searchingFBOs, setSearchingFBOs] = useState(false)
  const [messages, setMessages] = useState([])

  // Fetch pilot's arrivals
  const fetchMyArrivals = useCallback(async () => {
    if (!user) return
    setLoadingArrivals(true)
    const { data, error } = await supabase
      .from('arrivals')
      .select('*')
      .eq('pilot_id', user.id)
      .order('created_at', { ascending: false })
    if (!error && data) setMyArrivals(data)
    setLoadingArrivals(false)
  }, [user])

  useEffect(() => {
    fetchMyArrivals()
  }, [fetchMyArrivals])

  // Real-time subscription for pilot's arrivals
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('pilot-arrivals-rt')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arrivals',
          filter: `pilot_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMyArrivals((prev) => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setMyArrivals((prev) =>
              prev.map((a) => (a.id === payload.new.id ? payload.new : a))
            )
          } else if (payload.eventType === 'DELETE') {
            setMyArrivals((prev) => prev.filter((a) => a.id !== payload.old.id))
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  // Search FBOs by ICAO
  const searchFBOs = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setFboResults([])
      return
    }
    setSearchingFBOs(true)
    const { data, error } = await supabase
      .from('fbo_profiles')
      .select('*')
      .ilike('airport_icao', `%${query.toUpperCase()}%`)
    if (!error && data) setFboResults(data)
    setSearchingFBOs(false)
  }, [])

  // Browse all FBOs
  const browseAllFBOs = useCallback(async () => {
    setSearchingFBOs(true)
    const { data, error } = await supabase
      .from('fbo_profiles')
      .select('*')
      .order('airport_icao', { ascending: true })
    if (!error && data) setFboResults(data)
    setSearchingFBOs(false)
  }, [])

  // Submit arrival request
  const submitArrivalRequest = useCallback(async ({
    fboId, tailNumber, aircraftType, eta, paxCount, services, pilotNotes,
  }) => {
    if (!user) return null
    const { data, error } = await supabase
      .from('arrivals')
      .insert({
        fbo_id: fboId,
        pilot_id: user.id,
        tail_number: tailNumber,
        aircraft_type: aircraftType,
        eta,
        pax_count: paxCount,
        services: services || [],
        pilot_notes: pilotNotes || '',
        status: 'pending',
      })
      .select()
      .single()
    if (!error && data) {
      setMyArrivals((prev) => [data, ...prev])
      return data
    }
    return null
  }, [user])

  // Fetch messages for an arrival
  const fetchMessages = useCallback(async (arrivalId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('arrival_id', arrivalId)
      .order('created_at', { ascending: true })
    if (!error && data) return data
    return []
  }, [])

  // Send message as pilot
  const sendMessage = useCallback(async ({ arrivalId, body }) => {
    if (!user) return null
    const { data, error } = await supabase
      .from('messages')
      .insert({
        fbo_id: (myArrivals.find((a) => a.id === arrivalId))?.fbo_id,
        arrival_id: arrivalId,
        sender_role: 'pilot',
        sender_name: pilotProfile?.display_name || 'Pilot',
        body,
      })
      .select()
      .single()
    if (!error && data) return data
    return null
  }, [user, myArrivals, pilotProfile])

  // Real-time messages
  useEffect(() => {
    if (!user || myArrivals.length === 0) return
    const channel = supabase
      .channel('pilot-messages-rt')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          if (myArrivals.some((a) => a.id === payload.new.arrival_id)) {
            setMessages((prev) => [...prev, payload.new])
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, myArrivals])

  const pendingArrivals = myArrivals.filter((a) => a.status === 'pending')
  const confirmedArrivals = myArrivals.filter((a) => a.status === 'confirmed')
  const declinedArrivals = myArrivals.filter((a) => a.status === 'declined')

  return (
    <PilotContext.Provider
      value={{
        myArrivals,
        pendingArrivals,
        confirmedArrivals,
        declinedArrivals,
        loadingArrivals,
        fboResults,
        searchingFBOs,
        searchFBOs,
        browseAllFBOs,
        submitArrivalRequest,
        fetchMessages,
        sendMessage,
        messages,
      }}
    >
      {children}
    </PilotContext.Provider>
  )
}

export function usePilot() {
  const ctx = useContext(PilotContext)
  if (!ctx) throw new Error('usePilot must be used within PilotProvider')
  return ctx
}
