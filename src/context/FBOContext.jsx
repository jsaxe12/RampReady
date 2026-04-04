import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useToast } from '../components/Toast'

const FBOContext = createContext(null)

export function FBOProvider({ children }) {
  const { user, fboProfile } = useAuth()
  const { showToast } = useToast()
  const [arrivals, setArrivals] = useState([])
  const [departures, setDepartures] = useState([])
  const [fuelPrices, setFuelPrices] = useState({ avgas: 0, jetA: 0, lastUpdated: null })
  const [loadingArrivals, setLoadingArrivals] = useState(true)
  const [loadingDepartures, setLoadingDepartures] = useState(true)
  const initialLoadDone = useRef(false)

  // Track known IDs so polling can detect genuinely new items for toasts
  const knownArrivalIds = useRef(new Set())
  const knownNotifIds = useRef(new Set())

  // Fetch arrivals from Supabase
  // Only show loading spinner on initial fetch — refetches update silently (SWR pattern)
  const fetchArrivals = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('arrivals')
      .select('*')
      .eq('fbo_id', user.id)
      .in('status', ['pending', 'confirmed'])
      .order('eta', { ascending: true })
    if (!error && data) {
      // Toast for genuinely new arrivals found via polling
      if (initialLoadDone.current) {
        data.forEach(a => {
          if (!knownArrivalIds.current.has(a.id)) {
            showToast({
              title: 'New Arrival',
              body: `${a.tail_number} ${a.aircraft_type || ''} — ETA ${a.eta || 'TBD'}`.trim(),
              type: 'arrival',
              key: `arrival-${a.id}`,
            })
          }
        })
      }
      knownArrivalIds.current = new Set(data.map(a => a.id))
      setArrivals(data)
    }
    setLoadingArrivals(false)
  }, [user, showToast])

  // Fetch departures from Supabase
  const fetchDepartures = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('departures')
      .select('*')
      .eq('fbo_id', user.id)
      .in('status', ['scheduled', 'fueled', 'taxiing'])
      .order('etd', { ascending: true })
    if (!error && data) setDepartures(data)
    setLoadingDepartures(false)
  }, [user])

  // --- Notifications (must be defined before polling effect) ---
  const [notifications, setNotifications] = useState([])

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) {
      if (initialLoadDone.current) {
        data.forEach(n => {
          if (!knownNotifIds.current.has(n.id)) {
            showToast({
              title: n.title || 'New Notification',
              body: n.body,
              type: n.type || 'info',
              key: `fbo-notif-${n.id}`,
            })
          }
        })
      }
      knownNotifIds.current = new Set(data.map(n => n.id))
      setNotifications(data)
    }
  }, [user, showToast])

  // Load arrivals + departures + notifications on mount / user change
  useEffect(() => {
    Promise.all([fetchArrivals(), fetchDepartures(), fetchNotifications()]).then(() => {
      setTimeout(() => { initialLoadDone.current = true }, 2000)
    })
  }, [fetchArrivals, fetchDepartures, fetchNotifications])

  // Polling fallback — ensures data stays fresh even if Realtime WebSocket drops.
  // Lightweight: only fetches if tab is visible, no loading flash (SWR pattern).
  useEffect(() => {
    if (!user) return
    const POLL_MS = 10000 // 10 seconds
    const poll = setInterval(() => {
      if (!document.hidden) {
        fetchArrivals()
        fetchDepartures()
        fetchNotifications()
      }
    }, POLL_MS)
    // Immediate refetch when tab becomes visible after being hidden
    const onVisible = () => { if (!document.hidden) { fetchArrivals(); fetchDepartures(); fetchNotifications() } }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(poll); document.removeEventListener('visibilitychange', onVisible) }
  }, [user, fetchArrivals, fetchDepartures, fetchNotifications])

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
            setArrivals((prev) => [...prev, payload.new].sort((a, b) => (a.eta || '').localeCompare(b.eta || '')))
            if (initialLoadDone.current) {
              const a = payload.new
              showToast({
                title: 'New Arrival',
                body: `${a.tail_number} ${a.aircraft_type || ''} — ETA ${a.eta || 'TBD'}`.trim(),
                type: 'arrival',
                key: `arrival-${a.id}`,
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const a = payload.new
            setArrivals((prev) => {
              // If status changed to declined or cancelled, remove it
              if (['declined', 'cancelled'].includes(a.status)) {
                return prev.filter((x) => x.id !== a.id)
              }
              return prev.map((x) => (x.id === a.id ? a : x))
            })
            // Toast when a pilot edits the arrival
            if (initialLoadDone.current && a.edited_by === 'pilot' && a.edited_at && a.status === 'pending') {
              showToast({
                title: 'Request Edited by Pilot',
                body: `${a.tail_number || 'A pilot'} edited their request — review & re-confirm`,
                type: 'arrival',
                key: `arrival-edited-${a.id}-${a.edited_at}`,
              })
            }
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
            setDepartures((prev) => [...prev, payload.new].sort((a, b) => (a.etd || '').localeCompare(b.etd || '')))
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

  // Notify pilot helper — fire-and-forget, never blocks the UI
  const notifyPilot = useCallback(async (serviceRequestId, title, body, type) => {
    try {
      const { data: sr } = await supabase.from('service_requests').select('pilot_id, airport_icao').eq('id', serviceRequestId).maybeSingle()
      if (sr?.pilot_id) {
        await supabase.from('notifications').insert({
          user_id: sr.pilot_id, title, type,
          body: body.replace('{icao}', sr.airport_icao || 'the FBO'),
          related_request_id: serviceRequestId,
        })
      }
    } catch (e) {
      console.warn('[FBO] Pilot notification failed (non-blocking):', e.message)
    }
  }, [])

  // Confirm arrival — optimistic: update UI instantly, then persist to DB in background
  const confirmArrival = useCallback(async (id, responseNotes) => {
    const arrival = arrivals.find(a => a.id === id)
    // Optimistic UI update — card shows confirmed immediately
    setArrivals((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'confirmed' } : a)))
    // All DB operations run in background — never block the UI
    ;(async () => {
      try {
        await supabase.from('arrivals').update({ status: 'confirmed' }).eq('id', id)
        if (arrival?.service_request_id) {
          const srUpdate = { status: 'confirmed' }
          if (responseNotes) srUpdate.fbo_response_notes = responseNotes
          supabase.from('service_requests').update(srUpdate).eq('id', arrival.service_request_id).catch(() => {})
          notifyPilot(arrival.service_request_id, 'Request Confirmed',
            `Your request at {icao} has been confirmed${responseNotes ? ': ' + responseNotes : ''}`, 'request_confirmed')
        }
      } catch (e) {
        console.warn('[FBO] confirmArrival background failed:', e.message)
      }
    })()
  }, [arrivals, notifyPilot])

  // Decline arrival — optimistic: remove from UI instantly
  const declineArrival = useCallback(async (id, responseNotes) => {
    const arrival = arrivals.find(a => a.id === id)
    setArrivals((prev) => prev.filter((a) => a.id !== id))
    ;(async () => {
      try {
        await supabase.from('arrivals').update({ status: 'declined' }).eq('id', id)
        if (arrival?.service_request_id) {
          const srUpdate = { status: 'declined' }
          if (responseNotes) srUpdate.fbo_response_notes = responseNotes
          supabase.from('service_requests').update(srUpdate).eq('id', arrival.service_request_id).catch(() => {})
          notifyPilot(arrival.service_request_id, 'Request Declined',
            `Your request at {icao} was declined${responseNotes ? ': ' + responseNotes : ''}`, 'request_declined')
        }
      } catch (e) {
        console.warn('[FBO] declineArrival background failed:', e.message)
      }
    })()
  }, [arrivals, notifyPilot])

  // Cancel arrival — optimistic: remove from UI instantly
  const cancelArrival = useCallback(async (id) => {
    const arrival = arrivals.find(a => a.id === id)
    setArrivals((prev) => prev.filter((a) => a.id !== id))
    ;(async () => {
      try {
        await supabase.from('arrivals').update({ status: 'cancelled' }).eq('id', id)
        if (arrival?.service_request_id) {
          supabase.from('service_requests').update({ status: 'cancelled' }).eq('id', arrival.service_request_id).catch(() => {})
          notifyPilot(arrival.service_request_id, 'Arrival Cancelled',
            'Your arrival at {icao} has been cancelled by the FBO', 'request_declined')
        }
      } catch (e) {
        console.warn('[FBO] cancelArrival background failed:', e.message)
      }
    })()
  }, [arrivals, notifyPilot])

  // Edit arrival — optimistic: update UI instantly, reset to pending so FBO must re-confirm
  const editArrival = useCallback(async (id, updates) => {
    const arrival = arrivals.find(a => a.id === id)
    const now = new Date().toISOString()
    // Optimistic UI — merge edits + reset status to pending
    setArrivals(prev => prev.map(a => a.id === id ? { ...a, ...updates, status: 'pending', edited_at: now, edited_by: 'fbo' } : a))
    // All DB operations in background — never block the UI
    ;(async () => {
      try {
        await supabase.from('arrivals').update({
          ...updates, status: 'pending', edited_at: now, edited_by: 'fbo',
        }).eq('id', id)
        if (arrival?.service_request_id) {
          supabase.from('service_requests').update({
            ...updates, status: 'pending', edited_at: now, edited_by: 'fbo',
          }).eq('id', arrival.service_request_id).catch(() => {})
          notifyPilot(arrival.service_request_id, 'Request Updated by FBO',
            `The FBO at {icao} has edited your request details`, 'info')
        }
      } catch (e) {
        console.warn('[FBO] editArrival background failed:', e.message)
      }
    })()
  }, [arrivals, notifyPilot])

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

  // --- Messages ---
  const [messages, setMessages] = useState([])

  const fetchMessages = useCallback(async (movementId, movementType) => {
    if (!user) return []
    const col = movementType === 'arrival' ? 'arrival_id' : 'departure_id'
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq(col, movementId)
      .order('created_at', { ascending: true })
    if (!error && data) return data
    return []
  }, [user])

  const sendMessage = useCallback(async ({ movementId, movementType, senderRole, senderName, body }) => {
    if (!user) return
    const payload = {
      fbo_id: user.id,
      sender_role: senderRole,
      sender_name: senderName,
      body,
    }
    if (movementType === 'arrival') {
      payload.arrival_id = movementId
      // Include request_id and pilot_id so pilot-side queries & Realtime work
      const arrival = arrivals.find(a => a.id === movementId)
      if (arrival?.service_request_id) {
        payload.request_id = arrival.service_request_id
        // Get pilot_id from arrival or look it up from the service_request
        if (arrival.pilot_id) {
          payload.pilot_id = arrival.pilot_id
        } else {
          const { data: sr } = await supabase.from('service_requests').select('pilot_id').eq('id', arrival.service_request_id).maybeSingle()
          if (sr?.pilot_id) payload.pilot_id = sr.pilot_id
        }
      }
    } else {
      payload.departure_id = movementId
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select()
      .single()
    if (!error && data) return data
    return null
  }, [user, arrivals])

  // Real-time subscription for messages
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('fbo-messages-rt')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `fbo_id=eq.${user.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
          // Toast for messages from pilots (not from this FBO's own staff)
          if (initialLoadDone.current && payload.new.sender_role === 'pilot') {
            showToast({
              title: 'New Pilot Message',
              body: payload.new.body?.slice(0, 80) || 'You have a new message',
              type: 'message',
              key: `fbo-msg-${payload.new.id}`,
            })
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, showToast])

  // Notifications state + initial fetch are handled above (before polling effect)

  // Real-time: notifications for this FBO user
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('fbo-notifs-rt')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
          if (initialLoadDone.current) {
            const n = payload.new
            showToast({
              title: n.title || 'New Notification',
              body: n.body,
              type: n.type || 'info',
              key: `fbo-notif-${n.id}`,
            })
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, showToast])

  const markNotificationRead = useCallback(async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [user])

  const unreadNotifications = notifications.filter((n) => !n.read).length

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
        cancelArrival,
        editArrival,
        departures,
        loadingDepartures,
        markFueled,
        markDeparted,
        undoDeparted,
        fuelPrices,
        updateFuelPrice,
        messages,
        fetchMessages,
        sendMessage,
        notifications,
        unreadNotifications,
        markNotificationRead,
        markAllNotificationsRead,
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

// Safe version that returns null outside FBOProvider (for Navbar which renders on all routes)
export function useFBOSafe() {
  return useContext(FBOContext)
}
