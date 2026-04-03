import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePilotPortal } from '../PilotContext'

function PriceFreshness({ lastUpdated }) {
  if (!lastUpdated) return <span className="flex items-center gap-1 text-[10px]" style={{ color: '#4A566E' }}>No data</span>
  const hours = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 3600000)
  let color = '#4ADE80', dotColor = '#4ADE80'
  if (hours > 48) { color = '#FCD34D'; dotColor = '#EF4444' }
  else if (hours > 24) { color = '#FCD34D'; dotColor = '#FCD34D' }
  return (
    <span className="flex items-center gap-1.5 text-[10px]" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
      {hours < 1 ? 'Just updated' : `${hours}h ago`}
    </span>
  )
}

function FBOCard({ fbo, onRequest, onCalculator }) {
  const services = fbo.services || []
  const hasWaiver = fbo.ramp_fee_waiver_gallons > 0

  return (
    <div className="rounded-xl p-6 mb-4 transition-all"
      style={{ background: '#0E1525', borderTop: '1px solid rgba(78,173,255,0.2)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(78,173,255,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(78,173,255,0.2)'; e.currentTarget.style.transform = 'translateY(0)' }}>

      {/* Top: name + ICAO */}
      <div className="flex items-start justify-between mb-5">
        <p className="text-[16px] font-semibold" style={{ color: '#E8EDF7' }}>{fbo.fbo_name}</p>
        <span className="text-[15px] font-medium" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>{fbo.airport_icao}</span>
      </div>

      {/* Fuel prices — the hero of the card */}
      <div className="flex gap-6 mb-5 pb-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        {fbo.avgas_price > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: '#4EADFF', fontWeight: 500 }}>100LL Avgas</p>
            <p className="text-[28px] font-medium" style={{ color: '#4ADE80', fontFamily: "'DM Mono', monospace" }}>
              ${Number(fbo.avgas_price).toFixed(2)}
            </p>
            <PriceFreshness lastUpdated={fbo.price_last_updated} />
          </div>
        )}
        {fbo.avgas_price > 0 && fbo.jeta_price > 0 && (
          <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.06)' }} />
        )}
        {fbo.jeta_price > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: '#4EADFF', fontWeight: 500 }}>Jet-A</p>
            <p className="text-[28px] font-medium" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>
              ${Number(fbo.jeta_price).toFixed(2)}
            </p>
            <PriceFreshness lastUpdated={fbo.price_last_updated} />
          </div>
        )}
      </div>

      {/* Waiver banner */}
      {hasWaiver && (
        <div className="rounded-lg px-4 py-3 mb-5 flex items-center justify-between"
          style={{ background: 'rgba(252,211,77,0.08)', borderTop: '0.5px solid rgba(252,211,77,0.2)', borderBottom: '0.5px solid rgba(252,211,77,0.2)' }}>
          <div className="flex items-center gap-2">
            <span style={{ color: '#FCD34D' }}>⛽</span>
            <p className="text-[12px] font-medium" style={{ color: '#FCD34D' }}>
              Buy {fbo.ramp_fee_waiver_gallons}+ gal → ${fbo.ramp_fee} ramp fee waived
            </p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onCalculator(fbo.id) }}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer"
            style={{ background: 'rgba(252,211,77,0.15)', color: '#FCD34D' }}>
            Calculate
          </button>
        </div>
      )}

      {/* Services */}
      {services.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {services.map(s => {
            const isFuel = /fuel|avgas|jet/i.test(s)
            const isRamp = /ramp|park|tie/i.test(s)
            return (
              <span key={s} className="text-[11px] px-2.5 py-1 rounded-full"
                style={{
                  background: isFuel ? 'rgba(74,222,128,0.08)' : isRamp ? 'rgba(78,173,255,0.08)' : 'rgba(255,255,255,0.04)',
                  color: isFuel ? '#4ADE80' : isRamp ? '#4EADFF' : '#8B9AB0',
                }}>
                {s}
              </span>
            )
          })}
        </div>
      )}

      {/* CTA */}
      <button onClick={() => onRequest(fbo)}
        className="w-full h-[44px] rounded-lg border-none cursor-pointer text-[14px] font-semibold flex items-center justify-center gap-2 transition-all"
        style={{ background: '#4EADFF', color: '#080D18' }}
        onMouseEnter={e => e.currentTarget.style.background = '#6BBFFF'}
        onMouseLeave={e => e.currentTarget.style.background = '#4EADFF'}>
        Request Services at {fbo.fbo_name} →
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
    searchFBOsByAirport(icao).then(data => { setFbos(data); setLoading(false) })
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
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 mb-6 bg-transparent border-none cursor-pointer" style={{ color: '#4A566E' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        <span className="text-[13px]">Back</span>
      </button>

      {/* Hero glow header */}
      <div className="mb-8 relative">
        <div className="absolute top-0 left-0 w-[300px] h-[200px] -translate-x-1/4 -translate-y-1/4 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(78,173,255,0.06) 0%, transparent 70%)' }} />
        <div className="flex items-center gap-4 relative z-10">
          <h1 className="text-[40px] lg:text-[48px] font-medium" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>{icao}</h1>
          <span className="text-[12px] font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(78,173,255,0.1)', color: '#4EADFF', border: '1px solid rgba(78,173,255,0.2)' }}>
            {fbos.length} FBO{fbos.length !== 1 ? 's' : ''}
          </span>
        </div>
        {airportName && <p className="text-[15px] mt-1 relative z-10" style={{ color: '#E8EDF7' }}>{airportName}</p>}
        {(city || state) && <p className="text-[13px] relative z-10" style={{ color: '#4A566E' }}>{[city, state].filter(Boolean).join(', ')}</p>}
      </div>

      {/* Sort */}
      {fbos.length > 1 && (
        <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: '#0E1525' }}>
          {['price', 'name', 'services'].map(s => (
            <button key={s} onClick={() => setSort(s)}
              className="flex-1 h-9 text-[12px] font-medium rounded-md border-none cursor-pointer capitalize transition-all"
              style={{ background: sort === s ? 'rgba(78,173,255,0.15)' : 'transparent', color: sort === s ? '#4EADFF' : '#4A566E' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* FBO cards */}
      {loading ? (
        <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: '#162033' }} />)}</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: '#0E1525' }}>
          <p className="text-[15px] font-medium mb-1" style={{ color: '#E8EDF7' }}>No RampReady FBOs yet</p>
          <p className="text-[13px]" style={{ color: '#4A566E' }}>No FBOs at {icao} are on RampReady yet.</p>
        </div>
      ) : (
        sorted.map(fbo => (
          <FBOCard key={fbo.id} fbo={fbo}
            onRequest={(f) => navigate('/pilot/request/new', { state: { fbo: f, airportIcao: icao } })}
            onCalculator={(id) => navigate(`/pilot/calculator/${id}`)} />
        ))
      )}
    </div>
  )
}
