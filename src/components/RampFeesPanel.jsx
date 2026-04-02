import { useState } from 'react'
import { RAMP_FEE_SCHEDULE } from '../data/seed'

export default function RampFeesPanel() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-surface-800 rounded-lg ring-1 ring-border p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between cursor-pointer bg-transparent border-none text-left"
      >
        <h3 className="text-[13px] font-semibold text-text-primary uppercase tracking-wider">
          Ramp Fee Schedule
        </h3>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Summary — always visible */}
      <p className="text-[11px] text-text-tertiary mt-1 mb-2">
        Min gallons to waive ramp fee by aircraft class
      </p>

      {/* Compact view — just the key tiers */}
      {!expanded && (
        <div className="space-y-1">
          {RAMP_FEE_SCHEDULE.map((tier) => (
            <div key={tier.category} className="flex items-center justify-between py-0.5">
              <span className="text-[11px] text-text-secondary truncate mr-2">{tier.category}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-[11px] text-sky font-semibold">{tier.minGallons}g</span>
                <span className="font-mono text-[11px] text-text-tertiary w-12 text-right">${tier.rampFee}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded — full aircraft list */}
      {expanded && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {RAMP_FEE_SCHEDULE.map((tier) => (
            <div key={tier.category}>
              <div className="flex items-center justify-between py-1 border-b border-border mb-1">
                <span className="text-[12px] font-semibold text-text-primary">{tier.category}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[12px] text-sky font-bold">{tier.minGallons} gal min</span>
                  <span className="font-mono text-[12px] text-caution font-bold">${tier.rampFee}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {tier.aircraft.map((a) => (
                  <span key={a} className="text-[10px] text-text-tertiary">{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
