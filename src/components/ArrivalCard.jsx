import { useState, useEffect, useRef } from 'react'
import { useFBO } from '../context/FBOContext'
import { useAuth } from '../context/AuthContext'
import ServiceChip from './ServiceChip'

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

function ChatInline({ arrivalId }) {
  const { fetchMessages, sendMessage, messages: realtimeMessages } = useFBO()
  const { fboProfile } = useAuth()
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const senderName = fboProfile?.fbo_name || 'CSR'

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchMessages(arrivalId, 'arrival').then((data) => {
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
    const msg = await sendMessage({
      movementId: arrivalId,
      movementType: 'arrival',
      senderRole: 'csr',
      senderName,
      body: text.trim(),
    })
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
      <div ref={scrollRef} className="max-h-[150px] overflow-y-auto space-y-1.5 mb-2">
        {loading ? (
          <p className="text-[11px] text-text-tertiary text-center py-1">Loading...</p>
        ) : msgs.length === 0 ? (
          <p className="text-[11px] text-text-tertiary text-center py-1">No messages</p>
        ) : (
          msgs.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.sender_role === 'csr' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1 mb-0.5">
                <RoleBadge role={m.sender_role} />
                {m.sender_name && <span className="text-[10px] text-text-tertiary">{m.sender_name}</span>}
              </div>
              <div className={`max-w-[80%] px-2.5 py-1 rounded-lg text-[12px] leading-relaxed ${
                m.sender_role === 'csr' ? 'bg-sky/20 text-text-primary rounded-br-sm' : 'bg-surface-700 text-text-primary rounded-bl-sm'
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
          placeholder="Message pilot..."
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

export default function ArrivalCard({ arrival }) {
  const { confirmArrival, declineArrival } = useFBO()
  const isConfirmed = arrival.status === 'confirmed'
  const [confirming, setConfirming] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const handleConfirm = async () => {
    setConfirming(true)
    await confirmArrival(arrival.id)
    setConfirming(false)
  }

  const handleDecline = async () => {
    setDeclining(true)
    await declineArrival(arrival.id)
    setDeclining(false)
  }

  return (
    <div
      className={`group bg-surface-800 rounded-lg transition-all ${
        isConfirmed
          ? 'ring-1 ring-good/30'
          : 'ring-1 ring-border hover:ring-surface-500'
      }`}
    >
      <div className="flex gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3">
        {/* Status indicator bar */}
        <div
          className={`w-1 self-stretch rounded-full shrink-0 ${
            isConfirmed ? 'bg-good' : 'bg-caution'
          }`}
        />

        <div className="flex-1 min-w-0">
          {/* Top row: flight data */}
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-5 flex-wrap">
              {/* Tail + type */}
              <div>
                <p className="font-mono text-[15px] sm:text-[17px] font-bold text-text-primary tracking-wider leading-tight">
                  {arrival.tail_number}
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">{arrival.aircraft_type}</p>
              </div>

              {/* ETA + Pax inline on mobile */}
              <div className="flex items-center gap-2 sm:gap-5">
                <div>
                  <p className="font-mono text-sm font-semibold text-caution leading-tight">
                    {arrival.eta}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-text-tertiary mt-0.5"><span className="hidden sm:inline">ETA local</span><span className="sm:hidden">ETA</span></p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-primary">{arrival.pax_count}</p>
                  <p className="text-[10px] sm:text-[11px] text-text-tertiary">pax</p>
                </div>
              </div>

              {/* Services */}
              {arrival.services && arrival.services.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {arrival.services.map((s) => (
                    <ServiceChip key={s} service={s} />
                  ))}
                </div>
              )}
            </div>

            {/* Status badge */}
            {isConfirmed && (
              <div className="flex items-center gap-1 sm:gap-1.5 bg-good-muted text-good px-1.5 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-[12px] font-medium shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="hidden sm:inline">Confirmed</span>
              </div>
            )}
          </div>

          {/* Pilot notes */}
          {arrival.pilot_notes && (
            <p className="text-[12px] text-text-secondary leading-relaxed mt-2 border-l-2 border-surface-500 pl-3">
              {arrival.pilot_notes}
            </p>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            {!isConfirmed && (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="h-7 px-3 bg-good-muted hover:bg-good/25 text-good text-[12px] font-medium rounded-md cursor-pointer border-none disabled:opacity-50"
                >
                  {confirming ? 'Confirming...' : 'Confirm'}
                </button>
                <button
                  onClick={handleDecline}
                  disabled={declining}
                  className="h-7 px-3 bg-danger-muted hover:bg-danger/25 text-danger text-[12px] font-medium rounded-md cursor-pointer border-none disabled:opacity-50"
                >
                  {declining ? 'Declining...' : 'Decline'}
                </button>
              </>
            )}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`h-7 px-2.5 text-[12px] font-medium rounded-md cursor-pointer border-none flex items-center gap-1 ${
                chatOpen ? 'bg-sky/20 text-sky' : 'bg-surface-700 hover:bg-surface-600 text-text-secondary'
              } ${isConfirmed ? '' : 'ml-auto'}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <span className="hidden sm:inline">Chat</span>
            </button>
          </div>

          {/* Chat panel */}
          {chatOpen && <ChatInline arrivalId={arrival.id} />}
        </div>
      </div>
    </div>
  )
}
