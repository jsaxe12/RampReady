import { useState } from 'react'
import { useFBO } from '../context/FBOContext'
import { RAMP_FEE_SCHEDULE } from '../data/seed'
import ServiceChip from './ServiceChip'

function formatETA(date) {
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

function getRampFeeInfo(arrival) {
  if (!arrival.rampFeeCategory || !arrival.fuelRequest) return null
  const tier = RAMP_FEE_SCHEDULE.find((t) => t.category === arrival.rampFeeCategory)
  if (!tier) return null
  const meetsMin = arrival.fuelRequest.gallons >= tier.minGallons
  return { meetsMin, minGallons: tier.minGallons, rampFee: tier.rampFee, shortBy: tier.minGallons - arrival.fuelRequest.gallons }
}

function RampFeeTag({ arrival }) {
  const info = getRampFeeInfo(arrival)
  if (!info) return null

  if (info.meetsMin) {
    return (
      <span className="text-[10px] font-semibold text-good bg-good-muted px-1.5 py-0.5 rounded">
        RAMP WAIVED
      </span>
    )
  }

  return (
    <span className="text-[10px] font-semibold text-caution bg-caution-muted px-1.5 py-0.5 rounded" title={`Needs ${info.minGallons} gal to waive $${info.rampFee} ramp fee`}>
      ${info.rampFee} RAMP · need {info.minGallons}g min
    </span>
  )
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function ArrivalCard({ arrival }) {
  const { confirmArrival, declineArrival, sendMessage } = useFBO()
  const isConfirmed = arrival.status === 'confirmed'
  const eta = formatETA(arrival.eta)
  const [replyOpen, setReplyOpen] = useState(false)
  const [trackOpen, setTrackOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const handleSend = () => {
    if (!draft.trim()) return
    sendMessage(arrival.id, draft.trim())
    setDraft('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') setReplyOpen(false)
  }

  const messages = arrival.messages || []

  return (
    <div
      className={`group bg-surface-800 rounded-lg transition-all ${
        isConfirmed
          ? 'ring-1 ring-good/30'
          : 'ring-1 ring-border hover:ring-surface-500'
      }`}
    >
      <div className="flex gap-3 px-4 py-3">
        {/* Status indicator bar */}
        <div
          className={`w-1 self-stretch rounded-full shrink-0 ${
            isConfirmed ? 'bg-good' : 'bg-caution'
          }`}
        />

        <div className="flex-1 min-w-0">
          {/* Top row: flight data */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5 flex-wrap">
              {/* Tail number */}
              <div>
                <p className="font-mono text-[17px] font-bold text-text-primary tracking-wider leading-tight">
                  {arrival.tailNumber}
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">{arrival.aircraftType}</p>
              </div>

              {/* ETA */}
              <div>
                <p className="font-mono text-sm font-semibold text-caution leading-tight">
                  {eta.local}
                </p>
                <p className="font-mono text-[11px] text-text-tertiary mt-0.5">{eta.zulu}</p>
              </div>

              {/* Pax */}
              <div className="text-center">
                <p className="text-sm font-semibold text-text-primary">{arrival.paxCount}</p>
                <p className="text-[11px] text-text-tertiary">pax</p>
              </div>

              {/* Fuel request + ramp fee status */}
              <FuelBadge fuelRequest={arrival.fuelRequest} />
              <RampFeeTag arrival={arrival} />

              {/* Other services */}
              {arrival.services.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {arrival.services.map((s) => (
                    <ServiceChip key={s} service={s} />
                  ))}
                </div>
              )}
            </div>

            {/* Status badge (confirmed) */}
            {isConfirmed && (
              <div className="flex items-center gap-1.5 bg-good-muted text-good px-2.5 py-1 rounded-md text-[12px] font-medium shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Confirmed
              </div>
            )}
          </div>

          {/* Pilot notes */}
          {arrival.pilotNotes && (
            <p className="text-[12px] text-text-secondary leading-relaxed mt-2 pl-0.5 border-l-2 border-surface-500 ml-0.5 pl-3">
              {arrival.pilotNotes}
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

          {/* FlightAware live track panel */}
          {trackOpen && (
            <div className="mt-2 rounded-md overflow-hidden ring-1 ring-border">
              <div className="flex items-center justify-between bg-surface-900 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
                  <span className="text-[10px] text-text-tertiary uppercase tracking-widest font-semibold">
                    Live Track — {arrival.tailNumber}
                  </span>
                </div>
                <a
                  href={`https://flightaware.com/live/flight/${arrival.tailNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-sky hover:text-sky/80 no-underline"
                >
                  Open FlightAware ↗
                </a>
              </div>
              <iframe
                src={`https://flightaware.com/live/flight/${arrival.tailNumber}`}
                width="100%"
                height="300"
                frameBorder="0"
                scrolling="no"
                className="bg-surface-900 block"
              />
            </div>
          )}

          {/* Actions row */}
          {!isConfirmed && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <button
                onClick={() => confirmArrival(arrival.id)}
                className="h-7 px-3 bg-good-muted hover:bg-good/25 text-good text-[12px] font-medium rounded-md cursor-pointer border-none"
              >
                Confirm
              </button>
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
              <button
                onClick={() => setTrackOpen(!trackOpen)}
                className={`h-7 px-3 text-[12px] font-medium rounded-md cursor-pointer border-none flex items-center gap-1.5 ${
                  trackOpen
                    ? 'bg-good/25 text-good'
                    : 'bg-surface-700 hover:bg-surface-600 text-text-secondary'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${trackOpen ? 'bg-good animate-pulse' : 'bg-text-tertiary'}`} />
                Live Track
              </button>
              <button
                onClick={() => declineArrival(arrival.id)}
                className="h-7 px-3 bg-danger-muted hover:bg-danger/25 text-danger text-[12px] font-medium rounded-md cursor-pointer border-none"
              >
                Decline
              </button>
            </div>
          )}

          {/* Reply on confirmed cards too */}
          {isConfirmed && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
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
              <button
                onClick={() => setTrackOpen(!trackOpen)}
                className={`h-7 px-3 text-[12px] font-medium rounded-md cursor-pointer border-none flex items-center gap-1.5 ${
                  trackOpen
                    ? 'bg-good/25 text-good'
                    : 'bg-surface-700 hover:bg-surface-600 text-text-secondary'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${trackOpen ? 'bg-good animate-pulse' : 'bg-text-tertiary'}`} />
                Live Track
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
