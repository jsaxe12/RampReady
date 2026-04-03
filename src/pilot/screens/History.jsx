import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePilotPortal } from '../PilotContext'

const FILTERS = ['all', 'confirmed', 'cancelled', 'declined']

const statusStyles = {
  pending:   { bg: '#1C1408', color: '#FCD34D', border: '#854D0E', cardBorder: '#FCD34D' },
  confirmed: { bg: '#052E16', color: '#4ADE80', border: '#166534', cardBorder: '#1D9E75' },
  completed: { bg: '#052E16', color: '#4ADE80', border: '#166534', cardBorder: '#1D9E75' },
  declined:  { bg: '#1C0A0A', color: '#F87171', border: '#7F1D1D', cardBorder: '#EF4444' },
  cancelled: { bg: '#1C0A0A', color: '#F87171', border: '#7F1D1D', cardBorder: '#EF4444' },
}

export default function History() {
  const { requests } = usePilotPortal()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === (filter === 'confirmed' ? 'completed' : filter))

  return (
    <div>
      <h1 className="text-[32px] mb-6" style={{ color: '#E8EDF7', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
        Request History
      </h1>

      <div className="flex gap-1 p-1 rounded-lg mb-8" style={{ background: '#0E1525' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-1 h-10 text-[12px] font-medium rounded-md border-none cursor-pointer capitalize transition-all"
            style={{ background: filter === f ? 'rgba(78,173,255,0.15)' : 'transparent', color: filter === f ? '#4EADFF' : '#4A566E' }}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: '#0E1525' }}>
          <p className="text-[15px] font-medium mb-1" style={{ color: '#E8EDF7' }}>No flights yet</p>
          <p className="text-[13px] mb-5" style={{ color: '#4A566E' }}>Your ramp history will appear here after your first request.</p>
          <button onClick={() => navigate('/pilot/search')}
            className="h-10 px-5 rounded-lg border-none cursor-pointer text-[13px] font-semibold"
            style={{ background: '#4EADFF', color: '#080D18' }}>
            Find an FBO →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const s = statusStyles[req.status] || statusStyles.pending
            return (
              <button key={req.id} onClick={() => navigate(`/pilot/request/${req.id}`)}
                className="w-full rounded-xl px-5 py-4 border-none cursor-pointer text-left transition-all"
                style={{ background: '#0E1525', borderLeft: `3px solid ${s.cardBorder}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[18px] font-medium" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>{req.airport_icao}</span>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase"
                      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                      {req.status}
                    </span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A566E" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
                <p className="text-[12px]" style={{ color: '#4A566E' }}>
                  {new Date(req.created_at).toLocaleDateString()} · <span style={{ fontFamily: "'DM Mono', monospace" }}>{req.tail_number}</span>
                  {req.fuel_quantity ? ` · ${req.fuel_quantity} gal` : ''}
                </p>
                {req.services?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {req.services.slice(0, 4).map(svc => (
                      <span key={svc} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: '#8B9AB0' }}>{svc}</span>
                    ))}
                    {req.services.length > 4 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: '#4A566E' }}>+{req.services.length - 4}</span>}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
