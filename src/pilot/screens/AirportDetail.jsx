import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePilotPortal } from '../PilotContext'

function PriceFreshness({ lastUpdated }) {
  if (!lastUpdated) return <span className="text-[10px]" style={{ color: '#4A566E' }}>No data</span>
  const hours = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 3600000)
  let color = '#1D9E75'
  if (hours > 48) color = '#ef4444'
  else if (hours > 24) color = '#FCD34D'
  return <span className="text-[10px]" style={{ color }}>{hours < 1 ? 'Just updated' : `${hours}h ago`}</span>
}

function FBOCard({ fbo, onRequest, onCalculator }) {
  const services = fbo.services || []
  const hasWaiver = fbo.ramp_fee_waiver_gallons > 0

  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: '#0E1525' }}>
      <p className="text-[15px] font-bold mb-2" style={{ color: '#E8EDF7' }}>{fbo.fbo_name}</p>

      {/* Prices */}
      <div className="flex gap-4 mb-3">
        {fbo.avgas_price > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: '#4A566E' }}>100LL Avgas</p>
            <p className="text-[18px] font-bold font-mono" style={{ color: '#1D9E75' }}>${Number(fbo.avgas_price).toFixed(2)}</p>
            <PriceFreshness lastUpdated={fbo.price_last_updated} />
          </div>
        )}
        {fbo.jeta_price > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: '#4A566E' }}>Jet-A</p>
            <p className="text-[18px] font-bold font-mono" style={{ color: '#4EADFF' }}>${Number(fbo.jeta_price).toFixed(2)}</p>
            <PriceFreshness lastUpdated={fbo.price_last_updated} />
          </div>
        )}
      </div>

      {/* Ramp fee waiver */}
      {hasWaiver && (
        <div className="rounded-lg px-3 py-2 mb-3 flex items-center justify-between" style={{ background: '#FCD34D10', border: '1px solid #FCD34D30' }}>
          <p className="text-[11px]" style={{ color: '#FCD34D' }}>
            Buy {fbo.ramp_fee_waiver_gallons}+ gal → ${fbo.ramp_fee} ramp fee waived
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onCalculator(fbo.id) }}
            className="text-[10px] font-semibold px-2 py-1 rounded border-none cursor-pointer"
            style={{ background: '#FCD34D20', color: '#FCD34D' }}
          >
            Calculate
          </button>
        </div>
      )}

      {/* Services */}
      {services.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {services.map(s => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#1a2540', color: '#8899b0' }}>{s}</span>
          ))}
        </div>
      )}

      {/* Hours */}
      {fbo.hours && (
        <p className="text-[11px] mb-3" style={{ color: '#4A566E' }}>Hours: {fbo.hours}</p>
      )}

      <button
        onClick={() => onRequest(fbo)}
        className="w-full h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold flex items-center justify-center gap-2"
        style={{ background: '#4EADFF', color: '#0A0F1E' }}
      >
        Request services here
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
      </button>
    </div>
  )
}

export default function AirportDetail() {
  const { icao } = useParams()
  const navigate = useNavigate()
  const { searchFBOsByAirport } = usePilotPortal()
  const [fbos, setFbos] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('price')

  useEffect(() => {
    setLoading(true)
    searchFBOsByAirport(icao).then(data => {
      setFbos(data)
      setLoading(false)
    })
  }, [icao, searchFBOsByAirport])

  const sorted = [...fbos].sort((a, b) => {
    if (sort === 'price') return (Number(a.jeta_price) || 999) - (Number(b.jeta_price) || 999)
    if (sort === 'name') return (a.fbo_name || '').localeCompare(b.fbo_name || '')
    return (b.services?.length || 0) - (a.services?.length || 0)
  })

  const airportName = fbos[0]?.airport_name
  const city = fbos[0]?.city
  const state = fbos[0]?.state

  return (
    <div className="px-4 pt-5">
      {/* Back + header */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 mb-3 bg-transparent border-none cursor-pointer" style={{ color: '#4A566E' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        <span className="text-[12px]">Back</span>
      </button>

      <div className="mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold font-mono" style={{ color: '#4EADFF' }}>{icao}</h1>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#4EADFF15', color: '#4EADFF' }}>
            {fbos.length} FBO{fbos.length !== 1 ? 's' : ''}
          </span>
        </div>
        {airportName && <p className="text-[13px] mt-1" style={{ color: '#E8EDF7' }}>{airportName}</p>}
        {(city || state) && <p className="text-[12px]" style={{ color: '#4A566E' }}>{[city, state].filter(Boolean).join(', ')}</p>}
      </div>

      {/* Sort toggle */}
      {fbos.length > 1 && (
        <div className="flex gap-1 mb-4 p-0.5 rounded-lg" style={{ background: '#0E1525' }}>
          {['price', 'name', 'services'].map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className="flex-1 h-7 text-[11px] font-semibold rounded-md border-none cursor-pointer capitalize"
              style={{ background: sort === s ? '#4EADFF20' : 'transparent', color: sort === s ? '#4EADFF' : '#4A566E' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* FBO cards */}
      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-48 rounded-xl animate-pulse" style={{ background: '#162033' }} />)}</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: '#0E1525' }}>
          <p className="text-[14px] font-medium mb-1" style={{ color: '#E8EDF7' }}>No RampReady FBOs yet</p>
          <p className="text-[12px]" style={{ color: '#4A566E' }}>No FBOs at {icao} are on RampReady yet.</p>
        </div>
      ) : (
        sorted.map(fbo => (
          <FBOCard
            key={fbo.id}
            fbo={fbo}
            onRequest={(f) => navigate('/pilot/request/new', { state: { fbo: f, airportIcao: icao } })}
            onCalculator={(id) => navigate(`/pilot/calculator/${id}`)}
          />
        ))
      )}
    </div>
  )
}
