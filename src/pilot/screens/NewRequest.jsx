import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePilotPortal } from '../PilotContext'

const SERVICE_OPTIONS = [
  'Fuel (100LL Avgas)', 'Fuel (Jet-A)', 'Ramp parking', 'Hangar overnight',
  'Crew car', 'GPU / Ground power', 'Lav service', 'De-icing', 'Catering', 'Other',
]

const NOTE_SUGGESTIONS = [
  'Quick turn, departure by X:XX',
  'Passengers heading to meeting — keep it smooth',
  'First time here',
  'Overnight stay',
]

export default function NewRequest() {
  const navigate = useNavigate()
  const location = useLocation()
  const { pilotProfile } = useAuth()
  const { primaryAircraft, searchFBOs, searchFBOsByAirport, submitRequest } = usePilotPortal()

  const prefill = location.state || {}
  const [step, setStep] = useState(prefill.fbo ? 3 : 1)

  // Step 1: Airport
  const [airportQuery, setAirportQuery] = useState(prefill.airportIcao || '')
  const [airportResults, setAirportResults] = useState([])
  const [selectedAirport, setSelectedAirport] = useState(prefill.airportIcao || '')

  // Step 2: FBO
  const [fbos, setFbos] = useState(prefill.fbo ? [prefill.fbo] : [])
  const [selectedFBO, setSelectedFBO] = useState(prefill.fbo || null)

  // Step 3: Flight details
  const [tailNumber, setTailNumber] = useState(primaryAircraft?.tail_number || '')
  const [aircraftType, setAircraftType] = useState(primaryAircraft?.make_model || '')
  const [eta, setEta] = useState(() => {
    const d = new Date(Date.now() + 7200000)
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  })
  const [paxCount, setPaxCount] = useState(0)

  // Step 4: Services
  const [services, setServices] = useState([])
  const [fuelQuantity, setFuelQuantity] = useState(prefill.prefillFuel || '')
  const [otherService, setOtherService] = useState('')

  // Step 5: Notes
  const [notes, setNotes] = useState('')

  // Step 6: Review + submit
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Search airports
  useEffect(() => {
    if (airportQuery.length >= 2 && !selectedAirport) {
      searchFBOs(airportQuery).then(data => {
        const airports = {}
        data.forEach(f => { airports[f.airport_icao] = { icao: f.airport_icao, name: f.airport_name } })
        setAirportResults(Object.values(airports))
      })
    } else { setAirportResults([]) }
  }, [airportQuery, selectedAirport, searchFBOs])

  // Load FBOs when airport selected
  useEffect(() => {
    if (selectedAirport && !prefill.fbo) {
      searchFBOsByAirport(selectedAirport).then(setFbos)
    }
  }, [selectedAirport, searchFBOsByAirport, prefill.fbo])

  const toggleService = (s) => setServices(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const hasFuel = services.some(s => s.startsWith('Fuel'))
  const fboWaiverMin = selectedFBO?.ramp_fee_waiver_gallons || 0
  const isWaived = fboWaiverMin > 0 && parseInt(fuelQuantity) >= fboWaiverMin

  const handleSubmit = async () => {
    setSubmitting(true)
    const fuelType = services.includes('Fuel (Jet-A)') ? 'Jet-A' : services.includes('Fuel (100LL Avgas)') ? 'Avgas' : null
    const result = await submitRequest({
      fboId: selectedFBO.id,
      airportIcao: selectedAirport,
      tailNumber, aircraftType, eta,
      paxCount, services, fuelType,
      fuelQuantity: parseInt(fuelQuantity) || null,
      pilotNotes: notes,
    })
    setSubmitting(false)
    if (result) {
      setSuccess(true)
      setTimeout(() => navigate(`/pilot/request/${result.id}`), 1500)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 px-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-pulse" style={{ background: '#1D9E7520' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-[16px] font-semibold" style={{ color: '#E8EDF7' }}>Request Sent!</p>
        <p className="text-[13px] mt-1" style={{ color: '#4A566E' }}>Redirecting to tracking...</p>
      </div>
    )
  }

  const stepTitles = ['Destination', 'Select FBO', 'Flight Details', 'Services', 'Notes', 'Review']

  return (
    <div className="px-4 pt-5">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="bg-transparent border-none cursor-pointer" style={{ color: '#4A566E' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <p className="text-[13px] font-semibold" style={{ color: '#E8EDF7' }}>Step {step}: {stepTitles[step - 1]}</p>
        <span className="text-[12px] font-mono" style={{ color: '#4A566E' }}>{step}/6</span>
      </div>
      <div className="flex gap-1 mb-5">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i <= step ? '#4EADFF' : '#1a2540' }} />
        ))}
      </div>

      {/* Step 1: Airport */}
      {step === 1 && (
        <div>
          <input type="text" value={airportQuery} onChange={e => { setAirportQuery(e.target.value); setSelectedAirport('') }}
            placeholder="Search airport or ICAO code..." autoFocus
            className="w-full h-11 rounded-xl px-4 text-[14px] font-mono uppercase border-none outline-none mb-3"
            style={{ background: '#0E1525', color: '#E8EDF7', caretColor: '#4EADFF' }} />
          {airportResults.map(a => (
            <button key={a.icao} onClick={() => { setSelectedAirport(a.icao); setAirportQuery(a.icao); setStep(2) }}
              className="w-full rounded-xl px-4 py-3 mb-2 border-none cursor-pointer text-left"
              style={{ background: '#0E1525' }}>
              <span className="text-[14px] font-bold font-mono" style={{ color: '#4EADFF' }}>{a.icao}</span>
              {a.name && <span className="text-[12px] ml-2" style={{ color: '#8899b0' }}>{a.name}</span>}
            </button>
          ))}
          {selectedAirport && (
            <div className="rounded-xl p-4 mb-3" style={{ background: '#4EADFF10', border: '1px solid #4EADFF30' }}>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: '#4A566E' }}>Selected</p>
              <p className="text-[20px] font-bold font-mono" style={{ color: '#4EADFF' }}>{selectedAirport}</p>
              <button onClick={() => setStep(2)} className="mt-2 h-9 px-4 rounded-lg border-none cursor-pointer text-[12px] font-semibold" style={{ background: '#4EADFF', color: '#0A0F1E' }}>
                Continue →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: FBO */}
      {step === 2 && (
        <div>
          {fbos.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ background: '#0E1525' }}>
              <p style={{ color: '#4A566E' }}>No FBOs found at {selectedAirport}</p>
            </div>
          ) : fbos.map(fbo => (
            <button key={fbo.id} onClick={() => { setSelectedFBO(fbo); setStep(3) }}
              className="w-full rounded-xl p-4 mb-2 border-none cursor-pointer text-left"
              style={{ background: '#0E1525', border: selectedFBO?.id === fbo.id ? '1px solid #4EADFF' : '1px solid transparent' }}>
              <p className="text-[14px] font-bold" style={{ color: '#E8EDF7' }}>{fbo.fbo_name}</p>
              <div className="flex gap-3 mt-1">
                {fbo.avgas_price > 0 && <span className="text-[12px] font-mono" style={{ color: '#1D9E75' }}>100LL ${Number(fbo.avgas_price).toFixed(2)}</span>}
                {fbo.jeta_price > 0 && <span className="text-[12px] font-mono" style={{ color: '#4EADFF' }}>Jet-A ${Number(fbo.jeta_price).toFixed(2)}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 3: Flight details */}
      {step === 3 && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Tail Number</label>
            <input type="text" value={tailNumber} onChange={e => setTailNumber(e.target.value.toUpperCase())}
              className="w-full h-10 rounded-lg px-3 text-[13px] font-mono uppercase border-none outline-none"
              style={{ background: '#0E1525', color: '#E8EDF7' }} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Aircraft Type</label>
            <input type="text" value={aircraftType} onChange={e => setAircraftType(e.target.value)}
              className="w-full h-10 rounded-lg px-3 text-[13px] border-none outline-none"
              style={{ background: '#0E1525', color: '#E8EDF7' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>ETA (local)</label>
              <input type="time" value={eta} onChange={e => setEta(e.target.value)}
                className="w-full h-10 rounded-lg px-3 text-[13px] border-none outline-none"
                style={{ background: '#0E1525', color: '#E8EDF7' }} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Passengers</label>
              <div className="flex items-center h-10 rounded-lg" style={{ background: '#0E1525' }}>
                <button onClick={() => setPaxCount(Math.max(0, paxCount - 1))} className="w-10 h-full border-none cursor-pointer text-[16px]" style={{ background: 'transparent', color: '#4EADFF' }}>−</button>
                <span className="flex-1 text-center text-[14px] font-mono" style={{ color: '#E8EDF7' }}>{paxCount}</span>
                <button onClick={() => setPaxCount(Math.min(20, paxCount + 1))} className="w-10 h-full border-none cursor-pointer text-[16px]" style={{ background: 'transparent', color: '#4EADFF' }}>+</button>
              </div>
            </div>
          </div>
          <button onClick={() => setStep(4)} className="w-full h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold mt-2" style={{ background: '#4EADFF', color: '#0A0F1E' }}>
            Continue →
          </button>
        </div>
      )}

      {/* Step 4: Services */}
      {step === 4 && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {SERVICE_OPTIONS.map(s => (
              <button key={s} onClick={() => toggleService(s)}
                className="h-8 px-3 rounded-lg text-[11px] font-medium border-none cursor-pointer"
                style={{ background: services.includes(s) ? '#4EADFF20' : '#0E1525', color: services.includes(s) ? '#4EADFF' : '#4A566E', border: services.includes(s) ? '1px solid #4EADFF40' : '1px solid transparent' }}>
                {s}
              </button>
            ))}
          </div>
          {services.includes('Other') && (
            <input type="text" value={otherService} onChange={e => setOtherService(e.target.value)} placeholder="Describe other service..."
              className="w-full h-10 rounded-lg px-3 text-[13px] border-none outline-none mb-3"
              style={{ background: '#0E1525', color: '#E8EDF7' }} />
          )}
          {hasFuel && (
            <div className="mb-3">
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Estimated Gallons</label>
              <input type="number" value={fuelQuantity} onChange={e => setFuelQuantity(e.target.value)} placeholder="Enter gallons"
                className="w-full h-10 rounded-lg px-3 text-[13px] font-mono border-none outline-none"
                style={{ background: '#0E1525', color: '#E8EDF7' }} />
              {fboWaiverMin > 0 && fuelQuantity && (
                <div className="mt-2 rounded-lg px-3 py-2" style={{ background: isWaived ? '#1D9E7510' : '#FCD34D10', border: `1px solid ${isWaived ? '#1D9E7530' : '#FCD34D30'}` }}>
                  <p className="text-[11px] font-medium" style={{ color: isWaived ? '#1D9E75' : '#FCD34D' }}>
                    {isWaived ? 'Ramp fee will be waived' : `Need ${fboWaiverMin - parseInt(fuelQuantity)} more gallons to waive ramp fee`}
                  </p>
                </div>
              )}
            </div>
          )}
          <button onClick={() => setStep(5)} className="w-full h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold" style={{ background: '#4EADFF', color: '#0A0F1E' }}>
            Continue →
          </button>
        </div>
      )}

      {/* Step 5: Notes */}
      {step === 5 && (
        <div>
          <textarea value={notes} onChange={e => setNotes(e.target.value.slice(0, 500))} placeholder="Notes for the ramp crew..."
            rows={4} className="w-full rounded-lg p-3 text-[13px] border-none outline-none resize-none mb-1"
            style={{ background: '#0E1525', color: '#E8EDF7', caretColor: '#4EADFF' }} />
          <p className="text-[10px] text-right mb-3" style={{ color: '#4A566E' }}>{notes.length}/500</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {NOTE_SUGGESTIONS.map(s => (
              <button key={s} onClick={() => setNotes(s)} className="text-[10px] px-2 py-1 rounded-full border-none cursor-pointer"
                style={{ background: '#0E1525', color: '#4A566E' }}>{s}</button>
            ))}
          </div>
          <button onClick={() => setStep(6)} className="w-full h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold" style={{ background: '#4EADFF', color: '#0A0F1E' }}>
            Review Request →
          </button>
        </div>
      )}

      {/* Step 6: Review */}
      {step === 6 && (
        <div>
          <div className="rounded-xl p-4 mb-4" style={{ background: '#0E1525' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[20px] font-bold font-mono" style={{ color: '#4EADFF' }}>{selectedAirport}</span>
              <span className="text-[12px]" style={{ color: '#8899b0' }}>{selectedFBO?.fbo_name}</span>
            </div>
            <div className="space-y-2 text-[12px]" style={{ color: '#8899b0' }}>
              <div className="flex justify-between"><span>Tail Number</span><span className="font-mono font-semibold" style={{ color: '#E8EDF7' }}>{tailNumber}</span></div>
              <div className="flex justify-between"><span>Aircraft</span><span style={{ color: '#E8EDF7' }}>{aircraftType}</span></div>
              <div className="flex justify-between"><span>ETA</span><span className="font-mono font-semibold" style={{ color: '#E8EDF7' }}>{eta}</span></div>
              <div className="flex justify-between"><span>Passengers</span><span style={{ color: '#E8EDF7' }}>{paxCount}</span></div>
              {fuelQuantity && <div className="flex justify-between"><span>Fuel</span><span className="font-mono" style={{ color: '#E8EDF7' }}>{fuelQuantity} gal</span></div>}
            </div>
            {services.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {services.map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#4EADFF15', color: '#4EADFF' }}>{s}</span>)}
              </div>
            )}
            {hasFuel && fboWaiverMin > 0 && (
              <div className="mt-3 rounded-lg px-3 py-1.5" style={{ background: isWaived ? '#1D9E7510' : '#FCD34D10' }}>
                <span className="text-[11px] font-semibold" style={{ color: isWaived ? '#1D9E75' : '#FCD34D' }}>
                  Ramp fee: {isWaived ? 'WAIVED' : 'NOT WAIVED'}
                </span>
              </div>
            )}
            {notes && (
              <p className="text-[12px] mt-3 pt-3" style={{ color: '#8899b0', borderTop: '1px solid #1a2540' }}>"{notes}"</p>
            )}
          </div>

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full h-12 rounded-lg border-none cursor-pointer text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: '#4EADFF', color: '#0A0F1E' }}>
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Sending...</>
            ) : (
              <>Send Request →</>
            )}
          </button>
          <p className="text-[11px] text-center mt-3" style={{ color: '#4A566E' }}>
            Your request goes to {selectedFBO?.fbo_name} immediately. You'll be notified when they respond.
          </p>
        </div>
      )}
    </div>
  )
}
