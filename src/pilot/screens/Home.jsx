import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePilotPortal } from '../PilotContext'
import { supabase } from '../../lib/supabase'

const statusBadgeStyles = {
  pending:   { bg: '#1C1408', color: '#FCD34D', border: '#854D0E' },
  confirmed: { bg: '#052E16', color: '#4ADE80', border: '#166534' },
  declined:  { bg: '#1C0A0A', color: '#F87171', border: '#7F1D1D' },
  completed: { bg: '#052E16', color: '#4ADE80', border: '#166534' },
  cancelled: { bg: '#1C0A0A', color: '#F87171', border: '#7F1D1D' },
}

function StatusBadge({ status }) {
  const s = statusBadgeStyles[status] || statusBadgeStyles.pending
  return (
    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  )
}

function InstrumentCard({ value, label, unit, color, borderColor }) {
  return (
    <div className="rounded-xl p-5 relative overflow-hidden"
      style={{ background: '#0E1525', borderTop: `2px solid ${borderColor || color}` }}>
      <p className="text-[11px] uppercase tracking-[0.1em] mb-2" style={{ color: '#4EADFF', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[32px] font-medium" style={{ color, fontFamily: "'DM Mono', monospace" }}>{value}</span>
        {unit && <span className="text-[13px]" style={{ color: '#4A566E', fontFamily: "'DM Mono', monospace" }}>{unit}</span>}
      </div>
    </div>
  )
}

export default function Home() {
  const { pilotProfile } = useAuth()
  const { primaryAircraft, activeRequests, completedRequests, loading, flightsThisYear, totalFuel, favoriteFBO, unreadNotifications } = usePilotPortal()
  const navigate = useNavigate()
  const [favFboName, setFavFboName] = useState('—')

  const firstName = pilotProfile?.first_name || pilotProfile?.display_name?.split(' ')[0] || 'Pilot'
  const certType = pilotProfile?.certificate_type || 'Private'

  useEffect(() => {
    if (favoriteFBO) {
      supabase.from('fbo_profiles').select('fbo_name').eq('id', favoriteFBO).single().then(({ data }) => {
        if (data) setFavFboName(data.fbo_name)
      })
    }
  }, [favoriteFBO])

  const recentCompleted = completedRequests.slice(0, 5)

  return (
    <div>
      {/* Hero Section */}
      <div className="rounded-2xl p-6 lg:p-10 mb-12 relative overflow-hidden"
        style={{
          background: '#080D18',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L40 0' stroke='%234EADFF' stroke-width='0.3' stroke-opacity='0.05'/%3E%3C/svg%3E")`,
        }}>
        {/* Subtle glow */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] -translate-x-1/4 -translate-y-1/4 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(78,173,255,0.06) 0%, transparent 70%)' }} />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 relative z-10">
          {/* Left: identity */}
          <div>
            <p className="text-[14px] mb-2" style={{ color: '#8B9AB0', fontFamily: "'DM Sans', sans-serif" }}>Welcome back, {firstName}</p>
            <p className="text-[48px] lg:text-[56px] leading-none mb-2" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
              {primaryAircraft?.tail_number || '—'}
            </p>
            <p className="text-[20px] lg:text-[24px]" style={{ color: '#4A566E', fontFamily: "'DM Mono', monospace" }}>
              {pilotProfile?.home_airport || 'KSDL'}
            </p>
            <span className="inline-block mt-3 text-[11px] font-semibold px-3 py-1 rounded-full"
              style={{ background: '#052E16', color: '#4ADE80', border: '1px solid #166534' }}>
              {certType} Pilot
            </span>
          </div>

          {/* Right: instrument grid */}
          <div className="grid grid-cols-2 gap-3 lg:gap-4 w-full lg:w-auto lg:min-w-[420px]">
            <InstrumentCard value={flightsThisYear} label="Flights This Year" color="#4EADFF" borderColor="#4EADFF" />
            <InstrumentCard value={favFboName === '—' ? '—' : favFboName.split(' ')[0]} label="Favorite FBO" color="#4ADE80" borderColor="#1D9E75" />
            <InstrumentCard value={totalFuel > 0 ? totalFuel.toLocaleString() : '0'} unit="gal" label="Total Fuel" color="#FCD34D" borderColor="#854D0E" />
            <InstrumentCard value={activeRequests.length} label="Active Requests" color="#E8EDF7" borderColor="#4A566E" />
          </div>
        </div>
      </div>

      {/* Active Requests */}
      <div className="mb-12">
        <p className="text-[13px] uppercase tracking-[0.1em] font-medium mb-4" style={{ color: '#4EADFF', fontFamily: "'DM Sans', sans-serif" }}>
          Active Requests
        </p>
        {activeRequests.length > 0 ? (
          <div className="space-y-4">
            {activeRequests.map(req => (
              <button key={req.id} onClick={() => navigate(`/pilot/request/${req.id}`)}
                className="w-full rounded-xl p-5 border-none cursor-pointer text-left transition-all"
                style={{
                  background: 'rgba(78,173,255,0.05)',
                  borderLeft: '3px solid #4EADFF',
                }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[24px] font-medium" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>{req.airport_icao}</span>
                  <StatusBadge status={req.status} />
                </div>
                <div className="flex items-center gap-4 text-[13px]" style={{ color: '#8B9AB0' }}>
                  <span>ETA <span className="font-medium" style={{ fontFamily: "'DM Mono', monospace", color: '#E8EDF7' }}>{req.eta}</span></span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: '#E8EDF7' }}>{req.tail_number}</span>
                  {req.services?.length > 0 && <span>{req.services.length} services</span>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => navigate('/pilot/request/new')}
            className="w-full rounded-xl p-6 border-none cursor-pointer flex items-center justify-between transition-all"
            style={{ background: 'rgba(78,173,255,0.05)', borderLeft: '3px solid #4EADFF' }}>
            <div>
              <p className="text-[15px] font-medium" style={{ color: '#4EADFF' }}>Plan your next arrival</p>
              <p className="text-[13px] mt-1" style={{ color: '#4A566E' }}>Search FBOs and request services</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4EADFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <p className="text-[13px] uppercase tracking-[0.1em] font-medium mb-4" style={{ color: '#4EADFF', fontFamily: "'DM Sans', sans-serif" }}>
          Recent Activity
        </p>
        {loading.requests ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: '#162033' }} />)}</div>
        ) : recentCompleted.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: '#0E1525', border: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[14px]" style={{ color: '#4A566E' }}>No flights yet — your history will appear here after your first request.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCompleted.map(req => {
              const s = statusBadgeStyles[req.status] || statusBadgeStyles.completed
              return (
                <button key={req.id} onClick={() => navigate(`/pilot/request/${req.id}`)}
                  className="w-full rounded-xl px-5 py-4 border-none cursor-pointer text-left flex items-center justify-between transition-all"
                  style={{ background: '#0E1525', borderLeft: `3px solid ${s.color}40` }}>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[16px] font-medium" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>{req.airport_icao}</span>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-[12px]" style={{ color: '#4A566E' }}>
                      {new Date(req.created_at).toLocaleDateString()} · <span style={{ fontFamily: "'DM Mono', monospace" }}>{req.tail_number}</span>
                      {req.services?.length > 0 && ` · ${req.services.join(', ')}`}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A566E" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
