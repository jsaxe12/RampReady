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

function StepIndicator({ current, total }) {
  const labels = ['Destination', 'FBO', 'Flight', 'Services', 'Notes', 'Review']
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const num = i + 1
        const done = num < current
        const active = num === current
        return (
          <div key={num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all"
                style={{
                  background: done ? '#1D9E75' : active ? '#4EADFF' : 'transparent',
                  color: done ? '#fff' : active ? '#080D18' : '#4A566E',
                  border: done || active ? 'none' : '1.5px solid #2a3550',
                }}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                ) : num}
              </div>
              <span className="text-[9px] mt-1 hidden sm:block" style={{ color: active ? '#4EADFF' : '#4A566E' }}>{labels[i]}</span>
            </div>
            {num < total && <div className="w-6 lg:w-10 h-px mx-1" style={{ background: done ? '#1D9E75' : '#2a3550' }} />}
          </div>
        )
      })}
    </div>
  )
}

export default function NewRequest() {
  const navigate = useNavigate()
  const location = useLocation()
  const { pilotProfile } = useAuth()
  const { primaryAircraft, searchFBOs, searchFBOsByAirport, submitRequest } = usePilotPortal()

  const prefill = location.state || {}
  const [step, setStep] = useState(prefill.fbo ? 3 : 1)

  const [airportQuery, setAirportQuery] = useState(prefill.airportIcao || '')
  const [airportResults, setAirportResults] = useState([])
  const [selectedAirport, setSelectedAirport] = useState(prefill.airportIcao || '')
  const [fbos, setFbos] = useState(prefill.fbo ? [prefill.fbo] : [])
  const [selectedFBO, setSelectedFBO] = useState(prefill.fbo || null)
  const [tailNumber, setTailNumber] = useState(primaryAircraft?.tail_number || '')
  const [aircraftType, setAircraftType] = useState(primaryAircraft?.make_model || '')
  const [etaDate, setEtaDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })
  const [etaTime, setEtaTime] = useState(() => {
    const d = new Date(Date.now() + 7200000)
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  })
  const eta = `${etaDate} ${etaTime}`
  const [paxCount, setPaxCount] = useState(0)
  const [services, setServices] = useState([])
  const [fuelQuantity, setFuelQuantity] = useState(prefill.prefillFuel || '')
  const [otherService, setOtherService] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (airportQuery.length >= 2 && !selectedAirport) {
      searchFBOs(airportQuery).then(data => {
        const airports = {}
        data.forEach(f => { airports[f.airport_icao] = { icao: f.airport_icao, name: f.airport_name } })
        setAirportResults(Object.values(airports))
      })
    } else { setAirportResults([]) }
  }, [airportQuery, selectedAirport, searchFBOs])

  useEffect(() => {
    if (selectedAirport && !prefill.fbo) searchFBOsByAirport(selectedAirport).then(setFbos)
  }, [selectedAirport, searchFBOsByAirport, prefill.fbo])

  const toggleService = (s) => setServices(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const hasFuel = services.some(s => s.startsWith('Fuel'))
  const fboWaiverMin = selectedFBO?.ramp_fee_waiver_gallons || 0
  const isWaived = fboWaiverMin > 0 && parseInt(fuelQuantity) >= fboWaiverMin

  const handleSubmit = async () => {
    setSubmitting(true)
    const fuelType = services.includes('Fuel (Jet-A)') ? 'Jet-A' : services.includes('Fuel (100LL Avgas)') ? 'Avgas' : null
    const result = await submitRequest({
      fboId: selectedFBO.id, airportIcao: selectedAirport, tailNumber, aircraftType, eta,
      paxCount, services, fuelType, fuelQuantity: parseInt(fuelQuantity) || null, pilotNotes: notes,
    })
    setSubmitting(false)
    if (result) { setSuccess(true); setTimeout(() => navigate(`/pilot/request/${result.id}`), 1500) }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center pt-32">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(29,158,117,0.15)', border: '2px solid #1D9E75' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-[20px] font-semibold" style={{ color: '#E8EDF7' }}>Request Sent!</p>
        <p className="text-[14px] mt-1" style={{ color: '#4A566E' }}>Redirecting to tracking...</p>
      </div>
    )
  }

  const inputStyle = { background: '#0E1525', color: '#E8EDF7', fontFamily: "'DM Sans', sans-serif" }

  return (
    <div className="max-w-[640px] mx-auto">
      {/* Step indicator */}
      <StepIndicator current={step} total={6} />

      {/* Step 1: Airport */}
      {step === 1 && (
        <div>
          <h2 className="text-[32px] mb-6" style={{ color: '#E8EDF7', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>Where are you headed?</h2>
          <input type="text" value={airportQuery} onChange={e => { setAirportQuery(e.target.value); setSelectedAirport('') }}
            placeholder="Search airport or ICAO..." autoFocus
            className="w-full h-14 rounded-xl px-5 text-[16px] uppercase border-none outline-none mb-4"
            style={{ ...inputStyle, fontFamily: "'DM Mono', monospace", caretColor: '#4EADFF' }} />
          {airportResults.map(a => (
            <button key={a.icao} onClick={() => { setSelectedAirport(a.icao); setAirportQuery(a.icao); setStep(2) }}
              className="w-full rounded-xl px-5 py-4 mb-2 border-none cursor-pointer text-left"
              style={{ background: '#0E1525' }}>
              <span className="text-[16px] font-medium" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>{a.icao}</span>
              {a.name && <span className="text-[13px] ml-3" style={{ color: '#8B9AB0' }}>{a.name}</span>}
            </button>
          ))}
          {selectedAirport && (
            <div className="rounded-xl p-5 mt-2" style={{ background: 'rgba(78,173,255,0.05)', borderLeft: '3px solid #4EADFF' }}>
              <p className="text-[11px] uppercase tracking-[0.1em] mb-1" style={{ color: '#4EADFF' }}>Selected</p>
              <p className="text-[28px] font-medium" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>{selectedAirport}</p>
              <button onClick={() => setStep(2)} className="mt-3 w-full h-12 rounded-lg border-none cursor-pointer text-[14px] font-semibold" style={{ background: '#4EADFF', color: '#080D18' }}>
                Continue →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: FBO */}
      {step === 2 && (
        <div>
          <h2 className="text-[32px] mb-6" style={{ color: '#E8EDF7', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>Select an FBO</h2>
          {fbos.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: '#0E1525' }}>
              <p style={{ color: '#4A566E' }}>No FBOs found at {selectedAirport}</p>
            </div>
          ) : fbos.map(fbo => (
            <button key={fbo.id} onClick={() => { setSelectedFBO(fbo); setStep(3) }}
              className="w-full rounded-xl p-5 mb-3 border-none cursor-pointer text-left transition-all"
              style={{ background: '#0E1525', borderLeft: selectedFBO?.id === fbo.id ? '3px solid #4EADFF' : '3px solid transparent' }}>
              <p className="text-[15px] font-semibold" style={{ color: '#E8EDF7' }}>{fbo.fbo_name}</p>
              <div className="flex gap-4 mt-2">
                {fbo.avgas_price > 0 && <span className="text-[14px] font-medium" style={{ color: '#4ADE80', fontFamily: "'DM Mono', monospace" }}>100LL ${Number(fbo.avgas_price).toFixed(2)}</span>}
                {fbo.jeta_price > 0 && <span className="text-[14px] font-medium" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>Jet-A ${Number(fbo.jeta_price).toFixed(2)}</span>}
              </div>
            </button>
          ))}
          <button onClick={() => setStep(1)} className="w-full h-10 mt-2 bg-transparent border-none cursor-pointer text-[13px]" style={{ color: '#4A566E' }}>
            ← Change airport
          </button>
        </div>
      )}

      {/* Step 3: Flight details */}
      {step === 3 && (
        <div>
          <h2 className="text-[32px] mb-6" style={{ color: '#E8EDF7', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>Flight Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: '#4A566E' }}>Tail Number</label>
              <input type="text" value={tailNumber} onChange={e => setTailNumber(e.target.value.toUpperCase())}
                className="w-full h-12 rounded-lg px-4 text-[14px] uppercase border-none outline-none"
                style={{ ...inputStyle, fontFamily: "'DM Mono', monospace" }} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: '#4A566E' }}>Aircraft Type</label>
              <input type="text" value={aircraftType} onChange={e => setAircraftType(e.target.value)}
                className="w-full h-12 rounded-lg px-4 text-[14px] border-none outline-none" style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: '#4A566E' }}>ETA Date</label>
                <input type="date" value={etaDate} onChange={e => setEtaDate(e.target.value)}
                  className="w-full h-12 rounded-lg px-4 text-[14px] border-none outline-none" style={{ ...inputStyle, fontFamily: "'DM Mono', monospace" }} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: '#4A566E' }}>ETA Time (local)</label>
                <input type="time" value={etaTime} onChange={e => setEtaTime(e.target.value)}
                  className="w-full h-12 rounded-lg px-4 text-[14px] border-none outline-none" style={{ ...inputStyle, fontFamily: "'DM Mono', monospace" }} />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: '#4A566E' }}>Passengers</label>
              <div className="flex items-center h-12 rounded-lg" style={{ background: '#0E1525' }}>
                <button onClick={() => setPaxCount(Math.max(0, paxCount - 1))} className="w-12 h-full border-none cursor-pointer text-[18px]" style={{ background: 'transparent', color: '#4EADFF' }}>−</button>
                <span className="flex-1 text-center text-[16px]" style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>{paxCount}</span>
                <button onClick={() => setPaxCount(Math.min(20, paxCount + 1))} className="w-12 h-full border-none cursor-pointer text-[18px]" style={{ background: 'transparent', color: '#4EADFF' }}>+</button>
              </div>
            </div>
            <button onClick={() => setStep(4)} className="w-full h-12 rounded-lg border-none cursor-pointer text-[14px] font-semibold mt-2" style={{ background: '#4EADFF', color: '#080D18' }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Services */}
      {step === 4 && (
        <div>
          <h2 className="text-[32px] mb-6" style={{ color: '#E8EDF7', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>What do you need?</h2>
          <div className="flex flex-wrap gap-2 mb-5">
            {SERVICE_OPTIONS.map(s => (
              <button key={s} onClick={() => toggleService(s)}
                className="h-10 px-4 rounded-lg text-[12px] font-medium border-none cursor-pointer transition-all"
                style={{
                  background: services.includes(s) ? 'rgba(78,173,255,0.15)' : '#0E1525',
                  color: services.includes(s) ? '#4EADFF' : '#4A566E',
                  border: services.includes(s) ? '1px solid rgba(78,173,255,0.3)' : '1px solid transparent',
                }}>
                {s}
              </button>
            ))}
          </div>
          {services.includes('Other') && (
            <input type="text" value={otherService} onChange={e => setOtherService(e.target.value)} placeholder="Describe other service..."
              className="w-full h-12 rounded-lg px-4 text-[14px] border-none outline-none mb-4" style={inputStyle} />
          )}
          {hasFuel && (
            <div className="mb-5">
              <label className="block text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: '#4A566E' }}>Estimated Gallons</label>
              <input type="number" value={fuelQuantity} onChange={e => setFuelQuantity(e.target.value)} placeholder="Enter gallons"
                className="w-full h-12 rounded-lg px-4 text-[14px] border-none outline-none"
                style={{ ...inputStyle, fontFamily: "'DM Mono', monospace" }} />
              {fboWaiverMin > 0 && fuelQuantity && (
                <div className="mt-3 rounded-lg px-4 py-3" style={{ background: isWaived ? 'rgba(29,158,117,0.08)' : 'rgba(252,211,77,0.06)', borderLeft: `3px solid ${isWaived ? '#1D9E75' : '#FCD34D'}` }}>
                  <p className="text-[12px] font-medium" style={{ color: isWaived ? '#4ADE80' : '#FCD34D' }}>
                    {isWaived ? 'Ramp fee will be waived' : `Need ${fboWaiverMin - parseInt(fuelQuantity)} more gallons to waive ramp fee`}
                  </p>
                </div>
              )}
            </div>
          )}
          <button onClick={() => setStep(5)} className="w-full h-12 rounded-lg border-none cursor-pointer text-[14px] font-semibold" style={{ background: '#4EADFF', color: '#080D18' }}>
            Continue →
          </button>
          <button onClick={() => setStep(3)} className="w-full h-10 mt-2 bg-transparent border-none cursor-pointer text-[13px]" style={{ color: '#4A566E' }}>
            ← Back
          </button>
        </div>
      )}

      {/* Step 5: Notes */}
      {step === 5 && (
        <div>
          <h2 className="text-[32px] mb-6" style={{ color: '#E8EDF7', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>Anything else?</h2>
          <textarea value={notes} onChange={e => setNotes(e.target.value.slice(0, 500))} placeholder="Notes for the ramp crew..."
            rows={5} className="w-full rounded-xl p-4 text-[14px] border-none outline-none resize-none mb-1"
            style={{ background: '#0E1525', color: '#E8EDF7', caretColor: '#4EADFF' }} />
          <p className="text-[11px] text-right mb-4" style={{ color: '#4A566E' }}>{notes.length}/500</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {NOTE_SUGGESTIONS.map(s => (
              <button key={s} onClick={() => setNotes(s)} className="text-[11px] px-3 py-1.5 rounded-full border-none cursor-pointer transition-all"
                style={{ background: '#0E1525', color: '#4A566E' }}>
                {s}
              </button>
            ))}
          </div>
          <button onClick={() => setStep(6)} className="w-full h-12 rounded-lg border-none cursor-pointer text-[14px] font-semibold" style={{ background: '#4EADFF', color: '#080D18' }}>
            Review Request →
          </button>
          <button onClick={() => setStep(4)} className="w-full h-10 mt-2 bg-transparent border-none cursor-pointer text-[13px]" style={{ color: '#4A566E' }}>
            ← Back
          </button>
        </div>
      )}

      {/* Step 6: Review */}
      {step === 6 && (
        <div>
          <h2 className="text-[32px] mb-6" style={{ color: '#E8EDF7', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>Review & Send</h2>
          <div className="rounded-xl p-6 mb-5" style={{ background: '#0E1525' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[28px] font-medium" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>{selectedAirport}</span>
              <span className="text-[13px]" style={{ color: '#8B9AB0' }}>{selectedFBO?.fbo_name}</span>
            </div>
            <div className="space-y-3 text-[14px]" style={{ color: '#8B9AB0' }}>
              <div className="flex justify-between"><span>Tail Number</span><span style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>{tailNumber}</span></div>
              <div className="flex justify-between"><span>Aircraft</span><span style={{ color: '#E8EDF7' }}>{aircraftType}</span></div>
              <div className="flex justify-between"><span>ETA</span><span style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>{eta}</span></div>
              <div className="flex justify-between"><span>Passengers</span><span style={{ color: '#E8EDF7' }}>{paxCount}</span></div>
              {fuelQuantity && <div className="flex justify-between"><span>Fuel</span><span style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>{fuelQuantity} gal</span></div>}
            </div>
            {services.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                {services.map(s => <span key={s} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(78,173,255,0.1)', color: '#4EADFF' }}>{s}</span>)}
              </div>
            )}
            {hasFuel && fboWaiverMin > 0 && (
              <div className="mt-4 rounded-lg px-4 py-2" style={{ background: isWaived ? 'rgba(29,158,117,0.08)' : 'rgba(252,211,77,0.06)' }}>
                <span className="text-[12px] font-semibold" style={{ color: isWaived ? '#4ADE80' : '#FCD34D' }}>
                  Ramp fee: {isWaived ? 'WAIVED' : 'NOT WAIVED'}
                </span>
              </div>
            )}
            {notes && (
              <p className="text-[13px] mt-4 pt-4 italic" style={{ color: '#8B9AB0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>"{notes}"</p>
            )}
          </div>

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full h-14 rounded-lg border-none cursor-pointer text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            style={{ background: '#4EADFF', color: '#080D18' }}>
            {submitting ? (
              <><div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Sending...</>
            ) : 'Send Request →'}
          </button>
          <p className="text-[12px] text-center mt-3" style={{ color: '#4A566E' }}>
            Your request goes to {selectedFBO?.fbo_name} immediately.
          </p>
          <button onClick={() => setStep(5)} className="w-full h-10 mt-2 bg-transparent border-none cursor-pointer text-[13px]" style={{ color: '#4A566E' }}>
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
