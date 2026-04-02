import { useFBO } from '../context/FBOContext'
import ServiceChip from '../components/ServiceChip'

function NextArrival({ arrival }) {
  return (
    <div className="space-y-3">
      <div className="bg-surface-800 rounded-xl ring-1 ring-sky/30 p-5">
        <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-1 text-center">
          Next Inbound
        </p>
        <p className="font-mono text-[42px] font-bold text-text-primary tracking-[0.15em] text-center leading-none">
          {arrival.tail_number}
        </p>
        <div className="mt-4 flex justify-center">
          <div className="inline-flex items-center gap-2 bg-caution-muted rounded-lg px-4 py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-caution">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="font-mono text-xl font-bold text-caution">ETA {arrival.eta}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DataCell label="Aircraft" value={arrival.aircraft_type || '—'} />
        <DataCell label="Passengers" value={arrival.pax_count || 0} />
      </div>

      {arrival.services && arrival.services.length > 0 && (
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-4">
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-2.5">Services</p>
          <div className="flex flex-wrap gap-2">
            {arrival.services.map((s) => (
              <ServiceChip key={s} service={s} size="lg" />
            ))}
          </div>
        </div>
      )}

      {arrival.pilot_notes && (
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-4">
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-1.5">Pilot Notes</p>
          <p className="text-[15px] text-text-primary leading-relaxed">{arrival.pilot_notes}</p>
        </div>
      )}
    </div>
  )
}

function DataCell({ label, value }) {
  return (
    <div className="bg-surface-800 rounded-xl ring-1 ring-border p-3.5 text-center">
      <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-1">{label}</p>
      <p className="text-base font-semibold text-text-primary">{value}</p>
    </div>
  )
}

function QueueRow({ arrival }) {
  const isConfirmed = arrival.status === 'confirmed'
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[14px] font-bold text-text-primary tracking-wide">
          {arrival.tail_number}
        </span>
        <span className="font-mono text-[12px] text-caution">{arrival.eta}</span>
        {isConfirmed && (
          <span className="text-[10px] font-semibold text-good bg-good-muted px-1.5 py-0.5 rounded">Confirmed</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {arrival.services && arrival.services.map((s) => (
          <ServiceChip key={s} service={s} />
        ))}
      </div>
    </div>
  )
}

export default function LineCrew() {
  const { arrivals, loadingArrivals } = useFBO()
  const sorted = [...arrivals].sort((a, b) => (a.eta || '').localeCompare(b.eta || ''))
  const next = sorted[0]
  const queue = sorted.slice(1)

  if (loadingArrivals) {
    return (
      <div className="p-4 max-w-lg mx-auto mt-12">
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-10 text-center">
          <div className="w-6 h-6 border-2 border-sky border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-text-tertiary text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!next) {
    return (
      <div className="p-4 max-w-lg mx-auto mt-12">
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-10 text-center">
          <p className="text-text-tertiary">No arrivals</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-24 space-y-3">
      <NextArrival arrival={next} />
      {queue.length > 0 && (
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-4">
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest font-semibold mb-2">Upcoming</p>
          {queue.map((a) => (
            <QueueRow key={a.id} arrival={a} />
          ))}
        </div>
      )}
    </div>
  )
}
