import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePilotPortal } from '../PilotContext'

const POPULAR_AIRPORTS = [
  { icao: 'KSDL', city: 'Scottsdale, AZ' },
  { icao: 'KADS', city: 'Addison, TX' },
  { icao: 'KHOU', city: 'Houston, TX' },
  { icao: 'KDAL', city: 'Dallas, TX' },
  { icao: 'KFTW', city: 'Fort Worth, TX' },
  { icao: 'KGPM', city: 'Grand Prairie, TX' },
  { icao: 'KTEB', city: 'Teterboro, NJ' },
  { icao: 'KVNY', city: 'Van Nuys, CA' },
]

export default function Search() {
  const { searchFBOs, completedRequests } = usePilotPortal()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  const handleSearch = useCallback(async (q) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    const data = await searchFBOs(q)
    const airports = {}
    data.forEach(fbo => {
      if (!airports[fbo.airport_icao]) airports[fbo.airport_icao] = { icao: fbo.airport_icao, name: fbo.airport_name, city: fbo.city, state: fbo.state, fboCount: 0 }
      airports[fbo.airport_icao].fboCount++
    })
    setResults(Object.values(airports))
    setSearching(false)
  }, [searchFBOs])

  const recentAirports = (() => {
    const seen = new Set()
    return completedRequests
      .filter(r => { if (seen.has(r.airport_icao)) return false; seen.add(r.airport_icao); return true })
      .slice(0, 5)
      .map(r => ({ icao: r.airport_icao, date: new Date(r.created_at).toLocaleDateString() }))
  })()

  return (
    <div>
      <h1 className="text-[32px] mb-6" style={{ color: '#E8EDF7', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
        Find an Airport
      </h1>

      {/* Search bar */}
      <div className="relative mb-8">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A566E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-5 top-1/2 -translate-y-1/2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search airport or ICAO code..."
          className="w-full h-14 rounded-xl pl-14 pr-5 text-[18px] border-none outline-none uppercase transition-shadow"
          style={{
            background: '#0E1525',
            color: '#E8EDF7',
            caretColor: '#4EADFF',
            fontFamily: "'DM Mono', monospace",
            boxShadow: '0 0 0 1px rgba(78,173,255,0.1)',
          }}
          onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(78,173,255,0.4), 0 0 30px rgba(78,173,255,0.08)'}
          onBlur={(e) => e.target.style.boxShadow = '0 0 0 1px rgba(78,173,255,0.1)'}
          autoFocus
        />
      </div>

      {/* Search results */}
      {searching ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: '#4EADFF', borderTopColor: 'transparent' }} />
        </div>
      ) : query.length >= 2 && results.length === 0 ? (
        <div className="rounded-xl p-8 text-center mb-8" style={{ background: '#0E1525' }}>
          <p className="text-[14px]" style={{ color: '#4A566E' }}>No airports found for "{query}"</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3 mb-8">
          {results.map(apt => (
            <button key={apt.icao} onClick={() => navigate(`/pilot/airport/${apt.icao}`)}
              className="w-full rounded-xl px-6 py-4 border-none cursor-pointer text-left flex items-center justify-between transition-all"
              style={{ background: '#0E1525', borderTop: '1px solid rgba(78,173,255,0.15)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(78,173,255,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(78,173,255,0.15)'}>
              <div className="flex items-center gap-4">
                <span className="text-[20px] font-medium" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>{apt.icao}</span>
                <div>
                  {apt.name && <p className="text-[14px]" style={{ color: '#E8EDF7' }}>{apt.name}</p>}
                  {(apt.city || apt.state) && <p className="text-[12px]" style={{ color: '#4A566E' }}>{[apt.city, apt.state].filter(Boolean).join(', ')}</p>}
                </div>
              </div>
              <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(78,173,255,0.1)', color: '#4EADFF', border: '1px solid rgba(78,173,255,0.2)' }}>
                {apt.fboCount} FBO{apt.fboCount !== 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Recently visited */}
      {query.length < 2 && recentAirports.length > 0 && (
        <div className="mb-12">
          <p className="text-[13px] uppercase tracking-[0.1em] font-medium mb-4" style={{ color: '#4EADFF' }}>
            Recently Visited
          </p>
          <div className="space-y-3">
            {recentAirports.map(apt => (
              <button key={apt.icao} onClick={() => navigate(`/pilot/airport/${apt.icao}`)}
                className="w-full rounded-xl px-6 py-4 border-none cursor-pointer text-left flex items-center justify-between transition-all"
                style={{ background: '#0E1525' }}>
                <span className="text-[18px] font-medium" style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>{apt.icao}</span>
                <span className="text-[12px]" style={{ color: '#4A566E' }}>{apt.date}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular airports */}
      {query.length < 2 && (
        <div>
          <p className="text-[13px] uppercase tracking-[0.1em] font-medium mb-4" style={{ color: '#4EADFF' }}>
            Popular Airports
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {POPULAR_AIRPORTS.map(apt => (
              <button key={apt.icao} onClick={() => navigate(`/pilot/airport/${apt.icao}`)}
                className="rounded-xl px-5 py-4 border-none cursor-pointer text-left transition-all"
                style={{ background: '#0E1525', borderTop: '1px solid rgba(78,173,255,0.1)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(78,173,255,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(78,173,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <p className="text-[18px] font-medium" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>{apt.icao}</p>
                <p className="text-[11px] mt-1" style={{ color: '#4A566E' }}>{apt.city}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
