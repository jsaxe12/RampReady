import { useState, useEffect, useRef, useCallback } from 'react'
import { usePilot } from '../context/PilotContext'
import { useAuth } from '../context/AuthContext'
import ServiceChip from '../components/ServiceChip'
import LiveTrackModal from '../components/LiveTrackModal'

const SERVICES = [
  'Jet-A', 'Avgas', 'Ramp parking', 'Hangar storage', 'Hangar overnight',
  'GPU power', 'De-icing', 'Crew car', 'Passenger lounge', 'Catering coordination', 'Lavatory service',
]

/* ── Status Badge ── */
function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-caution/15 text-caution',
    confirmed: 'bg-good/15 text-good',
    declined: 'bg-danger/15 text-danger',
  }
  const labels = { pending: 'Pending', confirmed: 'Confirmed', declined: 'Declined' }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${styles[status] || 'bg-surface-600 text-text-tertiary'}`}>
      {labels[status] || status}
    </span>
  )
}

/* ── Role Badge (for chat) ── */
function RoleBadge({ role }) {
  const styles = {
    csr: 'bg-sky/15 text-sky',
    line: 'bg-caution/15 text-caution',
    pilot: 'bg-good/15 text-good',
  }
  const labels = { csr: 'CSR', line: 'Line', pilot: 'Pilot' }
  return (
    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${styles[role] || 'bg-surface-600 text-text-tertiary'}`}>
      {labels[role] || role}
    </span>
  )
}

/* ── Chat Panel (pilot-side) ── */
function ChatPanel({ arrivalId }) {
  const { fetchMessages, sendMessage, messages: realtimeMessages } = usePilot()
  const { pilotProfile } = useAuth()
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const senderName = pilotProfile?.display_name || 'Pilot'

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchMessages(arrivalId).then((data) => {
      if (active) { setMsgs(data); setLoading(false) }
    })
    return () => { active = false }
  }, [arrivalId, fetchMessages])

  useEffect(() => {
    if (realtimeMessages.length === 0) return
    const latest = realtimeMessages[realtimeMessages.length - 1]
    if (latest.arrival_id === arrivalId) {
      setMsgs((prev) => {
        if (prev.some((m) => m.id === latest.id)) return prev
        return [...prev, latest]
      })
    }
  }, [realtimeMessages, arrivalId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [msgs])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const msg = await sendMessage({ arrivalId, body: text.trim() })
    if (msg) {
      setMsgs((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    }
    setText('')
    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <div className="mt-2 pt-2 border-t border-border">
      <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold mb-1.5">Messages</p>
      <div ref={scrollRef} className="max-h-[150px] overflow-y-auto space-y-1.5 mb-2 scrollbar-thin">
        {loading ? (
          <p className="text-[11px] text-text-tertiary text-center py-1">Loading...</p>
        ) : msgs.length === 0 ? (
          <p className="text-[11px] text-text-tertiary text-center py-1">No messages yet</p>
        ) : (
          msgs.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.sender_role === 'pilot' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1 mb-0.5">
                <RoleBadge role={m.sender_role} />
                {m.sender_name && <span className="text-[10px] text-text-tertiary">{m.sender_name}</span>}
              </div>
              <div className={`max-w-[80%] px-2.5 py-1 rounded-lg text-[12px] leading-relaxed ${
                m.sender_role === 'pilot' ? 'bg-good/15 text-text-primary rounded-br-sm' : 'bg-surface-700 text-text-primary rounded-bl-sm'
              }`}>{m.body}</div>
              <span className="text-[9px] text-text-tertiary mt-0.5">
                {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Message FBO..."
          className="flex-1 h-7 px-2 bg-surface-700 rounded-md text-[12px] text-text-primary placeholder:text-text-tertiary border-none outline-none focus:ring-1 focus:ring-sky/40"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="h-7 px-2.5 bg-sky hover:bg-sky/90 text-white text-[11px] font-semibold rounded-md cursor-pointer border-none disabled:opacity-40 shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  )
}

/* ── Flight Card (pilot's arrival) ── */
function FlightCard({ arrival }) {
  const [expanded, setExpanded] = useState(false)
  const [trackOpen, setTrackOpen] = useState(false)

  const ringColor = arrival.status === 'confirmed' ? 'ring-good/30' : arrival.status === 'declined' ? 'ring-danger/30' : 'ring-border'
  const barColor = arrival.status === 'confirmed' ? 'bg-good' : arrival.status === 'declined' ? 'bg-danger' : 'bg-caution'

  return (
    <div className={`bg-surface-800 rounded-lg ring-1 ${expanded ? 'ring-sky/40' : ringColor} transition-all`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer bg-transparent border-none text-left"
      >
        <div className={`w-1 self-stretch rounded-full shrink-0 ${barColor}`} />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[14px] sm:text-[15px] font-bold text-text-primary tracking-wide">{arrival.tail_number}</span>
          <span className="text-[11px] text-text-tertiary">{arrival.aircraft_type}</span>
        </div>
        <span className="font-mono text-[12px] font-semibold text-caution">{arrival.eta}</span>
        <StatusBadge status={arrival.status} />
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-text-tertiary shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center gap-3 text-[12px] flex-wrap">
            <span className="text-text-tertiary">ETA: <span className="font-mono font-semibold text-text-primary">{arrival.eta}</span></span>
            <span className="text-text-tertiary">Pax: <span className="font-semibold text-text-primary">{arrival.pax_count || 0}</span></span>
          </div>

          {arrival.services && arrival.services.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {arrival.services.map((s) => <ServiceChip key={s} service={s} />)}
            </div>
          )}

          {arrival.pilot_notes && (
            <p className="text-[12px] text-text-secondary leading-relaxed border-l-2 border-surface-500 pl-2.5">
              {arrival.pilot_notes}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTrackOpen(true)}
              className="h-7 px-2.5 text-[12px] font-medium rounded-md cursor-pointer border-none flex items-center gap-1 bg-sky/15 hover:bg-sky/25 text-sky"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              Live Track
            </button>
          </div>

          <ChatPanel arrivalId={arrival.id} />
        </div>
      )}

      {trackOpen && <LiveTrackModal arrival={arrival} onClose={() => setTrackOpen(false)} />}
    </div>
  )
}

/* ── FBO Result Card ── */
function FBOCard({ fbo, onSelect }) {
  return (
    <button
      onClick={() => onSelect(fbo)}
      className="w-full bg-surface-800 rounded-lg ring-1 ring-border hover:ring-sky/40 px-3 sm:px-4 py-3 text-left cursor-pointer border-none transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-text-primary leading-tight">{fbo.fbo_name}</p>
          <p className="font-mono text-[13px] font-bold text-sky mt-0.5">{fbo.airport_icao}</p>
        </div>
        <div className="text-right shrink-0">
          {fbo.jet_a_price && (
            <p className="text-[12px]">
              <span className="text-text-tertiary">Jet-A </span>
              <span className="font-mono font-semibold text-sky">${fbo.jet_a_price}</span>
            </p>
          )}
          {fbo.avgas_price && (
            <p className="text-[12px]">
              <span className="text-text-tertiary">Avgas </span>
              <span className="font-mono font-semibold text-good">${fbo.avgas_price}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[11px] text-sky font-medium">Request Arrival</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </div>
    </button>
  )
}

/* ── Arrival Request Modal ── */
function ArrivalRequestModal({ fbo, onClose, onSubmit }) {
  const [tailNumber, setTailNumber] = useState('')
  const [aircraftType, setAircraftType] = useState('')
  const [eta, setEta] = useState('')
  const [paxCount, setPaxCount] = useState('')
  const [selectedServices, setSelectedServices] = useState([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggleService = (s) => {
    setSelectedServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tailNumber || !aircraftType || !eta) return
    setSubmitting(true)
    const result = await onSubmit({
      fboId: fbo.id,
      tailNumber: tailNumber.toUpperCase(),
      aircraftType,
      eta,
      paxCount: parseInt(paxCount) || 0,
      services: selectedServices,
      pilotNotes: notes,
    })
    setSubmitting(false)
    if (result) onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-12 sm:pt-16 px-3">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-800 rounded-xl ring-1 ring-border shadow-2xl max-h-[calc(100vh-6rem)] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-800 border-b border-border px-4 sm:px-5 py-3 flex items-center justify-between z-10">
          <div>
            <h2 className="text-[15px] font-bold text-text-primary">Request Arrival</h2>
            <p className="text-[12px] text-text-tertiary mt-0.5">
              {fbo.fbo_name} — <span className="font-mono text-sky">{fbo.airport_icao}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-700 hover:bg-surface-600 text-text-tertiary cursor-pointer border-none"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">Tail Number *</label>
              <input
                type="text"
                value={tailNumber}
                onChange={(e) => setTailNumber(e.target.value)}
                placeholder="N12345"
                required
                className="w-full h-9 bg-surface-900 border border-surface-500 focus:border-sky rounded-lg px-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">Aircraft Type *</label>
              <input
                type="text"
                value={aircraftType}
                onChange={(e) => setAircraftType(e.target.value)}
                placeholder="Cessna 172"
                required
                className="w-full h-9 bg-surface-900 border border-surface-500 focus:border-sky rounded-lg px-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">ETA (local) *</label>
              <input
                type="time"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                required
                className="w-full h-9 bg-surface-900 border border-surface-500 focus:border-sky rounded-lg px-2.5 text-[13px] text-text-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">Passengers</label>
              <input
                type="number"
                min="0"
                value={paxCount}
                onChange={(e) => setPaxCount(e.target.value)}
                placeholder="0"
                className="w-full h-9 bg-surface-900 border border-surface-500 focus:border-sky rounded-lg px-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>
          </div>

          {/* Services */}
          <div>
            <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">Requested Services</label>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-medium cursor-pointer border-none transition-all ${
                    selectedServices.includes(s)
                      ? 'bg-sky-muted text-sky ring-1 ring-sky/30'
                      : 'bg-surface-700 text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">Notes for FBO</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or instructions..."
              rows={3}
              className="w-full bg-surface-900 border border-surface-500 focus:border-sky rounded-lg px-2.5 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 bg-surface-700 hover:bg-surface-600 text-text-secondary text-[13px] font-medium rounded-lg cursor-pointer border-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!tailNumber || !aircraftType || !eta || submitting}
              className="flex-1 h-10 bg-sky hover:bg-sky/90 text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Main Pilot Portal ── */
export default function PilotPortal() {
  const {
    myArrivals, pendingArrivals, confirmedArrivals, declinedArrivals, loadingArrivals,
    fboResults, searchingFBOs, searchFBOs, browseAllFBOs, submitArrivalRequest,
  } = usePilot()
  const { pilotProfile } = useAuth()

  const [tab, setTab] = useState('flights')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFBO, setSelectedFBO] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback((q) => {
    setSearchQuery(q)
    if (q.length >= 2) {
      searchFBOs(q)
      setHasSearched(true)
    } else if (q.length === 0) {
      setHasSearched(false)
    }
  }, [searchFBOs])

  const handleBrowseAll = () => {
    browseAllFBOs()
    setHasSearched(true)
  }

  const handleSubmitRequest = async (data) => {
    const result = await submitArrivalRequest(data)
    if (result) {
      setSelectedFBO(null)
      setTab('flights')
    }
    return result
  }

  const sortedArrivals = [...myArrivals].sort((a, b) => {
    const order = { pending: 0, confirmed: 1, declined: 2 }
    return (order[a.status] ?? 3) - (order[b.status] ?? 3)
  })

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-5 py-3 sm:py-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[18px] sm:text-[22px] font-bold text-text-primary">
            {pilotProfile?.display_name ? `Welcome, ${pilotProfile.display_name}` : 'Pilot Portal'}
          </h1>
          <p className="text-[12px] text-text-tertiary mt-0.5">Search FBOs, request services, track your flights</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden sm:block">
            <p className="font-mono text-[20px] font-bold text-text-primary">{myArrivals.length}</p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Flights</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="font-mono text-[20px] font-bold text-caution">{pendingArrivals.length}</p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Pending</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="font-mono text-[20px] font-bold text-good">{confirmedArrivals.length}</p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Confirmed</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-surface-800 rounded-lg ring-1 ring-border p-0.5 mb-4">
        <button
          onClick={() => setTab('flights')}
          className={`flex-1 h-9 text-[12px] font-semibold rounded-md cursor-pointer border-none transition-all flex items-center justify-center gap-1.5 ${
            tab === 'flights' ? 'bg-sky text-white' : 'bg-transparent text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
          <span className="hidden sm:inline">My Flights</span>
          <span className="sm:hidden">Flights</span>
          {myArrivals.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === 'flights' ? 'bg-white/20' : 'bg-surface-600'}`}>
              {myArrivals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('search')}
          className={`flex-1 h-9 text-[12px] font-semibold rounded-md cursor-pointer border-none transition-all flex items-center justify-center gap-1.5 ${
            tab === 'search' ? 'bg-sky text-white' : 'bg-transparent text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="hidden sm:inline">Find FBO</span>
          <span className="sm:hidden">Search</span>
        </button>
      </div>

      {/* ── My Flights Tab ── */}
      {tab === 'flights' && (
        <>
          {loadingArrivals ? (
            <div className="bg-surface-800 rounded-lg ring-1 ring-border p-10 text-center">
              <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-text-tertiary text-sm">Loading flights...</p>
            </div>
          ) : sortedArrivals.length === 0 ? (
            <div className="bg-surface-800 rounded-lg ring-1 ring-border p-8 sm:p-10 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary mx-auto mb-3 opacity-40">
                <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
              </svg>
              <p className="text-text-secondary text-sm font-medium mb-1">No flights yet</p>
              <p className="text-text-tertiary text-[12px] mb-4">Search for an FBO to send your first arrival request</p>
              <button
                onClick={() => setTab('search')}
                className="h-9 px-4 bg-sky hover:bg-sky/90 text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none inline-flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Find an FBO
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Status summary on mobile */}
              <div className="flex items-center gap-3 mb-2 sm:hidden">
                <span className="text-[11px] text-text-tertiary">
                  <span className="font-semibold text-caution">{pendingArrivals.length}</span> pending
                </span>
                <span className="text-[11px] text-text-tertiary">
                  <span className="font-semibold text-good">{confirmedArrivals.length}</span> confirmed
                </span>
                {declinedArrivals.length > 0 && (
                  <span className="text-[11px] text-text-tertiary">
                    <span className="font-semibold text-danger">{declinedArrivals.length}</span> declined
                  </span>
                )}
              </div>
              {sortedArrivals.map((arrival) => (
                <FlightCard key={arrival.id} arrival={arrival} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Search FBO Tab ── */}
      {tab === 'search' && (
        <>
          {/* Search input */}
          <div className="bg-surface-800 rounded-lg ring-1 ring-border p-3 sm:p-4 mb-3">
            <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">Search by Airport ICAO Code</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="KJFK, KLAX, KORD..."
                  className="w-full h-10 bg-surface-900 border border-surface-500 focus:border-sky rounded-lg pl-9 pr-3 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none uppercase font-mono"
                  autoFocus
                />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <button
                onClick={handleBrowseAll}
                className="h-10 px-3 sm:px-4 bg-surface-700 hover:bg-surface-600 text-text-secondary text-[12px] font-medium rounded-lg cursor-pointer border-none shrink-0"
              >
                <span className="hidden sm:inline">Browse All</span>
                <span className="sm:hidden">All</span>
              </button>
            </div>
          </div>

          {/* Results */}
          {searchingFBOs ? (
            <div className="bg-surface-800 rounded-lg ring-1 ring-border p-10 text-center">
              <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-text-tertiary text-sm">Searching...</p>
            </div>
          ) : hasSearched && fboResults.length === 0 ? (
            <div className="bg-surface-800 rounded-lg ring-1 ring-border p-8 text-center">
              <p className="text-text-secondary text-sm font-medium mb-1">No FBOs found</p>
              <p className="text-text-tertiary text-[12px]">Try a different ICAO code or browse all</p>
            </div>
          ) : fboResults.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] text-text-tertiary mb-1">{fboResults.length} FBO{fboResults.length !== 1 ? 's' : ''} found</p>
              {fboResults.map((fbo) => (
                <FBOCard key={fbo.id} fbo={fbo} onSelect={setSelectedFBO} />
              ))}
            </div>
          ) : !hasSearched ? (
            <div className="bg-surface-800 rounded-lg ring-1 ring-border p-8 sm:p-10 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary mx-auto mb-3 opacity-40">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-text-secondary text-sm font-medium mb-1">Find your destination FBO</p>
              <p className="text-text-tertiary text-[12px]">Enter an ICAO code (min 2 characters) to search</p>
            </div>
          ) : null}
        </>
      )}

      {/* Arrival Request Modal */}
      {selectedFBO && (
        <ArrivalRequestModal
          fbo={selectedFBO}
          onClose={() => setSelectedFBO(null)}
          onSubmit={handleSubmitRequest}
        />
      )}
    </div>
  )
}
