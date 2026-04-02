import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePilotPortal } from '../PilotContext'
import { supabase } from '../../lib/supabase'

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded-lg ${className}`} style={{ background: '#162033' }} />
}

function StatCard({ value, label, color = '#4EADFF' }) {
  return (
    <div className="flex-1 rounded-xl p-3 text-center" style={{ background: '#0E1525' }}>
      <p className="text-[22px] font-bold font-mono" style={{ color }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#4A566E' }}>{label}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    pending: { bg: '#FCD34D20', color: '#FCD34D' },
    confirmed: { bg: '#1D9E7520', color: '#1D9E75' },
    declined: { bg: '#ef444420', color: '#ef4444' },
    completed: { bg: '#4A566E20', color: '#8899b0' },
    cancelled: { bg: '#4A566E20', color: '#4A566E' },
  }
  const s = styles[status] || styles.pending
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

export default function Home() {
  const { pilotProfile } = useAuth()
  const { primaryAircraft, activeRequests, completedRequests, loading, flightsThisYear, totalFuel, favoriteFBO, unreadNotifications } = usePilotPortal()
  const navigate = useNavigate()
  const [favFboName, setFavFboName] = useState('—')

  const firstName = pilotProfile?.first_name || pilotProfile?.display_name?.split(' ')[0] || 'Pilot'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    if (favoriteFBO) {
      supabase.from('fbo_profiles').select('fbo_name').eq('id', favoriteFBO).single().then(({ data }) => {
        if (data) setFavFboName(data.fbo_name)
      })
    }
  }, [favoriteFBO])

  const recentCompleted = completedRequests.slice(0, 5)

  return (
    <div className="px-4 pt-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[20px] font-medium" style={{ color: '#E8EDF7', fontFamily: "'DM Sans', sans-serif" }}>
            {greeting}, {firstName}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            {primaryAircraft && (
              <span className="text-[13px] font-bold font-mono px-2 py-0.5 rounded" style={{ background: '#4EADFF15', color: '#4EADFF' }}>
                {primaryAircraft.tail_number}
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px]" style={{ color: '#1D9E75' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Active pilot
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate('/pilot/notifications')}
          className="relative w-9 h-9 rounded-full flex items-center justify-center border-none cursor-pointer"
          style={{ background: '#0E1525' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A566E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {unreadNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: '#ef4444' }}>
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>
      </div>

      {/* Stats */}
      {loading.requests ? (
        <div className="flex gap-2 mb-4">
          <Skeleton className="flex-1 h-16" /><Skeleton className="flex-1 h-16" /><Skeleton className="flex-1 h-16" />
        </div>
      ) : (
        <div className="flex gap-2 mb-4">
          <StatCard value={flightsThisYear} label="Flights" color="#4EADFF" />
          <StatCard value={favFboName === '—' ? '—' : favFboName.split(' ')[0]} label="Fav FBO" color="#1D9E75" />
          <StatCard value={totalFuel > 0 ? `${totalFuel}g` : '0g'} label="Fuel" color="#FCD34D" />
        </div>
      )}

      {/* Active Request */}
      {activeRequests.length > 0 ? (
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: '#4A566E' }}>Active Request</p>
          {activeRequests.map(req => (
            <button
              key={req.id}
              onClick={() => navigate(`/pilot/request/${req.id}`)}
              className="w-full rounded-xl p-4 border-none cursor-pointer text-left mb-2"
              style={{ background: '#0E1525', border: '1px solid #4EADFF30' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[20px] font-bold font-mono" style={{ color: '#4EADFF' }}>{req.airport_icao}</span>
                <StatusBadge status={req.status} />
              </div>
              <div className="flex items-center gap-3 text-[12px]" style={{ color: '#8899b0' }}>
                <span>ETA {req.eta}</span>
                <span>{req.tail_number}</span>
                {req.services?.length > 0 && <span>{req.services.length} services</span>}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => navigate('/pilot/request/new')}
          className="w-full rounded-xl p-4 mb-4 border-none cursor-pointer flex items-center justify-between"
          style={{ background: '#4EADFF15', border: '1px solid #4EADFF30' }}
        >
          <div>
            <p className="text-[14px] font-semibold" style={{ color: '#4EADFF' }}>Plan your next arrival</p>
            <p className="text-[12px] mt-0.5" style={{ color: '#4A566E' }}>Search FBOs and request services</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4EADFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      )}

      {/* Recent Activity */}
      <div>
        <p className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: '#4A566E' }}>Recent Activity</p>
        {loading.requests ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
        ) : recentCompleted.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: '#0E1525' }}>
            <p className="text-[13px]" style={{ color: '#4A566E' }}>No flights yet — your history will appear here after your first request.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentCompleted.map(req => (
              <button
                key={req.id}
                onClick={() => navigate(`/pilot/request/${req.id}`)}
                className="w-full rounded-xl px-4 py-3 border-none cursor-pointer text-left flex items-center justify-between"
                style={{ background: '#0E1525' }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold font-mono" style={{ color: '#E8EDF7' }}>{req.airport_icao}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: '#4A566E' }}>
                    {new Date(req.created_at).toLocaleDateString()} · {req.services?.join(', ') || 'No services'}
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A566E" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
