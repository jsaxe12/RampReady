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
    // Group by airport
    const airports = {}
    data.forEach(fbo => {
      if (!airports[fbo.airport_icao]) airports[fbo.airport_icao] = { icao: fbo.airport_icao, name: fbo.airport_name, city: fbo.city, state: fbo.state, fboCount: 0 }
      airports[fbo.airport_icao].fboCount++
    })
    setResults(Object.values(airports))
    setSearching(false)
  }, [searchFBOs])

  // Recently visited airports from request history
  const recentAirports = (() => {
    const seen = new Set()
    return completedRequests
      .filter(r => { if (seen.has(r.airport_icao)) return false; seen.add(r.airport_icao); return true })
      .slice(0, 5)
      .map(r => ({ icao: r.airport_icao, date: new Date(r.created_at).toLocaleDateString() }))
  })()

  return (
    <div className="px-4 pt-5">
      <h1 className="text-[18px] font-bold mb-4" style={{ color: '#E8EDF7' }}>Find an Airport</h1>

      {/* Search bar */}
      <div className="relative mb-5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A566E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search airport or ICAO code..."
          className="w-full h-11 rounded-xl pl-10 pr-4 text-[14px] border-none outline-none font-mono uppercase"
          style={{ background: '#0E1525', color: '#E8EDF7', caretColor: '#4EADFF' }}
          autoFocus
        />
      </div>

      {/* Search results */}
      {searching ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#4EADFF', borderTopColor: 'transparent' }} />
        </div>
      ) : query.length >= 2 && results.length === 0 ? (
        <div className="rounded-xl p-6 text-center mb-5" style={{ background: '#0E1525' }}>
          <p className="text-[13px]" style={{ color: '#4A566E' }}>No airports found for "{query}"</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2 mb-5">
          {results.map(apt => (
            <button
              key={apt.icao}
              onClick={() => navigate(`/pilot/airport/${apt.icao}`)}
              className="w-full rounded-xl px-4 py-3 border-none cursor-pointer text-left flex items-center justify-between"
              style={{ background: '#0E1525' }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold font-mono" style={{ color: '#4EADFF' }}>{apt.icao}</span>
                  {apt.name && <span className="text-[12px]" style={{ color: '#8899b0' }}>{apt.name}</span>}
                </div>
                {(apt.city || apt.state) && (
                  <p className="text-[11px] mt-0.5" style={{ color: '#4A566E' }}>{[apt.city, apt.state].filter(Boolean).join(', ')}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#4EADFF15', color: '#4EADFF' }}>
                  {apt.fboCount} FBO{apt.fboCount !== 1 ? 's' : ''}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A566E" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {/* Recently visited */}
      {query.length < 2 && recentAirports.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: '#4A566E' }}>Recently Visited</p>
          <div className="space-y-2">
            {recentAirports.map(apt => (
              <button
                key={apt.icao}
                onClick={() => navigate(`/pilot/airport/${apt.icao}`)}
                className="w-full rounded-xl px-4 py-3 border-none cursor-pointer text-left flex items-center justify-between"
                style={{ background: '#0E1525' }}
              >
                <span className="text-[14px] font-bold font-mono" style={{ color: '#E8EDF7' }}>{apt.icao}</span>
                <span className="text-[11px]" style={{ color: '#4A566E' }}>{apt.date}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular airports */}
      {query.length < 2 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: '#4A566E' }}>Popular Airports</p>
          <div className="grid grid-cols-2 gap-2">
            {POPULAR_AIRPORTS.map(apt => (
              <button
                key={apt.icao}
                onClick={() => navigate(`/pilot/airport/${apt.icao}`)}
                className="rounded-xl px-3 py-3 border-none cursor-pointer text-left"
                style={{ background: '#0E1525' }}
              >
                <p className="text-[14px] font-bold font-mono" style={{ color: '#4EADFF' }}>{apt.icao}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#4A566E' }}>{apt.city}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
