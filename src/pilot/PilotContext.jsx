import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const PilotCtx = createContext(null)

// sessionStorage cache helpers (tab-scoped, won't leak between tabs)
const cache = {
  get: (key) => { try { return JSON.parse(sessionStorage.getItem(`rr_pilot_${key}`)) } catch { return null } },
  set: (key, val) => { try { sessionStorage.setItem(`rr_pilot_${key}`, JSON.stringify(val)) } catch {} },
}

export function PilotPortalProvider({ children }) {
  const { user, pilotProfile, refreshProfile } = useAuth()

  const [aircraft, setAircraft] = useState(cache.get('aircraft') || [])
  const [requests, setRequests] = useState(cache.get('requests') || [])
  const [notifications, setNotifications] = useState([])
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState({ aircraft: true, requests: true })

  // Fetch pilot's aircraft
  const fetchAircraft = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('pilot_aircraft').select('*').eq('pilot_id', user.id).order('is_primary', { ascending: false })
    if (data) { setAircraft(data); cache.set('aircraft', data) }
    setLoading(p => ({ ...p, aircraft: false }))
  }, [user])

  // Fetch service requests
  const fetchRequests = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('service_requests').select('*').eq('pilot_id', user.id).order('created_at', { ascending: false })
    if (data) { setRequests(data); cache.set('requests', data) }
    setLoading(p => ({ ...p, requests: false }))
  }, [user])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    if (data) setNotifications(data)
  }, [user])

  useEffect(() => {
    fetchAircraft()
    fetchRequests()
    fetchNotifications()
  }, [fetchAircraft, fetchRequests, fetchNotifications])

  // Real-time: service_requests
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('pilot-requests-rt').on('postgres_changes', {
      event: '*', schema: 'public', table: 'service_requests', filter: `pilot_id=eq.${user.id}`,
    }, (payload) => {
      if (payload.eventType === 'INSERT') setRequests(p => [payload.new, ...p])
      else if (payload.eventType === 'UPDATE') setRequests(p => p.map(r => r.id === payload.new.id ? payload.new : r))
      else if (payload.eventType === 'DELETE') setRequests(p => p.filter(r => r.id !== payload.old.id))
    }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  // Real-time: notifications
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('pilot-notifs-rt').on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}`,
    }, (payload) => {
      setNotifications(p => [payload.new, ...p])
    }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  // Search FBOs — matches ICAO, FBO name, airport name, city
  const searchFBOs = useCallback(async (query) => {
    if (!query || query.length < 2) return []
    const q = query.trim()
    const { data } = await supabase.from('fbo_profiles').select('*')
      .or(`airport_icao.ilike.%${q}%,fbo_name.ilike.%${q}%,airport_name.ilike.%${q}%,city.ilike.%${q}%`)
    return data || []
  }, [])

  const searchFBOsByAirport = useCallback(async (icao) => {
    const { data } = await supabase.from('fbo_profiles').select('*').eq('airport_icao', icao.toUpperCase())
    return data || []
  }, [])

  const getFBO = useCallback(async (fboId) => {
    const { data } = await supabase.from('fbo_profiles').select('*').eq('id', fboId).single()
    return data
  }, [])

  const browseAllFBOs = useCallback(async () => {
    const { data } = await supabase.from('fbo_profiles').select('*').order('airport_icao')
    return data || []
  }, [])

  // Submit service request
  const submitRequest = useCallback(async (req) => {
    if (!user) return null
    const { data, error } = await supabase.from('service_requests').insert({
      pilot_id: user.id,
      fbo_id: req.fboId,
      airport_icao: req.airportIcao,
      tail_number: req.tailNumber,
      aircraft_type: req.aircraftType,
      eta: req.eta,
      pax_count: req.paxCount || 0,
      services: req.services || [],
      fuel_type: req.fuelType || null,
      fuel_quantity: req.fuelQuantity || null,
      pilot_notes: req.pilotNotes || '',
      status: 'pending',
    }).select().single()
    if (!error && data) {
      setRequests(p => [data, ...p])
      return data
    }
    return null
  }, [user])

  // Cancel request
  const cancelRequest = useCallback(async (id) => {
    const { error } = await supabase.from('service_requests').update({ status: 'cancelled' }).eq('id', id)
    if (!error) setRequests(p => p.map(r => r.id === id ? { ...r, status: 'cancelled' } : r))
  }, [])

  // Messages
  const fetchMessages = useCallback(async (requestId) => {
    const { data } = await supabase.from('messages').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
    return data || []
  }, [])

  const sendMessage = useCallback(async ({ requestId, body }) => {
    if (!user) return null
    const req = requests.find(r => r.id === requestId)
    const { data, error } = await supabase.from('messages').insert({
      request_id: requestId,
      fbo_id: req?.fbo_id,
      sender_role: 'pilot',
      sender_name: pilotProfile?.display_name || 'Pilot',
      body,
    }).select().single()
    if (!error && data) return data
    return null
  }, [user, requests, pilotProfile])

  // Mark notification read
  const markNotificationRead = useCallback(async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(p => p.map(n => ({ ...n, read: true })))
  }, [user])

  // Aircraft CRUD
  const addAircraft = useCallback(async (ac) => {
    if (!user) return null
    if (ac.isPrimary) {
      await supabase.from('pilot_aircraft').update({ is_primary: false }).eq('pilot_id', user.id)
    }
    const { data } = await supabase.from('pilot_aircraft').insert({
      pilot_id: user.id, tail_number: ac.tailNumber, make_model: ac.makeModel,
      fuel_type: ac.fuelType, is_primary: ac.isPrimary || false,
    }).select().single()
    if (data) { await fetchAircraft(); return data }
    return null
  }, [user, fetchAircraft])

  const deleteAircraft = useCallback(async (id) => {
    await supabase.from('pilot_aircraft').delete().eq('id', id)
    setAircraft(p => p.filter(a => a.id !== id))
  }, [])

  // Update profile
  const updateProfile = useCallback(async (fields) => {
    if (!user) return
    const { error } = await supabase.from('pilot_profiles').update(fields).eq('id', user.id)
    if (!error) await refreshProfile()
  }, [user, refreshProfile])

  // Derived data
  const primaryAircraft = aircraft.find(a => a.is_primary) || aircraft[0]
  const activeRequests = requests.filter(r => ['pending', 'confirmed'].includes(r.status))
  const completedRequests = requests.filter(r => ['completed', 'cancelled', 'declined'].includes(r.status))
  const unreadNotifications = notifications.filter(n => !n.read).length

  // Stats
  const flightsThisYear = requests.filter(r => {
    const d = new Date(r.created_at)
    return d.getFullYear() === new Date().getFullYear() && r.status !== 'cancelled'
  }).length

  const totalFuel = requests.reduce((sum, r) => sum + (r.fuel_quantity || 0), 0)

  const favoriteFBO = (() => {
    const counts = {}
    requests.forEach(r => { if (r.fbo_id) counts[r.fbo_id] = (counts[r.fbo_id] || 0) + 1 })
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return top ? top[0] : null
  })()

  return (
    <PilotCtx.Provider value={{
      aircraft, primaryAircraft, loading,
      requests, activeRequests, completedRequests,
      notifications, unreadNotifications,
      flightsThisYear, totalFuel, favoriteFBO,
      searchFBOs, searchFBOsByAirport, getFBO, browseAllFBOs,
      submitRequest, cancelRequest,
      fetchMessages, sendMessage,
      fetchAircraft, addAircraft, deleteAircraft,
      fetchNotifications, markNotificationRead, markAllNotificationsRead,
      updateProfile, fetchRequests,
    }}>
      {children}
    </PilotCtx.Provider>
  )
}

export function usePilotPortal() {
  const ctx = useContext(PilotCtx)
  if (!ctx) throw new Error('usePilotPortal must be used within PilotPortalProvider')
  return ctx
}
