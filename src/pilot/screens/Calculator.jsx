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
    if (fbo) {
      setFuelPrice(fuelType === 'Jet-A' ? Number(fbo.jeta_price) || 0 : Number(fbo.avgas_price) || 0)
    }
  }, [fuelType, fbo])

  const gal = parseInt(gallonsNeeded) || 0
  const isWaived = gal >= waiverMin
  const gallonsToWaive = Math.max(0, waiverMin - gal)
  const costToWaive = gallonsToWaive * fuelPrice
  const totalFuelCost = gal * fuelPrice
  const costWithRampFee = totalFuelCost + rampFee
  const costIfBuyMore = waiverMin * fuelPrice
  const savings = costWithRampFee - costIfBuyMore

  if (!fbo) return (
    <div className="flex justify-center pt-20">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#4EADFF', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="px-4 pt-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 mb-3 bg-transparent border-none cursor-pointer" style={{ color: '#4A566E' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        <span className="text-[12px]">Back</span>
      </button>

      <h1 className="text-[18px] font-bold mb-1" style={{ color: '#E8EDF7' }}>Ramp Fee Calculator</h1>
      <p className="text-[13px] mb-5" style={{ color: '#4A566E' }}>
        {fbo.fbo_name} — <span className="font-mono" style={{ color: '#4EADFF' }}>{fbo.airport_icao}</span>
      </p>

      {/* Inputs */}
      <div className="space-y-3 mb-5">
        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Aircraft Type</label>
          <select value={aircraftType} onChange={e => setAircraftType(e.target.value)}
            className="w-full h-10 rounded-lg px-3 text-[13px] border-none outline-none appearance-none cursor-pointer"
            style={{ background: '#0E1525', color: '#E8EDF7' }}>
            {AIRCRAFT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Fuel Type</label>
          <div className="flex gap-2">
            {['Avgas', 'Jet-A'].map(t => (
              <button key={t} onClick={() => setFuelType(t)}
                className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[13px] font-medium"
                style={{ background: fuelType === t ? '#4EADFF20' : '#0E1525', color: fuelType === t ? '#4EADFF' : '#4A566E', border: fuelType === t ? '1px solid #4EADFF40' : '1px solid transparent' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Fuel Price ($/gal)</label>
            <input type="number" step="0.01" value={fuelPrice} onChange={e => setFuelPrice(parseFloat(e.target.value) || 0)}
              className="w-full h-10 rounded-lg px-3 text-[13px] font-mono border-none outline-none"
              style={{ background: '#0E1525', color: '#E8EDF7' }} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Ramp Fee ($)</label>
            <input type="number" value={rampFee} onChange={e => setRampFee(parseFloat(e.target.value) || 0)}
              className="w-full h-10 rounded-lg px-3 text-[13px] font-mono border-none outline-none"
              style={{ background: '#0E1525', color: '#E8EDF7' }} />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Fuel Needed (gallons)</label>
          <input type="number" value={gallonsNeeded} onChange={e => setGallonsNeeded(e.target.value)} placeholder="Enter estimated gallons"
            className="w-full h-10 rounded-lg px-3 text-[13px] font-mono border-none outline-none"
            style={{ background: '#0E1525', color: '#E8EDF7', caretColor: '#4EADFF' }} />
        </div>
      </div>

      {/* Results */}
      {gal > 0 && (
        <div className="space-y-3">
          {/* Waiver status */}
          <div className="rounded-xl p-4 text-center" style={{ background: isWaived ? '#1D9E7515' : '#ef444415', border: `1px solid ${isWaived ? '#1D9E7530' : '#ef444430'}` }}>
            <p className="text-[24px] font-bold" style={{ color: isWaived ? '#1D9E75' : '#ef4444' }}>
              {isWaived ? 'WAIVED' : 'NOT WAIVED'}
            </p>
            <p className="text-[12px] mt-1" style={{ color: '#8899b0' }}>
              {isWaived ? 'Your fuel purchase waives the ramp fee' : `Need ${gallonsToWaive} more gallons to waive`}
            </p>
          </div>

          {/* Cost breakdown */}
          <div className="rounded-xl p-4" style={{ background: '#0E1525' }}>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span style={{ color: '#8899b0' }}>Fuel cost ({gal} gal)</span>
                <span className="font-mono font-semibold" style={{ color: '#E8EDF7' }}>${totalFuelCost.toFixed(2)}</span>
              </div>
              {!isWaived && (
                <>
                  <div className="flex justify-between text-[13px]">
                    <span style={{ color: '#8899b0' }}>Ramp fee</span>
                    <span className="font-mono font-semibold" style={{ color: '#FCD34D' }}>${rampFee.toFixed(2)}</span>
                  </div>
                  <div className="h-px" style={{ background: '#1a2540' }} />
                  <div className="flex justify-between text-[13px]">
                    <span style={{ color: '#8899b0' }}>Total (with ramp fee)</span>
                    <span className="font-mono font-bold" style={{ color: '#E8EDF7' }}>${costWithRampFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span style={{ color: '#8899b0' }}>Cost to buy {waiverMin} gal (waive fee)</span>
                    <span className="font-mono font-semibold" style={{ color: '#1D9E75' }}>${costIfBuyMore.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recommendation */}
          {!isWaived && savings > 0 && (
            <div className="rounded-xl p-4" style={{ background: '#1D9E7510', border: '1px solid #1D9E7530' }}>
              <p className="text-[13px] font-semibold" style={{ color: '#1D9E75' }}>
                Buy {waiverMin} gallons — saves you ${savings.toFixed(2)} vs paying the ramp fee
              </p>
            </div>
          )}
          {!isWaived && savings <= 0 && (
            <div className="rounded-xl p-4" style={{ background: '#FCD34D10', border: '1px solid #FCD34D30' }}>
              <p className="text-[13px] font-semibold" style={{ color: '#FCD34D' }}>
                Paying the ramp fee is cheaper by ${Math.abs(savings).toFixed(2)}
              </p>
            </div>
          )}

          <button
            onClick={() => navigate('/pilot/request/new', { state: { fbo, airportIcao: fbo.airport_icao, prefillFuel: waiverMin } })}
            className="w-full h-11 rounded-lg border-none cursor-pointer text-[13px] font-semibold"
            style={{ background: '#4EADFF', color: '#0A0F1E' }}
          >
            Request fuel here →
          </button>
        </div>
      )}
    </div>
  )
}
