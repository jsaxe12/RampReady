import { useState } from 'react'
import { useFBO } from '../context/FBOContext'
import StatsRow from '../components/StatsRow'
import ArrivalCard from '../components/ArrivalCard'
import DepartureCard from '../components/DepartureCard'
import AddMovementModal from '../components/AddMovementModal'
import FuelPricesPanel from '../components/FuelPricesPanel'
import RampFeesPanel from '../components/RampFeesPanel'
import FBOSettingsPanel from '../components/FBOSettingsPanel'

export default function Dashboard() {
  const { inbound, outbound } = useFBO()
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div className="max-w-[1400px] mx-auto px-5 py-5">
      {/* Header row — stats + add button + date */}
      <div className="flex items-center justify-between mb-5">
        <StatsRow />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="h-8 px-3.5 bg-sky hover:bg-sky/90 text-white text-[12px] font-semibold rounded-lg cursor-pointer border-none flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Aircraft
          </button>
          <div className="text-[11px] text-text-tertiary font-mono">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Main — traffic queue */}
        <div className="space-y-6">
          {/* Inbound */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-good">
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
                Inbound
              </h2>
              <span className="text-[11px] text-text-tertiary font-mono">{inbound.length}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {inbound.length === 0 ? (
              <div className="bg-surface-800 rounded-lg ring-1 ring-border p-12 text-center">
                <p className="text-text-tertiary text-sm">No inbound traffic</p>
              </div>
            ) : (
              <div className="space-y-2">
                {inbound.map((a) => (
                  <ArrivalCard key={a.id} arrival={a} />
                ))}
              </div>
            )}
          </div>

          {/* Outbound */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky">
                  <path d="M12 5v14" />
                  <path d="M19 12l-7 7-7-7" />
                </svg>
                Outbound
              </h2>
              <span className="text-[11px] text-text-tertiary font-mono">{outbound.length}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {outbound.length === 0 ? (
              <div className="bg-surface-800 rounded-lg ring-1 ring-border p-12 text-center">
                <p className="text-text-tertiary text-sm">No outbound traffic</p>
              </div>
            ) : (
              <div className="space-y-2">
                {outbound.map((d) => (
                  <DepartureCard key={d.id} departure={d} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-3">
          <FuelPricesPanel />
          <RampFeesPanel />
          <FBOSettingsPanel />
        </aside>
      </div>

      {showAddModal && <AddMovementModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
