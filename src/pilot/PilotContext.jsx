import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

const PilotCtx = createContext(null)

// sessionStorage cache helpers (tab-scoped, won't leak between tabs)
const cache = {
  get: (key) => { try { return JSON.parse(sessionStorage.getItem(`rr_pilot_${key}`)) } catch { return null } },
  set: (key, val) => { try { sessionStorage.setItem(`rr_pilot_${key}`, JSON.stringify(val)) } catch {} },
}

export function PilotPortalProvider({ children }) {
  const { user, pilotProfile, refreshProfile } = useAuth()
  const { showToast } = useToast()

  const [aircraft, setAircraft] = useState(cache.get('aircraft') || [])
  const [requests, setRequests] = useState(cache.get('requests') || [])
  const [notifications, setNotifications] = useState([])
  const [conversations, setConversations] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [loading, setLoading] = useState({ aircraft: true, requests: true })
  // Track if initial data load is complete so we don't toast for existing data
  const initialLoadDone = useRef(false)
  const knownRequestIds = useRef(new Set())
  const knownNotifIds = useRef(new Set())
  const lastRequestStatuses = useRef(new Map())

  // Fetch pilot's aircraft — no loading flash on refetch (SWR pattern)
  const fetchAircraft = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('pilot_aircraft').select('*').eq('pilot_id', user.id).order('is_primary', { ascending: false })
    if (data) { setAircraft(data); cache.set('aircraft', data) }
    setLoading(p => p.aircraft ? { ...p, aircraft: false } : p)
  }, [user])

  // Fetch service requests — no loading flash on refetch
  // Also syncs status from arrivals table (FBO can update arrivals but not service_requests due to RLS)
  const fetchRequests = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('service_requests').select('*').eq('pilot_id', user.id).order('created_at', { ascending: false })
    if (data) {
      // Check for status mismatches with arrivals table (FBO updates arrivals, not service_requests)
      const pendingIds = data.filter(r => r.status === 'pending').map(r => r.id)
      if (pendingIds.length > 0) {
        const { data: arrivalStatuses } = await supabase
          .from('arrivals')
          .select('service_request_id, status, fbo_response_notes')
          .in('service_request_id', pendingIds)
          .in('status', ['confirmed', 'declined', 'cancelled'])
        if (arrivalStatuses?.length > 0) {
          // Sync: pilot updates own service_requests rows to match arrival status
          for (const arr of arrivalStatuses) {
            const update = { status: arr.status }
            if (arr.fbo_response_notes) update.fbo_response_notes = arr.fbo_response_notes
            await supabase.from('service_requests').update(update).eq('id', arr.service_request_id)
            // Update local data array too
            const idx = data.findIndex(r => r.id === arr.service_request_id)
            if (idx !== -1) data[idx] = { ...data[idx], ...update }
          }
        }
      }

      // Toast for status changes found via polling
      if (initialLoadDone.current) {
        data.forEach(r => {
          const prevStatus = lastRequestStatuses.current.get(r.id)
          if (prevStatus && prevStatus !== r.status) {
            if (r.status === 'confirmed') {
              showToast({ title: 'Request Confirmed', body: `${r.airport_icao} — your request has been confirmed`, type: 'request_confirmed', key: `req-confirmed-${r.id}` })
            } else if (r.status === 'declined') {
              showToast({ title: 'Request Declined', body: `${r.airport_icao} — FBO was unable to fulfill your request`, type: 'request_declined', key: `req-declined-${r.id}` })
            }
          }
        })
      }
      lastRequestStatuses.current = new Map(data.map(r => [r.id, r.status]))
      setRequests(data); cache.set('requests', data)
    }
    setLoading(p => p.requests ? { ...p, requests: false } : p)
  }, [user, showToast])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    if (data) {
      // Toast for genuinely new notifications found via polling
      if (initialLoadDone.current) {
        data.forEach(n => {
          if (!knownNotifIds.current.has(n.id)) {
            showToast({ title: n.title || 'New Notification', body: n.body, type: n.type || 'info', key: `notif-${n.id}` })
          }
        })
      }
      knownNotifIds.current = new Set(data.map(n => n.id))
      setNotifications(data)
    }
  }, [user, showToast])

  useEffect(() => {
    Promise.all([fetchAircraft(), fetchRequests(), fetchNotifications()]).then(() => {
      // Small delay so realtime subscriptions that fire during initial load don't trigger toasts
      setTimeout(() => { initialLoadDone.current = true }, 2000)
    })
  }, [fetchAircraft, fetchRequests, fetchNotifications])

  // Polling fallback — ensures data stays fresh even if Realtime WebSocket drops.
  // Lightweight: only fetches if tab is visible, no loading flash (SWR pattern).
  useEffect(() => {
    if (!user) return
    const POLL_MS = 10000 // 10 seconds
    const poll = setInterval(() => {
      if (!document.hidden) {
        fetchRequests()
        fetchNotifications()
      }
    }, POLL_MS)
    const onVisible = () => { if (!document.hidden) { fetchRequests(); fetchNotifications() } }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(poll); document.removeEventListener('visibilitychange', onVisible) }
  }, [user, fetchRequests, fetchNotifications])

  // Real-time: service_requests
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('pilot-requests-rt').on('postgres_changes', {
      event: '*', schema: 'public', table: 'service_requests', filter: `pilot_id=eq.${user.id}`,
    }, (payload) => {
      if (payload.eventType === 'INSERT') {
        setRequests(p => [payload.new, ...p])
      } else if (payload.eventType === 'UPDATE') {
        setRequests(p => p.map(r => r.id === payload.new.id ? payload.new : r))
        // Toast for status changes
        if (initialLoadDone.current) {
          const r = payload.new
          if (r.status === 'confirmed') {
            showToast({
              title: 'Request Confirmed',
              body: `${r.airport_icao} — your request has been confirmed`,
              type: 'request_confirmed',
              key: `req-confirmed-${r.id}`,
            })
          } else if (r.status === 'declined') {
            showToast({
              title: 'Request Declined',
              body: `${r.airport_icao} — FBO was unable to fulfill your request`,
              type: 'request_declined',
              key: `req-declined-${r.id}`,
            })
          } else if (r.status === 'pending' && r.edited_by === 'fbo' && r.edited_at) {
            showToast({
              title: 'Request Updated by FBO',
              body: `${r.airport_icao} — the FBO has edited your request`,
              type: 'info',
              key: `req-edited-${r.id}-${r.edited_at}`,
            })
          }
        }
      } else if (payload.eventType === 'DELETE') {
        setRequests(p => p.filter(r => r.id !== payload.old.id))
      }
    }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, showToast])

  // Real-time: notifications
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('pilot-notifs-rt').on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}`,
    }, (payload) => {
      setNotifications(p => [payload.new, ...p])
      // Show toast for new notifications (skip during initial load)
      if (initialLoadDone.current) {
        const n = payload.new
        showToast({
          title: n.title || 'New Notification',
          body: n.body,
          type: n.type || 'info',
          key: `notif-${n.id}`,
        })
      }
    }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, showToast])

  // Ref so broadcast callback can read current requests without re-subscribing
  const requestsRef = useRef(requests)
  useEffect(() => { requestsRef.current = requests }, [requests])

  // Real-time: direct broadcast from FBO — bypasses postgres_changes / RLS entirely
  // This is the primary path for instant confirm/decline/cancel delivery.
  // The pilot's own client also writes the status to service_requests (pilot owns the row
  // via RLS, so this succeeds even when the FBO's cross-table update is blocked by RLS).
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`pilot-updates-${user.id}`).on('broadcast', { event: 'request_status' }, ({ payload }) => {
      if (!payload?.requestId || !payload?.status) return
      const update = { status: payload.status }
      if (payload.fbo_response_notes) update.fbo_response_notes = payload.fbo_response_notes
      // Optimistic UI update
      setRequests(p => p.map(r => r.id === payload.requestId ? { ...r, ...update } : r))
      // Persist to DB — pilot owns the row so RLS allows this
      supabase.from('service_requests').update(update).eq('id', payload.requestId).then(({ error }) => {
        if (error) console.warn('[Pilot] Failed to persist status from broadcast:', error.message)
      })
      if (initialLoadDone.current) {
        const r = requestsRef.current.find(r => r.id === payload.requestId)
        const label = r?.airport_icao || 'Your request'
        if (payload.status === 'confirmed') {
          showToast({ title: 'Request Confirmed', body: `${label} — confirmed by the FBO`, type: 'request_confirmed', key: `req-bc-confirmed-${payload.requestId}` })
        } else if (payload.status === 'declined') {
          showToast({ title: 'Request Declined', body: `${label} — FBO was unable to fulfill`, type: 'request_declined', key: `req-bc-declined-${payload.requestId}` })
        } else if (payload.status === 'cancelled') {
          showToast({ title: 'Request Cancelled', body: `${label} — cancelled by the FBO`, type: 'request_declined', key: `req-bc-cancelled-${payload.requestId}` })
        }
      }
    }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, showToast])

  // Real-time: global pilot messages — catches messages from FBOs on ANY request
  // Uses pilot_id direct column match for reliable Realtime + RLS delivery
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('pilot-messages-global').on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages', filter: `pilot_id=eq.${user.id}`,
    }, (payload) => {
      const msg = payload.new
      // Only show toast for messages NOT sent by the pilot themselves
      if (msg.sender_role === 'pilot') return
      if (initialLoadDone.current) {
        setUnreadMessages(c => c + 1)
        showToast({
          title: 'New Message',
          body: msg.body?.slice(0, 80) || 'You have a new message from the FBO',
          type: 'message',
          key: `msg-${msg.id}`,
        })
      }
    }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, showToast])

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
      // Background: create arrival + notify FBO (non-blocking so UI stays responsive)
      ;(async () => {
        try {
          // Create the arrival record for the FBO if a DB trigger hasn't already done so
          const { data: existingArr } = await supabase.from('arrivals').select('id').eq('service_request_id', data.id).maybeSingle()
          if (!existingArr) {
            await supabase.from('arrivals').insert({
              fbo_id: req.fboId,
              pilot_id: user.id,
              service_request_id: data.id,
              tail_number: req.tailNumber,
              aircraft_type: req.aircraftType,
              eta: req.eta,
              pax_count: req.paxCount || 0,
              services: req.services || [],
              fuel_type: req.fuelType || null,
              fuel_quantity: req.fuelQuantity || null,
              pilot_notes: req.pilotNotes || '',
              status: 'pending',
            })
          }
          await supabase.from('notifications').insert({
            user_id: req.fboId,
            title: 'New Service Request',
            body: `${req.tailNumber} ${req.aircraftType || ''} — ETA ${req.eta || 'TBD'}`.trim(),
            type: 'arrival',
          })
        } catch (e) {
          console.warn('[Pilot] Background sync failed (non-blocking):', e.message)
        }
      })()
      return data
    }
    return null
  }, [user])

  // Edit request — optimistic: update UI instantly, reset to pending so FBO must re-confirm
  const editRequest = useCallback(async (id, updates) => {
    const req = requests.find(r => r.id === id)
    const now = new Date().toISOString()
    // Optimistic UI — merge edits + reset status to pending
    setRequests(p => p.map(r => r.id === id ? { ...r, ...updates, status: 'pending', edited_at: now, edited_by: 'pilot' } : r))
    // All DB operations in background — never block the UI
    ;(async () => {
      try {
        await supabase.from('service_requests').update({
          ...updates, status: 'pending', edited_at: now, edited_by: 'pilot',
        }).eq('id', id)
        await supabase.from('arrivals').update({
          ...updates, status: 'pending', edited_at: now, edited_by: 'pilot',
        }).eq('service_request_id', id)
        if (req?.fbo_id) {
          await supabase.from('notifications').insert({
            user_id: req.fbo_id,
            title: 'Request Edited',
            body: `${updates.tail_number || req.tail_number || 'A pilot'} edited their request at ${req.airport_icao || 'your FBO'}`,
            type: 'arrival',
          })
        }
      } catch (e) {
        console.warn('[Pilot] Edit sync failed (non-blocking):', e.message)
      }
    })()
  }, [requests])

  // Cancel request — optimistic: update UI instantly, sync to FBO in background
  const cancelRequest = useCallback(async (id) => {
    const req = requests.find(r => r.id === id)
    // Optimistic UI update — request shows cancelled immediately
    setRequests(p => p.map(r => r.id === id ? { ...r, status: 'cancelled' } : r))
    // All DB operations in background — never block the UI
    ;(async () => {
      try {
        await supabase.from('service_requests').update({ status: 'cancelled' }).eq('id', id)
        await supabase.from('arrivals').update({ status: 'cancelled' }).eq('service_request_id', id)
        if (req?.fbo_id) {
          await supabase.from('notifications').insert({
            user_id: req.fbo_id,
            title: 'Request Cancelled',
            body: `${req.tail_number || 'A pilot'} cancelled their request at ${req.airport_icao || 'your FBO'}`,
            type: 'info',
          })
        }
      } catch (e) {
        console.warn('[Pilot] Cancel sync failed (non-blocking):', e.message)
      }
    })()
  }, [requests])

  // Messages
  const fetchMessages = useCallback(async (requestId) => {
    const { data } = await supabase.from('messages').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
    return data || []
  }, [])

  const sendMessage = useCallback(async ({ requestId, body }) => {
    if (!user) return null
    const req = requests.find(r => r.id === requestId)
    // Look up the corresponding arrival so FBO-side chat (which queries by arrival_id) can see it
    let arrivalId = null
    if (requestId) {
      const { data: arrData } = await supabase.from('arrivals').select('id').eq('service_request_id', requestId).maybeSingle()
      if (arrData) arrivalId = arrData.id
    }
    const { data, error } = await supabase.from('messages').insert({
      request_id: requestId,
      arrival_id: arrivalId,
      fbo_id: req?.fbo_id,
      pilot_id: user.id,
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
      notifications, unreadNotifications, unreadMessages, setUnreadMessages,
      flightsThisYear, totalFuel, favoriteFBO,
      searchFBOs, searchFBOsByAirport, getFBO, browseAllFBOs,
      submitRequest, editRequest, cancelRequest,
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
