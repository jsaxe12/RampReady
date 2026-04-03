import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePilotPortal } from '../PilotContext'

const AIRCRAFT_TYPES = ['Single Engine', 'Twin Engine', 'Turboprop', 'Light Jet', 'Midsize Jet', 'Heavy Jet']

export default function Calculator() {
  const { fboId } = useParams()
  const navigate = useNavigate()
  const { getFBO } = usePilotPortal()
  const [fbo, setFbo] = useState(null)
  const [aircraftType, setAircraftType] = useState('Single Engine')
  const [fuelType, setFuelType] = useState('Avgas')
  const [fuelPrice, setFuelPrice] = useState(0)
  const [rampFee, setRampFee] = useState(0)
  const [gallonsNeeded, setGallonsNeeded] = useState('')
  const [waiverMin, setWaiverMin] = useState(0)

  useEffect(() => {
    getFBO(fboId).then(data => {
      if (data) {
        setFbo(data)
        setFuelPrice(Number(data.avgas_price) || 0)
        setRampFee(Number(data.ramp_fee) || 75)
        setWaiverMin(data.ramp_fee_waiver_gallons || 30)
      }
    })
  }, [fboId, getFBO])

  useEffect(() => {
    if (fbo) setFuelPrice(fuelType === 'Jet-A' ? Number(fbo.jeta_price) || 0 : Number(fbo.avgas_price) || 0)
  }, [fuelType, fbo])

  const gal = parseInt(gallonsNeeded) || 0
  const isWaived = gal >= waiverMin
  const gallonsToWaive = Math.max(0, waiverMin - gal)
  const totalFuelCost = gal * fuelPrice
  const costWithRampFee = totalFuelCost + rampFee
  const costIfBuyMore = waiverMin * fuelPrice
  const savings = costWithRampFee - costIfBuyMore

  if (!fbo) return (
    <div className="flex justify-center pt-20">
      <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: '#4EADFF', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 mb-6 bg-transparent border-none cursor-pointer" style={{ color: '#4A566E' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        <span className="text-[13px]">Back</span>
      </button>

      <h1 className="text-[32px] mb-1" style={{ color: '#E8EDF7', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
        Ramp Fee Calculator
      </h1>
      <p className="text-[14px] mb-8" style={{ color: '#8B9AB0' }}>
        {fbo.fbo_name} — <span style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>{fbo.airport_icao}</span>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: inputs */}
        <div className="space-y-5">
          <p className="text-[13px] uppercase tracking-[0.1em] font-medium" style={{ color: '#4EADFF' }}>Inputs</p>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: '#4A566E' }}>Aircraft Type</label>
            <select value={aircraftType} onChange={e => setAircraftType(e.target.value)}
              className="w-full h-12 rounded-lg px-4 text-[14px] border-none outline-none appearance-none cursor-pointer"
              style={{ background: '#0E1525', color: '#E8EDF7' }}>
              {AIRCRAFT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: '#4A566E' }}>Fuel Type</label>
            <div className="flex gap-3">
              {['Avgas', 'Jet-A'].map(t => (
                <button key={t} onClick={() => setFuelType(t)}
                  className="flex-1 h-12 rounded-lg border-none cursor-pointer text-[14px] font-medium transition-all"
                  style={{
                    background: fuelType === t ? 'rgba(78,173,255,0.15)' : '#0E1525',
                    color: fuelType === t ? '#4EADFF' : '#4A566E',
                    border: fuelType === t ? '1px solid rgba(78,173,255,0.3)' : '1px solid transparent',
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: '#4A566E' }}>Fuel Price ($/gal)</label>
              <input type="number" step="0.01" value={fuelPrice} onChange={e => setFuelPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-12 rounded-lg px-4 text-[14px] border-none outline-none"
                style={{ background: '#0E1525', color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: '#4A566E' }}>Ramp Fee ($)</label>
              <input type="number" value={rampFee} onChange={e => setRampFee(parseFloat(e.target.value) || 0)}
                className="w-full h-12 rounded-lg px-4 text-[14px] border-none outline-none"
                style={{ background: '#0E1525', color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.08em] mb-2" style={{ color: '#4A566E' }}>Fuel Needed (gallons)</label>
            <input type="number" value={gallonsNeeded} onChange={e => setGallonsNeeded(e.target.value)} placeholder="Enter estimated gallons"
              className="w-full h-12 rounded-lg px-4 text-[16px] border-none outline-none"
              style={{ background: '#0E1525', color: '#E8EDF7', caretColor: '#4EADFF', fontFamily: "'DM Mono', monospace" }} />
          </div>
        </div>

        {/* Right: results */}
        <div>
          {gal > 0 ? (
            <div className="space-y-5">
              <p className="text-[13px] uppercase tracking-[0.1em] font-medium" style={{ color: '#4EADFF' }}>Results</p>

              {/* WAIVED / NOT WAIVED hero */}
              <div className="rounded-xl h-20 flex items-center justify-center"
                style={{
                  background: isWaived ? 'rgba(29,158,117,0.15)' : 'rgba(252,211,77,0.08)',
                  border: `1px solid ${isWaived ? '#166534' : '#854D0E'}`,
                }}>
                <div className="text-center">
                  <p style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '32px',
                    color: isWaived ? '#E8EDF7' : '#FCD34D',
                  }}>
                    RAMP FEE {isWaived ? 'WAIVED' : 'NOT WAIVED'}
                  </p>
                  <p className="text-[12px] -mt-1" style={{ color: '#8B9AB0' }}>
                    {isWaived ? 'Your fuel purchase waives the ramp fee' : `Need ${gallonsToWaive} more gallons to waive`}
                  </p>
                </div>
              </div>

              {/* Cost readouts */}
              <div className="rounded-xl p-6" style={{ background: '#0E1525' }}>
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[13px]" style={{ color: '#8B9AB0' }}>Fuel cost ({gal} gal)</span>
                    <span className="text-[24px] font-medium" style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>${totalFuelCost.toFixed(2)}</span>
                  </div>
                  {!isWaived && (
                    <>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[13px]" style={{ color: '#8B9AB0' }}>Ramp fee</span>
                        <span className="text-[20px] font-medium" style={{ color: '#FCD34D', fontFamily: "'DM Mono', monospace" }}>${rampFee.toFixed(2)}</span>
                      </div>
                      <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <div className="flex justify-between items-baseline">
                        <span className="text-[13px]" style={{ color: '#8B9AB0' }}>Total (with ramp fee)</span>
                        <span className="text-[24px] font-medium" style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>${costWithRampFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[13px]" style={{ color: '#8B9AB0' }}>Cost to buy {waiverMin} gal</span>
                        <span className="text-[20px] font-medium" style={{ color: '#4ADE80', fontFamily: "'DM Mono', monospace" }}>${costIfBuyMore.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Recommendation */}
              {!isWaived && savings > 0 && (
                <div className="rounded-xl p-5" style={{ background: 'rgba(29,158,117,0.08)', borderLeft: '3px solid #1D9E75' }}>
                  <p className="text-[14px] font-medium" style={{ color: '#4ADE80' }}>
                    Buy {waiverMin} gallons — saves you ${savings.toFixed(2)} vs paying the ramp fee
                  </p>
                </div>
              )}
              {!isWaived && savings <= 0 && (
                <div className="rounded-xl p-5" style={{ background: 'rgba(252,211,77,0.06)', borderLeft: '3px solid #FCD34D' }}>
                  <p className="text-[14px] font-medium" style={{ color: '#FCD34D' }}>
                    Paying the ramp fee is cheaper by ${Math.abs(savings).toFixed(2)}
                  </p>
                </div>
              )}

              <button onClick={() => navigate('/pilot/request/new', { state: { fbo, airportIcao: fbo.airport_icao, prefillFuel: waiverMin } })}
                className="w-full h-12 rounded-lg border-none cursor-pointer text-[14px] font-semibold transition-all"
                style={{ background: '#4EADFF', color: '#080D18' }}>
                Request fuel here →
              </button>
            </div>
          ) : (
            <div className="rounded-xl p-10 text-center" style={{ background: '#0E1525' }}>
              <p className="text-[14px]" style={{ color: '#4A566E' }}>Enter fuel gallons to see the breakdown</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
