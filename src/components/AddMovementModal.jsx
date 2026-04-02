import { useState } from 'react'
import { useFBO } from '../context/FBOContext'
import { RAMP_FEE_SCHEDULE } from '../data/seed'

const FUEL_TYPES = ['Jet-A', 'Avgas']
const FUEL_METHODS = ['over-wing', 'single-point']
const SERVICES = [
  'Ramp parking',
  'Hangar storage',
  'Hangar overnight',
  'GPU power',
  'De-icing',
  'Crew car',
  'Passenger lounge',
  'Catering coordination',
  'Lavatory service',
]

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 bg-surface-900 border border-surface-500 focus:border-sky rounded-lg px-2.5 text-[13px] text-text-primary focus:outline-none appearance-none cursor-pointer"
      >
        <option value="" className="bg-surface-900">{placeholder || `Select ${label.toLowerCase()}`}</option>
        {options.map((opt) => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value} className="bg-surface-900">
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function TextField({ label, value, onChange, placeholder, type = 'text', ...props }) {
  return (
    <div>
      <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 bg-surface-900 border border-surface-500 focus:border-sky rounded-lg px-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
        {...props}
      />
    </div>
  )
}

export default function AddMovementModal({ onClose }) {
  const { addMovement } = useFBO()
  const [direction, setDirection] = useState('inbound')
  const [tailNumber, setTailNumber] = useState('')
  const [aircraftType, setAircraftType] = useState('')
  const [rampFeeCategory, setRampFeeCategory] = useState('')
  const [timeStr, setTimeStr] = useState('')
  const [paxCount, setPaxCount] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [fuelGallons, setFuelGallons] = useState('')
  const [fuelMethod, setFuelMethod] = useState('')
  const [selectedServices, setSelectedServices] = useState([])
  const [pilotNotes, setPilotNotes] = useState('')
  const [pilotName, setPilotName] = useState('')
  const [pilotPhone, setPilotPhone] = useState('')

  const toggleService = (s) => {
    setSelectedServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  const canSubmit = tailNumber.trim() && aircraftType.trim() && timeStr

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return

    const [h, m] = timeStr.split(':').map(Number)
    const time = new Date()
    time.setHours(h, m, 0, 0)

    const movement = {
      id: crypto.randomUUID(),
      direction,
      tailNumber: tailNumber.toUpperCase().trim(),
      aircraftType: aircraftType.trim(),
      rampFeeCategory: rampFeeCategory || null,
      [direction === 'inbound' ? 'eta' : 'etd']: time,
      paxCount: parseInt(paxCount) || 0,
      fuelRequest: fuelType
        ? { type: fuelType, gallons: parseInt(fuelGallons) || 0, method: fuelMethod || 'over-wing' }
        : null,
      services: selectedServices,
      pilotNotes: pilotNotes.trim() || null,
      pilotContact: pilotName ? { name: pilotName.trim(), phone: pilotPhone.trim() } : null,
      status: 'pending',
      source: 'manual',
    }

    addMovement(movement)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 px-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl bg-surface-800 rounded-xl ring-1 ring-border shadow-2xl max-h-[calc(100vh-8rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface-800 border-b border-border px-5 py-3.5 flex items-center justify-between z-10">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">Add Aircraft</h2>
            <p className="text-[11px] text-text-tertiary mt-0.5">Manual entry — phone call or walk-in</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-700 hover:bg-surface-600 text-text-tertiary hover:text-text-primary border-none cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Direction toggle */}
          <div>
            <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Direction</label>
            <div className="flex gap-2">
              {['inbound', 'outbound'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(d)}
                  className={`flex-1 h-9 rounded-lg text-[13px] font-medium border-none cursor-pointer flex items-center justify-center gap-2 ${
                    direction === d
                      ? d === 'inbound'
                        ? 'bg-good-muted text-good ring-1 ring-good/30'
                        : 'bg-sky-muted text-sky ring-1 ring-sky/30'
                      : 'bg-surface-700 text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {d === 'inbound' ? (
                      <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>
                    ) : (
                      <><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></>
                    )}
                  </svg>
                  {d === 'inbound' ? 'Inbound' : 'Outbound'}
                </button>
              ))}
            </div>
          </div>

          {/* Aircraft info row */}
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Tail Number *"
              value={tailNumber}
              onChange={setTailNumber}
              placeholder="N482KW"
              style={{ textTransform: 'uppercase' }}
            />
            <TextField
              label="Aircraft Type *"
              value={aircraftType}
              onChange={setAircraftType}
              placeholder="Cessna 172"
            />
          </div>

          {/* Time + Pax row */}
          <div className="grid grid-cols-3 gap-3">
            <TextField
              label={direction === 'inbound' ? 'ETA (local) *' : 'ETD (local) *'}
              type="time"
              value={timeStr}
              onChange={setTimeStr}
            />
            <TextField
              label="Passengers"
              type="number"
              value={paxCount}
              onChange={setPaxCount}
              placeholder="0"
              min="0"
            />
            <SelectField
              label="Ramp Fee Class"
              value={rampFeeCategory}
              onChange={setRampFeeCategory}
              options={RAMP_FEE_SCHEDULE.map((t) => ({ value: t.category, label: t.category }))}
              placeholder="Select class"
            />
          </div>

          {/* Fuel request */}
          <div>
            <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Fuel Request</label>
            <div className="grid grid-cols-3 gap-3">
              <SelectField
                label="Type"
                value={fuelType}
                onChange={setFuelType}
                options={FUEL_TYPES}
                placeholder="None"
              />
              <TextField
                label="Gallons"
                type="number"
                value={fuelGallons}
                onChange={setFuelGallons}
                placeholder="0"
                min="0"
              />
              <SelectField
                label="Method"
                value={fuelMethod}
                onChange={setFuelMethod}
                options={FUEL_METHODS.map((m) => ({ value: m, label: m === 'over-wing' ? 'Over-wing' : 'Single-point' }))}
              />
            </div>
          </div>

          {/* Services */}
          <div>
            <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Services</label>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-medium border-none cursor-pointer ${
                    selectedServices.includes(s)
                      ? 'bg-sky-muted text-sky ring-1 ring-sky/30'
                      : 'bg-surface-700 text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Pilot contact */}
          <div>
            <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Pilot Contact</label>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Name" value={pilotName} onChange={setPilotName} placeholder="John Smith" />
              <TextField label="Phone" value={pilotPhone} onChange={setPilotPhone} placeholder="(555) 123-4567" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">Pilot Notes</label>
            <textarea
              value={pilotNotes}
              onChange={(e) => setPilotNotes(e.target.value)}
              placeholder="Special requests, parking preferences, etc."
              rows={3}
              className="w-full bg-surface-900 border border-surface-500 focus:border-sky rounded-lg px-2.5 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none resize-none"
            />
          </div>

          {/* Validation hint */}
          {!canSubmit && (
            <p className="text-[11px] text-caution text-center">
              Fill in Tail Number, Aircraft Type, and {direction === 'inbound' ? 'ETA' : 'ETD'} to enable submit
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 bg-surface-700 hover:bg-surface-600 text-text-secondary text-[13px] font-medium rounded-lg cursor-pointer border-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`h-10 px-6 text-[14px] font-semibold rounded-lg border-none transition-all ${
                canSubmit
                  ? 'bg-sky hover:bg-sky/90 text-white cursor-pointer shadow-[0_0_12px_rgba(74,144,217,0.4)]'
                  : 'bg-surface-600 text-text-tertiary cursor-not-allowed opacity-50'
              }`}
            >
              Add {direction === 'inbound' ? 'Arrival' : 'Departure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
