import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePilotPortal } from '../PilotContext'

const FILTERS = ['all', 'confirmed', 'cancelled', 'declined']

export default function History() {
  const { requests } = usePilotPortal()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === (filter === 'confirmed' ? 'completed' : filter))

  const statusColors = {
    pending: '#FCD34D', confirmed: '#1D9E75', completed: '#1D9E75',
    declined: '#ef4444', cancelled: '#4A566E',
  }

  return (
    <div className="px-4 pt-5">
      <h1 className="text-[18px] font-bold mb-4" style={{ color: '#E8EDF7' }}>Request History</h1>

      {/* Filters */}
      <div className="flex gap-1 p-0.5 rounded-lg mb-4" style={{ background: '#0E1525' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-1 h-8 text-[11px] font-semibold rounded-md border-none cursor-pointer capitalize"
            style={{ background: filter === f ? '#4EADFF20' : 'transparent', color: filter === f ? '#4EADFF' : '#4A566E' }}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: '#0E1525' }}>
          <p className="text-[14px] font-medium mb-1" style={{ color: '#E8EDF7' }}>No flights yet</p>
          <p className="text-[12px] mb-4" style={{ color: '#4A566E' }}>Your ramp history will appear here after your first request.</p>
          <button onClick={() => navigate('/pilot/search')}
            className="h-9 px-4 rounded-lg border-none cursor-pointer text-[12px] font-semibold"
            style={{ background: '#4EADFF', color: '#0A0F1E' }}>
            Find an FBO →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(req => (
            <button key={req.id} onClick={() => navigate(`/pilot/request/${req.id}`)}
              className="w-full rounded-xl px-4 py-3 border-none cursor-pointer text-left"
              style={{ background: '#0E1525' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold font-mono" style={{ color: '#E8EDF7' }}>{req.airport_icao}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase"
                    style={{ background: `${statusColors[req.status]}15`, color: statusColors[req.status] }}>
                    {req.status}
                  </span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A566E" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
              <p className="text-[11px]" style={{ color: '#4A566E' }}>
                {new Date(req.created_at).toLocaleDateString()} · {req.tail_number}
                {req.fuel_quantity ? ` · ${req.fuel_quantity} gal` : ''}
              </p>
              {req.services?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {req.services.slice(0, 4).map(s => (
                    <span key={s} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#1a2540', color: '#8899b0' }}>{s}</span>
                  ))}
                  {req.services.length > 4 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#1a2540', color: '#4A566E' }}>+{req.services.length - 4}</span>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
