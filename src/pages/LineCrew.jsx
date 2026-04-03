import { useState, useEffect, useRef, useCallback } from 'react'
import { useFBO } from '../context/FBOContext'
import { useAuth } from '../context/AuthContext'
import { useADSB } from '../hooks/useADSB'
import ServiceChip from '../components/ServiceChip'
import LiveTrackModal from '../components/LiveTrackModal'

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

function MessageBubble({ msg, isOwn }) {
  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <RoleBadge role={msg.sender_role} />
        {msg.sender_name && (
          <span className="text-[10px] text-text-tertiary">{msg.sender_name}</span>
        )}
      </div>
      <div className={`max-w-[85%] px-3 py-1.5 rounded-lg text-[13px] leading-relaxed ${
        isOwn
          ? 'bg-sky/20 text-text-primary rounded-br-sm'
          : 'bg-surface-700 text-text-primary rounded-bl-sm'
      }`}>
        {msg.body}
      </div>
      <span className="text-[9px] text-text-tertiary mt-0.5">
        {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </span>
    </div>
  )
}

function ChatPanel({ movementId, movementType, senderRole }) {
  const { fetchMessages, sendMessage, messages: realtimeMessages } = useFBO()
  const { fboProfile } = useAuth()
  const [chatMessages, setChatMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const senderName = senderRole === 'line' ? 'Line Crew' : (fboProfile?.fbo_name || 'CSR')

  // Load messages on mount
  useEffect(() => {
    let active = true
    setLoading(true)
    fetchMessages(movementId, movementType).then((msgs) => {
      if (active) {
        setChatMessages(msgs)
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [movementId, movementType, fetchMessages])

  // Append real-time messages
  useEffect(() => {
    if (realtimeMessages.length === 0) return
    const latest = realtimeMessages[realtimeMessages.length - 1]
    const col = movementType === 'arrival' ? 'arrival_id' : 'departure_id'
    if (latest[col] === movementId) {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === latest.id)) return prev
        return [...prev, latest]
      })
    }
  }, [realtimeMessages, movementId, movementType])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const msg = await sendMessage({
      movementId,
      movementType,
      senderRole,
      senderName,
      body: text.trim(),
    })
    if (msg) {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    }
    setText('')
    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <div className="border-t border-border mt-2 pt-2">
      <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold mb-1.5">Messages</p>
      <div ref={scrollRef} className="max-h-[200px] overflow-y-auto space-y-2 mb-2 scrollbar-thin">
        {loading ? (
          <p className="text-[11px] text-text-tertiary text-center py-2">Loading...</p>
        ) : chatMessages.length === 0 ? (
          <p className="text-[11px] text-text-tertiary text-center py-2">No messages yet</p>
        ) : (
          chatMessages.map((m) => (
            <MessageBubble key={m.id} msg={m} isOwn={m.sender_role === senderRole} />
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
          placeholder="Message pilot..."
          className="flex-1 h-8 px-2.5 bg-surface-700 rounded-md text-[13px] text-text-primary placeholder:text-text-tertiary border-none outline-none focus:ring-1 focus:ring-sky/40"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="h-8 px-3 bg-sky hover:bg-sky/90 text-white text-[11px] font-semibold rounded-md cursor-pointer border-none disabled:opacity-40 shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  )
}

function LineADSB({ tailNumber }) {
  const { adsb } = useADSB(tailNumber)

  // Hide entirely if no data
  if (!adsb || (adsb.onGround && adsb.groundspeed === 0)) return null

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-2 h-2 rounded-full bg-good animate-pulse shrink-0" />
      {adsb.distanceNm != null && (
        <span className="font-mono text-[16px] font-bold text-sky">{adsb.distanceNm} nm out</span>
      )}
      {adsb.groundspeed != null && adsb.groundspeed > 0 && (
        <span className="font-mono text-[13px] text-text-secondary">{adsb.groundspeed} kts</span>
      )}
      {adsb.etaCalculated && (
        <span className="font-mono text-[13px] text-caution ml-auto">Arrives ~{adsb.etaCalculated}</span>
      )}
    </div>
  )
}

function AircraftCard({ aircraft, type, senderRole }) {
  const [expanded, setExpanded] = useState(false)
  const [trackOpen, setTrackOpen] = useState(false)
  const isArrival = type === 'arrival'
  const time = isArrival ? aircraft.eta : aircraft.etd
  const timeLabel = isArrival ? 'ETA' : 'ETD'
  const isConfirmed = aircraft.status === 'confirmed'
  const isFueled = aircraft.status === 'fueled'

  let statusColor = 'bg-caution/15 text-caution'
  let statusLabel = isArrival ? 'Pending' : 'Needs Fuel'
  if (isConfirmed) { statusColor = 'bg-good/15 text-good'; statusLabel = 'Confirmed' }
  if (isFueled) { statusColor = 'bg-good/15 text-good'; statusLabel = 'Ready' }

  return (
    <div className={`bg-surface-800 rounded-lg ring-1 ${expanded ? 'ring-sky/40' : 'ring-border'} transition-all`}>
      {/* Collapsed row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer bg-transparent border-none text-left"
      >
        <div className={`w-1 self-stretch rounded-full shrink-0 ${isConfirmed || isFueled ? 'bg-good' : 'bg-caution'}`} />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-mono text-[14px] font-bold text-text-primary tracking-wide">{aircraft.tail_number}</span>
          <span className="text-[11px] text-text-tertiary">{aircraft.aircraft_type}</span>
        </div>
        <span className="font-mono text-[12px] font-semibold text-caution">{time}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusColor}`}>{statusLabel}</span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-text-tertiary shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center gap-3 text-[12px]">
            <span className="text-text-tertiary">{timeLabel}: <span className="font-mono font-semibold text-text-primary">{time}</span></span>
            <span className="text-text-tertiary">Pax: <span className="font-semibold text-text-primary">{aircraft.pax_count || 0}</span></span>
          </div>

          {aircraft.services && aircraft.services.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {aircraft.services.map((s) => (
                <ServiceChip key={s} service={s} />
              ))}
            </div>
          )}

          {aircraft.pilot_notes && (
            <p className="text-[12px] text-text-secondary leading-relaxed border-l-2 border-surface-500 pl-2.5">
              {aircraft.pilot_notes}
            </p>
          )}

          {isArrival && <LineADSB tailNumber={aircraft.tail_number} />}

          {isArrival && (
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
          )}

          <ChatPanel
            movementId={aircraft.id}
            movementType={type}
            senderRole={senderRole}
          />
        </div>
      )}

      {trackOpen && isArrival && <LiveTrackModal arrival={aircraft} onClose={() => setTrackOpen(false)} />}
    </div>
  )
}

export default function LineCrew() {
  const { arrivals, departures, loadingArrivals, loadingDepartures } = useFBO()
  const [tab, setTab] = useState('arrivals')

  const sortedArrivals = [...arrivals].sort((a, b) => (a.eta || '').localeCompare(b.eta || ''))
  const sortedDepartures = [...departures].sort((a, b) => (a.etd || '').localeCompare(b.etd || ''))

  const loading = tab === 'arrivals' ? loadingArrivals : loadingDepartures
  const list = tab === 'arrivals' ? sortedArrivals : sortedDepartures

  return (
    <div className="max-w-lg mx-auto px-3 py-3 pb-20">
      {/* Tab bar */}
      <div className="flex bg-surface-800 rounded-lg ring-1 ring-border p-0.5 mb-3">
        <button
          onClick={() => setTab('arrivals')}
          className={`flex-1 h-8 text-[12px] font-semibold rounded-md cursor-pointer border-none transition-all ${
            tab === 'arrivals' ? 'bg-sky text-white' : 'bg-transparent text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Arrivals ({sortedArrivals.length})
        </button>
        <button
          onClick={() => setTab('departures')}
          className={`flex-1 h-8 text-[12px] font-semibold rounded-md cursor-pointer border-none transition-all ${
            tab === 'departures' ? 'bg-sky text-white' : 'bg-transparent text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Departures ({sortedDepartures.length})
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-surface-800 rounded-lg ring-1 ring-border p-10 text-center">
          <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-text-tertiary text-sm">Loading...</p>
        </div>
      ) : list.length === 0 ? (
        <div className="bg-surface-800 rounded-lg ring-1 ring-border p-10 text-center">
          <p className="text-text-tertiary text-sm">No {tab}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((item) => (
            <AircraftCard
              key={item.id}
              aircraft={item}
              type={tab === 'arrivals' ? 'arrival' : 'departure'}
              senderRole="line"
            />
          ))}
        </div>
      )}
    </div>
  )
}
