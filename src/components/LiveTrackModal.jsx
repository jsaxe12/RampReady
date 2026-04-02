import { useState, useEffect, useCallback } from 'react'

// Simulated flight data generator — mimics FlightAware AeroAPI response
function generateFlightData(arrival) {
  const now = new Date()
  const etaParts = (arrival.eta || '14:00').split(':')
  const etaDate = new Date()
  etaDate.setHours(parseInt(etaParts[0]), parseInt(etaParts[1]), 0)

  const minutesOut = Math.max(0, (etaDate - now) / 60000)
  const totalFlightMin = 120 // assume 2hr flight

  // Progress 0-1 based on time to ETA
  const progress = Math.min(1, Math.max(0.05, 1 - minutesOut / totalFlightMin))

  // Simulate realistic descent profile
  const cruiseAlt = 28000 + Math.floor(Math.random() * 10000)
  let altitude, phase
  if (progress < 0.6) {
    altitude = cruiseAlt
    phase = 'En Route'
  } else if (progress < 0.85) {
    const descentProgress = (progress - 0.6) / 0.25
    altitude = Math.round(cruiseAlt * (1 - descentProgress * 0.7))
    phase = 'Descending'
  } else {
    const approachProgress = (progress - 0.85) / 0.15
    altitude = Math.round(cruiseAlt * 0.3 * (1 - approachProgress * 0.9))
    phase = altitude < 3000 ? 'On Approach' : 'Descending'
  }

  // Groundspeed decreases on approach
  let groundspeed
  if (progress < 0.7) {
    groundspeed = 380 + Math.floor(Math.random() * 60)
  } else if (progress < 0.9) {
    groundspeed = 250 + Math.floor(Math.random() * 50)
  } else {
    groundspeed = 140 + Math.floor(Math.random() * 40)
  }

  // Distance based on progress
  const maxDist = 300 + Math.floor(Math.random() * 200)
  const distance = Math.max(1, Math.round(maxDist * (1 - progress)))

  // Heading — roughly toward destination
  const heading = 180 + Math.floor(Math.random() * 90) - 45

  // Vertical rate during descent
  let verticalRate = 0
  if (phase === 'Descending') verticalRate = -(1200 + Math.floor(Math.random() * 800))
  if (phase === 'On Approach') verticalRate = -(600 + Math.floor(Math.random() * 400))

  // Origin airport
  const origins = ['KTEB', 'KLAS', 'KDEN', 'KJFK', 'KLAX', 'KORD', 'KATL', 'KMIA', 'KSFO', 'KDAL']
  const origin = origins[Math.abs(arrival.tail_number.charCodeAt(1)) % origins.length]

  return {
    tailNumber: arrival.tail_number,
    aircraftType: arrival.aircraft_type,
    origin,
    destination: 'KSDL', // hardcoded for demo
    altitude: Math.round(altitude),
    groundspeed,
    heading,
    distance,
    verticalRate,
    phase,
    progress,
    eta: arrival.eta,
    minutesOut: Math.round(minutesOut),
    lastUpdated: now,
  }
}

export default function LiveTrackModal({ arrival, onClose }) {
  const [flight, setFlight] = useState(() => generateFlightData(arrival))
  const [updating, setUpdating] = useState(false)

  // Simulate live updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdating(true)
      setTimeout(() => {
        setFlight(generateFlightData(arrival))
        setUpdating(false)
      }, 300)
    }, 5000)
    return () => clearInterval(interval)
  }, [arrival])

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
              <span className={`w-2 h-2 rounded-full ${flight.phase === 'On Approach' ? 'bg-caution animate-pulse' : 'bg-good animate-pulse'}`} />
              <span className="font-mono text-[16px] font-bold text-text-primary tracking-wide">{flight.tailNumber}</span>
            </div>
            <span className="text-[11px] text-text-tertiary">{flight.aircraftType}</span>
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
              'bg-sky/15 text-sky'
            }`}>
              {flight.phase}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${updating ? 'bg-sky animate-pulse' : 'bg-good'}`} />
              <span className="text-[10px] text-text-tertiary">
                {updating ? 'Updating...' : `Updated ${new Date(flight.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`}
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
          <span className="text-[10px] text-text-tertiary">Powered by FlightAware AeroAPI</span>
          <span className="text-[10px] text-text-tertiary">Refreshing every 5s</span>
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
