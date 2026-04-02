import { useState } from 'react'
import { useFBO } from '../context/FBOContext'
import ServiceChip from './ServiceChip'

export default function ArrivalCard({ arrival }) {
  const { confirmArrival, declineArrival } = useFBO()
  const isConfirmed = arrival.status === 'confirmed'
  const [confirming, setConfirming] = useState(false)
  const [declining, setDeclining] = useState(false)

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
                  {arrival.tail_number}
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">{arrival.aircraft_type}</p>
              </div>

              {/* ETA */}
              <div>
                <p className="font-mono text-sm font-semibold text-caution leading-tight">
                  {arrival.eta}
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">ETA local</p>
              </div>

              {/* Pax */}
              <div className="text-center">
                <p className="text-sm font-semibold text-text-primary">{arrival.pax_count}</p>
                <p className="text-[11px] text-text-tertiary">pax</p>
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
              <div className="flex items-center gap-1.5 bg-good-muted text-good px-2.5 py-1 rounded-md text-[12px] font-medium shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Confirmed
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
          {!isConfirmed && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
