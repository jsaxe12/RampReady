import { useState, useEffect } from 'react'
import { useADSB } from '../hooks/useADSB'

// Simulated flight data fallback — used when OpenSky has no data
function generateFlightData(arrival) {
  const now = new Date()
  const etaParts = (arrival.eta || '14:00').split(':')
  const etaDate = new Date()
  etaDate.setHours(parseInt(etaParts[0]), parseInt(etaParts[1]), 0)

  const minutesOut = Math.max(0, (etaDate - now) / 60000)
  const totalFlightMin = 120
  const progress = Math.min(1, Math.max(0.05, 1 - minutesOut / totalFlightMin))

  const cruiseAlt = 28000 + Math.floor(Math.random() * 10000)
  let altitude, phase
  if (progress < 0.6) {
    altitude = cruiseAlt; phase = 'En Route'
  } else if (progress < 0.85) {
    altitude = Math.round(cruiseAlt * (1 - ((progress - 0.6) / 0.25) * 0.7)); phase = 'Descending'
  } else {
    altitude = Math.round(cruiseAlt * 0.3 * (1 - ((progress - 0.85) / 0.15) * 0.9))
    phase = altitude < 3000 ? 'On Approach' : 'Descending'
  }

  let groundspeed
  if (progress < 0.7) groundspeed = 380 + Math.floor(Math.random() * 60)
  else if (progress < 0.9) groundspeed = 250 + Math.floor(Math.random() * 50)
  else groundspeed = 140 + Math.floor(Math.random() * 40)

  const maxDist = 300 + Math.floor(Math.random() * 200)
  const distance = Math.max(1, Math.round(maxDist * (1 - progress)))
  const heading = 180 + Math.floor(Math.random() * 90) - 45

  let verticalRate = 0
  if (phase === 'Descending') verticalRate = -(1200 + Math.floor(Math.random() * 800))
  if (phase === 'On Approach') verticalRate = -(600 + Math.floor(Math.random() * 400))

  const origins = ['KTEB', 'KLAS', 'KDEN', 'KJFK', 'KLAX', 'KORD', 'KATL', 'KMIA', 'KSFO', 'KDAL']
  const origin = origins[Math.abs(arrival.tail_number.charCodeAt(1)) % origins.length]

  return {
    tailNumber: arrival.tail_number, aircraftType: arrival.aircraft_type,
    origin, destination: 'KSDL', altitude: Math.round(altitude), groundspeed,
    heading, distance, verticalRate, phase, progress,
    eta: arrival.eta, minutesOut: Math.round(minutesOut),
    lastUpdated: now, isLive: false,
  }
}

function flightFromADSB(adsb, arrival) {
  const alt = adsb.altitude || 0
  let phase = 'En Route'
  if (adsb.onGround) phase = 'On Ground'
  else if (alt < 3000) phase = 'On Approach'
  else if (adsb.verticalRate != null && adsb.verticalRate < -300) phase = 'Descending'

  const dist = adsb.distanceNm || 0
  const maxDist = 500
  const progress = Math.min(1, Math.max(0.05, 1 - dist / maxDist))
  const minutesOut = adsb.groundspeed > 0 ? Math.round((dist / adsb.groundspeed) * 60) : 0

  return {
    tailNumber: adsb.tailNumber, aircraftType: arrival.aircraft_type,
    origin: '????', destination: 'KSDL',
    altitude: alt, groundspeed: adsb.groundspeed || 0,
    heading: adsb.heading || 0, distance: dist,
    verticalRate: adsb.verticalRate || 0, phase, progress,
    eta: adsb.etaCalculated || arrival.eta, minutesOut,
    lastUpdated: adsb.timestamp || new Date(), isLive: true,
  }
}

export default function LiveTrackModal({ arrival, onClose }) {
  const { adsb } = useADSB(arrival.tail_number)
  const [simFlight, setSimFlight] = useState(() => generateFlightData(arrival))

  // Refresh sim data every 5s as fallback
  useEffect(() => {
    if (adsb) return
    const interval = setInterval(() => setSimFlight(generateFlightData(arrival)), 5000)
    return () => clearInterval(interval)
  }, [arrival, adsb])

  const flight = adsb ? flightFromADSB(adsb, arrival) : simFlight

  const formatAlt = (alt) => {
    if (alt >= 18000) return `FL${Math.round(alt / 100)}`
    return `${alt.toLocaleString()} ft`
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-surface-900 rounded-xl ring-1 ring-border w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${flight.isLive ? 'bg-good animate-pulse' : flight.phase === 'On Approach' ? 'bg-caution animate-pulse' : 'bg-good animate-pulse'}`} />
              <span className="font-mono text-[16px] font-bold text-text-primary tracking-wide">{flight.tailNumber}</span>
            </div>
            <span className="text-[11px] text-text-tertiary">{flight.aircraftType}</span>
            {flight.isLive && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-good/15 text-good">Live ADS-B</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-700 text-text-tertiary hover:text-text-primary cursor-pointer border-none bg-transparent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Flight route */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="font-mono text-[18px] font-bold text-text-primary">{flight.origin}</p>
              <p className="text-[10px] text-text-tertiary">Origin</p>
            </div>
            <div className="flex-1 mx-4 relative">
              <div className="h-0.5 bg-surface-600 rounded-full" />
              <div
                className="absolute top-0 left-0 h-0.5 bg-sky rounded-full transition-all duration-1000"
                style={{ width: `${flight.progress * 100}%` }}
              />
              <div
                className="absolute -top-2 transition-all duration-1000"
                style={{ left: `${flight.progress * 100}%`, transform: 'translateX(-50%)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-sky rotate-90">
                  <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="font-mono text-[18px] font-bold text-text-primary">{flight.destination}</p>
              <p className="text-[10px] text-text-tertiary">Destination</p>
            </div>
          </div>
        </div>

        {/* Phase badge */}
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
              flight.phase === 'En Route' ? 'bg-good/15 text-good' :
              flight.phase === 'On Approach' ? 'bg-caution/15 text-caution' :
              flight.phase === 'On Ground' ? 'bg-surface-600 text-text-tertiary' :
              'bg-sky/15 text-sky'
            }`}>
              {flight.phase}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${flight.isLive ? 'bg-good' : 'bg-sky animate-pulse'}`} />
              <span className="text-[10px] text-text-tertiary">
                {flight.isLive ? 'OpenSky ADS-B' : 'Simulated'} · {new Date(flight.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Data grid */}
        <div className="grid grid-cols-2 gap-2 p-4">
          <DataCell label="Distance" value={`${flight.distance} NM`} highlight />
          <DataCell label="ETA" value={flight.eta} highlight />
          <DataCell label="Altitude" value={formatAlt(flight.altitude)} />
          <DataCell label="Groundspeed" value={`${flight.groundspeed} kt`} />
          <DataCell label="Heading" value={`${flight.heading}°`} />
          <DataCell label="Vert Rate" value={flight.verticalRate === 0 ? 'Level' : `${flight.verticalRate} fpm`} />
        </div>

        {/* Minutes out callout */}
        <div className="px-4 pb-4">
          <div className="bg-surface-800 rounded-lg ring-1 ring-border p-3 text-center">
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-0.5">Estimated Time to Arrival</p>
            <p className="font-mono text-[28px] font-bold text-caution leading-none">
              {flight.minutesOut > 0 ? `${flight.minutesOut} min` : 'Arriving'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border bg-surface-800/50 flex items-center justify-between">
          <span className="text-[10px] text-text-tertiary">
            {flight.isLive ? 'Powered by OpenSky Network' : 'Powered by FlightAware AeroAPI'}
          </span>
          <span className="text-[10px] text-text-tertiary">Refreshing every 60s</span>
        </div>
      </div>
    </div>
  )
}

function DataCell({ label, value, highlight }) {
  return (
    <div className="bg-surface-800 rounded-lg ring-1 ring-border p-2.5 text-center">
      <p className="text-[9px] text-text-tertiary uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`font-mono text-[14px] font-semibold leading-tight ${highlight ? 'text-sky' : 'text-text-primary'}`}>{value}</p>
    </div>
  )
}
