import { useState, useEffect } from 'react'
import { useFBO } from '../context/FBOContext'
import ServiceChip from '../components/ServiceChip'

function formatETA(date) {
  const local = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const zulu = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
  return { local, zulu: zulu + 'Z' }
}

function useCountdown(target) {
  const [text, setText] = useState('')

  useEffect(() => {
    const tick = () => {
      const diff = target.getTime() - Date.now()
      if (diff <= 0) { setText('NOW'); return }
      const m = Math.floor(diff / 60000)
      const h = Math.floor(m / 60)
      setText(h > 0 ? `${h}h ${m % 60}m` : `${m}m`)
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [target])

  return text
}

function NextArrival({ arrival }) {
  const countdown = useCountdown(arrival.eta)
  const eta = formatETA(arrival.eta)
  const fuel = arrival.fuelRequest
  const isAvgas = fuel?.type === 'Avgas'

  return (
    <div className="space-y-3">
      {/* Primary card — tail + countdown */}
      <div className="bg-surface-800 rounded-xl ring-1 ring-sky/30 p-5">
        <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-1 text-center">
          Next Inbound
        </p>
        <p className="font-mono text-[42px] font-bold text-text-primary tracking-[0.15em] text-center leading-none">
          {arrival.tailNumber}
        </p>

        {/* Countdown */}
        <div className="mt-4 flex justify-center">
          <div className="inline-flex items-center gap-2 bg-caution-muted rounded-lg px-4 py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-caution">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="font-mono text-xl font-bold text-caution">{countdown}</span>
          </div>
        </div>

        {/* ETA local + zulu */}
        <p className="text-center mt-2 font-mono text-[12px] text-text-tertiary">
          ETA {eta.local}L / {eta.zulu}
        </p>
      </div>

      {/* Data grid */}
      <div className="grid grid-cols-2 gap-3">
        <DataCell label="Aircraft" value={arrival.aircraftType} />
        <DataCell label="Passengers" value={arrival.paxCount} />
      </div>

      {/* Fuel request — prominent */}
      {fuel && (
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-4">
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-3">
            Fuel Request
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-text-tertiary uppercase mb-0.5">Type</p>
              <p className={`text-lg font-bold ${isAvgas ? 'text-good' : 'text-sky'}`}>
                {fuel.type}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-tertiary uppercase mb-0.5">Gallons</p>
              <p className="text-lg font-bold text-text-primary font-mono">
                {fuel.gallons}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-tertiary uppercase mb-0.5">Method</p>
              <p className={`text-lg font-bold ${fuel.method === 'over-wing' ? 'text-sky' : 'text-caution'}`}>
                {fuel.method === 'over-wing' ? 'Over-wing' : 'Single-pt'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Other services */}
      {arrival.services.length > 0 && (
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-4">
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-2.5">
            Services
          </p>
          <div className="flex flex-wrap gap-2">
            {arrival.services.map((s) => (
              <ServiceChip key={s} service={s} size="lg" />
            ))}
          </div>
        </div>
      )}

      {/* Pilot notes */}
      {arrival.pilotNotes && (
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-4">
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-1.5">
            Pilot Notes
          </p>
          <p className="text-[15px] text-text-primary leading-relaxed">
            {arrival.pilotNotes}
          </p>
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

function ADSBCard({ arrival }) {
  return (
    <div className="bg-surface-800 rounded-xl ring-1 ring-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
        <p className="text-[11px] text-text-tertiary uppercase tracking-widest font-semibold">
          ADS-B Track
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'TAIL', value: arrival.tailNumber, mono: true },
          { label: 'DIST', value: `${arrival.adsb.distanceNm} NM` },
          { label: 'ALT', value: `${arrival.adsb.altitude.toLocaleString()}'` },
          { label: 'GS', value: `${arrival.adsb.groundspeed} kt` },
        ].map(({ label, value, mono }) => (
          <div key={label} className="text-center">
            <p className="text-[10px] text-text-tertiary mb-0.5">{label}</p>
            <p className={`text-[13px] font-bold text-text-primary ${mono ? 'font-mono' : ''}`}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function QueueRow({ arrival }) {
  const eta = formatETA(arrival.eta)
  const fuel = arrival.fuelRequest
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[14px] font-bold text-text-primary tracking-wide">
          {arrival.tailNumber}
        </span>
        <span className="font-mono text-[12px] text-caution">{eta.local}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {fuel && (
          <span className={`text-[11px] font-semibold px-1.5 py-px rounded ${
            fuel.type === 'Avgas' ? 'bg-good-muted text-good' : 'bg-sky-muted text-sky'
          }`}>
            {fuel.type} {fuel.gallons}g
          </span>
        )}
        {arrival.services.map((s) => (
          <ServiceChip key={s} service={s} />
        ))}
      </div>
    </div>
  )
}

function DepartureRow({ departure }) {
  const etd = departure.etd
  const local = etd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const fuel = departure.fuelRequest
  const statusColors = {
    ready: 'text-good',
    fueled: 'text-sky',
    pending: 'text-caution',
  }
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[14px] font-bold text-text-primary tracking-wide">
          {departure.tailNumber}
        </span>
        <span className="font-mono text-[12px] text-sky">{local}</span>
        <span className={`text-[10px] font-semibold uppercase ${statusColors[departure.status] || 'text-text-tertiary'}`}>
          {departure.status}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {fuel && (
          <span className={`text-[11px] font-semibold px-1.5 py-px rounded ${
            fuel.type === 'Avgas' ? 'bg-good-muted text-good' : 'bg-sky-muted text-sky'
          }`}>
            {fuel.type} {fuel.gallons}g
          </span>
        )}
      </div>
    </div>
  )
}

export default function LineCrew() {
  const { inbound, outbound } = useFBO()
  const sorted = [...inbound].sort((a, b) => a.eta - b.eta)
  const next = sorted[0]
  const queue = sorted.slice(1)

  if (!next && outbound.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto mt-12">
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-10 text-center">
          <p className="text-text-tertiary">No traffic</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-24 space-y-3">
      {next ? (
        <>
          <NextArrival arrival={next} />
          {next.adsb && <ADSBCard arrival={next} />}
        </>
      ) : (
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-10 text-center">
          <p className="text-text-tertiary">No inbound traffic</p>
        </div>
      )}

      {queue.length > 0 && (
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-4">
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest font-semibold mb-2">
            Upcoming Inbound
          </p>
          {queue.map((a) => (
            <QueueRow key={a.id} arrival={a} />
          ))}
        </div>
      )}

      {outbound.length > 0 && (
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-4">
          <p className="text-[11px] text-text-tertiary uppercase tracking-widest font-semibold mb-2">
            Outbound
          </p>
          {outbound.map((d) => (
            <DepartureRow key={d.id} departure={d} />
          ))}
        </div>
      )}
    </div>
  )
}
