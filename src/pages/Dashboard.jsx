import { useState, useCallback } from 'react'
import { useFBO } from '../context/FBOContext'
import ArrivalCard from '../components/ArrivalCard'
import AddMovementModal from '../components/AddMovementModal'
import FuelPricesPanel from '../components/FuelPricesPanel'

function DepartureCard({ departure, onFueled, onDeparted }) {
  const [loading, setLoading] = useState(false)
  const d = departure
  const isFueled = d.status === 'fueled'

  const handleAction = async () => {
    setLoading(true)
    if (isFueled) {
      await onDeparted(d.id, d)
    } else {
      await onFueled(d.id)
    }
    setLoading(false)
  }

  // Find fuel services for display
  const fuelServices = (d.services || []).filter(s => /jet-a|avgas|fuel/i.test(s))
  const otherServices = (d.services || []).filter(s => !/jet-a|avgas|fuel/i.test(s))

  return (
    <div className={`bg-surface-800 rounded-lg ring-1 p-3.5 ${isFueled ? 'ring-good/30' : 'ring-border'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[14px] font-bold text-text-primary">{d.tail_number}</span>
            <span className="text-[12px] text-text-secondary">{d.aircraft_type}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              isFueled ? 'bg-good/20 text-good' : 'bg-caution/20 text-caution'
            }`}>
              {isFueled ? 'Ready' : 'Needs Fuel'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-text-tertiary mb-1.5">
            <span className="font-mono">ETD <span className="text-text-primary font-semibold">{d.etd}</span></span>
            <span><span className="text-text-primary font-semibold">{d.pax_count}</span> pax</span>
          </div>
          {fuelServices.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {fuelServices.map((s, i) => (
                <span key={i} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isFueled ? 'bg-good/15 text-good' : 'bg-caution/15 text-caution'}`}>
                  {isFueled ? `${s} — fueled` : s}
                </span>
              ))}
            </div>
          )}
          {otherServices.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {otherServices.map((s, i) => (
                <span key={i} className="text-[10px] bg-surface-700 text-text-secondary px-1.5 py-0.5 rounded">{s}</span>
              ))}
            </div>
          )}
          {d.pilot_notes && (
            <p className="text-[11px] text-text-tertiary italic truncate">{d.pilot_notes}</p>
          )}
        </div>
        <button
          onClick={handleAction}
          disabled={loading}
          className={`h-7 px-2.5 text-[11px] font-semibold rounded-md cursor-pointer border-none disabled:opacity-50 shrink-0 ${
            isFueled
              ? 'bg-sky/20 hover:bg-sky/30 text-sky'
              : 'bg-good/20 hover:bg-good/30 text-good'
          }`}
        >
          {loading ? '...' : isFueled ? 'Departed' : 'Mark Fueled'}
        </button>
      </div>
    </div>
  )
}

function RecentlyDepartedCard({ departure, onUndo }) {
  const [loading, setLoading] = useState(false)
  const d = departure

  const handleUndo = async () => {
    setLoading(true)
    await onUndo(d.id)
    setLoading(false)
  }

  return (
    <div className="bg-surface-800/50 rounded-lg ring-1 ring-border/50 p-3 opacity-60">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[13px] font-bold text-text-secondary">{d.tail_number}</span>
          <span className="text-[11px] text-text-tertiary">{d.aircraft_type}</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-600 text-text-tertiary">Departed</span>
        </div>
        <button
          onClick={handleUndo}
          disabled={loading}
          className="h-6 px-2 bg-caution/20 hover:bg-caution/30 text-caution text-[10px] font-semibold rounded-md cursor-pointer border-none disabled:opacity-50 shrink-0"
        >
          {loading ? '...' : 'Undo'}
        </button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { arrivals, pendingArrivals, confirmedArrivals, loadingArrivals, departures, loadingDepartures, markFueled, markDeparted, undoDeparted } = useFBO()
  const [showAddModal, setShowAddModal] = useState(false)
  const [recentlyDeparted, setRecentlyDeparted] = useState([])

  const handleDeparted = useCallback(async (id, departure) => {
    await markDeparted(id)
    setRecentlyDeparted((prev) => [{ ...departure, _departedAt: Date.now() }, ...prev])
    // Auto-remove from recently departed after 60 seconds
    setTimeout(() => {
      setRecentlyDeparted((prev) => prev.filter((d) => d.id !== id))
    }, 60000)
  }, [markDeparted])

  const handleUndo = useCallback(async (id) => {
    await undoDeparted(id)
    setRecentlyDeparted((prev) => prev.filter((d) => d.id !== id))
  }, [undoDeparted])

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
          <div className="flex items-center gap-1.5">
            <span className="text-[28px] font-bold text-sky font-mono">{departures.length}</span>
            <span className="text-[11px] text-text-tertiary uppercase tracking-wider">Departures</span>
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

          {/* Departures section */}
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky">
                  <path d="M12 5V19" />
                  <path d="M19 12l-7 7-7-7" />
                </svg>
                Departures
              </h2>
              <span className="text-[11px] text-text-tertiary font-mono">{departures.length}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {loadingDepartures ? (
              <div className="bg-surface-800 rounded-lg ring-1 ring-border p-12 text-center">
                <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-text-tertiary text-sm">Loading departures...</p>
              </div>
            ) : departures.length === 0 ? (
              <div className="bg-surface-800 rounded-lg ring-1 ring-border p-12 text-center">
                <p className="text-text-tertiary text-sm">No departures</p>
              </div>
            ) : (
              <div className="space-y-2">
                {departures.map((d) => (
                  <DepartureCard key={d.id} departure={d} onFueled={markFueled} onDeparted={handleDeparted} />
                ))}
              </div>
            )}

          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-3">
          <FuelPricesPanel />

          {/* Recently departed — undo zone */}
          {recentlyDeparted.length > 0 && (
            <div className="bg-surface-800 rounded-lg ring-1 ring-border p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold">Recently Departed</span>
              </div>
              <div className="space-y-1.5">
                {recentlyDeparted.map((d) => (
                  <RecentlyDepartedCard key={d.id} departure={d} onUndo={handleUndo} />
                ))}
              </div>
              <p className="text-[9px] text-text-tertiary mt-2">Undo available for 60s</p>
            </div>
          )}
        </aside>
      </div>

      {showAddModal && <AddMovementModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
