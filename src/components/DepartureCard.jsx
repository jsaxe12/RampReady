import { useState } from 'react'
import { useFBO } from '../context/FBOContext'
import ServiceChip from './ServiceChip'

function formatETD(date) {
  const local = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const zulu = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })
  return { local, zulu: zulu + 'Z' }
}

function FuelBadge({ fuelRequest }) {
  if (!fuelRequest) return null
  const isAvgas = fuelRequest.type === 'Avgas'
  const methodLabel = fuelRequest.method === 'over-wing' ? 'Over-wing' : 'Single-pt'

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
      isAvgas ? 'bg-good-muted text-good' : 'bg-sky-muted text-sky'
    }`}>
      <span>{fuelRequest.type}</span>
      <span className="opacity-40">|</span>
      <span>{fuelRequest.gallons} gal</span>
      <span className="opacity-40">|</span>
      <span>{methodLabel}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    ready: 'bg-good-muted text-good',
    fueled: 'bg-sky-muted text-sky',
    pending: 'bg-caution-muted text-caution',
  }

  const labels = {
    ready: 'Ready',
    fueled: 'Fueled',
    pending: 'Pending',
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium shrink-0 ${styles[status] || styles.pending}`}>
      {status === 'ready' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {labels[status] || status}
    </div>
  )
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function DepartureCard({ departure }) {
  const { markReady, markDeparted, sendMessage } = useFBO()
  const etd = formatETD(departure.etd)
  const isReady = departure.status === 'ready'
  const [replyOpen, setReplyOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const handleSend = () => {
    if (!draft.trim()) return
    sendMessage(departure.id, draft.trim())
    setDraft('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') setReplyOpen(false)
  }

  const messages = departure.messages || []

  const statusBarColor = {
    ready: 'bg-good',
    fueled: 'bg-sky',
    pending: 'bg-caution',
  }

  return (
    <div
      className={`group bg-surface-800 rounded-lg transition-all ${
        isReady
          ? 'ring-1 ring-good/30'
          : 'ring-1 ring-border hover:ring-surface-500'
      }`}
    >
      <div className="flex gap-3 px-4 py-3">
        {/* Status indicator bar */}
        <div
          className={`w-1 self-stretch rounded-full shrink-0 ${statusBarColor[departure.status] || 'bg-caution'}`}
        />

        <div className="flex-1 min-w-0">
          {/* Top row: flight data */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5 flex-wrap">
              {/* Tail number */}
              <div>
                <p className="font-mono text-[17px] font-bold text-text-primary tracking-wider leading-tight">
                  {departure.tailNumber}
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">{departure.aircraftType}</p>
              </div>

              {/* ETD */}
              <div>
                <p className="font-mono text-sm font-semibold text-sky leading-tight">
                  {etd.local}
                </p>
                <p className="font-mono text-[11px] text-text-tertiary mt-0.5">{etd.zulu}</p>
              </div>

              {/* Pax */}
              <div className="text-center">
                <p className="text-sm font-semibold text-text-primary">{departure.paxCount}</p>
                <p className="text-[11px] text-text-tertiary">pax</p>
              </div>

              {/* Fuel request */}
              <FuelBadge fuelRequest={departure.fuelRequest} />

              {/* Other services */}
              {departure.services.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {departure.services.map((s) => (
                    <ServiceChip key={s} service={s} />
                  ))}
                </div>
              )}
            </div>

            {/* Status badge */}
            <StatusBadge status={departure.status} />
          </div>

          {/* Pilot notes */}
          {departure.pilotNotes && (
            <p className="text-[12px] text-text-secondary leading-relaxed mt-2 pl-0.5 border-l-2 border-surface-500 ml-0.5 pl-3">
              {departure.pilotNotes}
            </p>
          )}

          {/* Messages thread */}
          {messages.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {messages.map((msg, i) => (
                <div key={i} className="flex items-start gap-2 bg-sky-muted/50 rounded-md px-3 py-1.5">
                  <span className="text-[10px] text-sky font-semibold uppercase shrink-0 mt-0.5">FBO</span>
                  <p className="text-[12px] text-text-primary leading-relaxed flex-1">{msg.text}</p>
                  <span className="text-[10px] text-text-tertiary font-mono shrink-0 mt-0.5">
                    {formatTime(msg.time)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          {replyOpen && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder="Type a message to pilot..."
                className="flex-1 h-7 bg-surface-900 border border-surface-500 focus:border-sky rounded-md px-2.5 text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
              <button
                onClick={handleSend}
                className="h-7 px-3 bg-sky-muted hover:bg-sky/25 text-sky text-[12px] font-medium rounded-md cursor-pointer border-none"
              >
                Send
              </button>
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            {departure.status === 'pending' && (
              <button
                onClick={() => markReady(departure.id)}
                className="h-7 px-3 bg-sky-muted hover:bg-sky/25 text-sky text-[12px] font-medium rounded-md cursor-pointer border-none"
              >
                Mark Fueled
              </button>
            )}
            {(departure.status === 'fueled' || departure.status === 'ready') && (
              <button
                onClick={() => markDeparted(departure.id)}
                className="h-7 px-3 bg-good-muted hover:bg-good/25 text-good text-[12px] font-medium rounded-md cursor-pointer border-none"
              >
                Departed
              </button>
            )}
            <button
              onClick={() => setReplyOpen(!replyOpen)}
              className={`h-7 px-3 text-[12px] font-medium rounded-md cursor-pointer border-none ${
                replyOpen
                  ? 'bg-sky/25 text-sky'
                  : 'bg-sky-muted hover:bg-sky/25 text-sky'
              }`}
            >
              {messages.length > 0 ? `Reply (${messages.length})` : 'Reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
