import { useState } from 'react'
import { useFBO } from '../context/FBOContext'
import ArrivalCard from '../components/ArrivalCard'
import AddMovementModal from '../components/AddMovementModal'
import FuelPricesPanel from '../components/FuelPricesPanel'

export default function Dashboard() {
  const { arrivals, pendingArrivals, confirmedArrivals, loadingArrivals } = useFBO()
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div className="max-w-[1400px] mx-auto px-5 py-5">
      {/* Header row — stats + add button + date */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="text-[28px] font-bold text-text-primary font-mono">{arrivals.length}</span>
            <span className="text-[11px] text-text-tertiary uppercase tracking-wider">Arrivals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[28px] font-bold text-good font-mono">{confirmedArrivals.length}</span>
            <span className="text-[11px] text-text-tertiary uppercase tracking-wider">Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[28px] font-bold text-caution font-mono">{pendingArrivals.length}</span>
            <span className="text-[11px] text-text-tertiary uppercase tracking-wider">Pending</span>
          </div>
        </div>
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
        {/* Main — arrivals queue */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-good">
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
              Arrivals
            </h2>
            <span className="text-[11px] text-text-tertiary font-mono">{arrivals.length}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {loadingArrivals ? (
            <div className="bg-surface-800 rounded-lg ring-1 ring-border p-12 text-center">
              <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-text-tertiary text-sm">Loading arrivals...</p>
            </div>
          ) : arrivals.length === 0 ? (
            <div className="bg-surface-800 rounded-lg ring-1 ring-border p-12 text-center">
              <p className="text-text-tertiary text-sm">No arrivals</p>
            </div>
          ) : (
            <div className="space-y-2">
              {arrivals.map((a) => (
                <ArrivalCard key={a.id} arrival={a} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-3">
          <FuelPricesPanel />
        </aside>
      </div>

      {showAddModal && <AddMovementModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
