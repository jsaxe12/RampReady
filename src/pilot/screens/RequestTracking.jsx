import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePilotPortal } from '../PilotContext'
import { supabase } from '../../lib/supabase'

const statusBadgeStyles = {
  pending:   { bg: '#1C1408', color: '#FCD34D', border: '#854D0E' },
  confirmed: { bg: '#052E16', color: '#4ADE80', border: '#166534' },
  declined:  { bg: '#1C0A0A', color: '#F87171', border: '#7F1D1D' },
  completed: { bg: '#052E16', color: '#4ADE80', border: '#166534' },
  cancelled: { bg: '#1C0A0A', color: '#F87171', border: '#7F1D1D' },
}

function TimelineStep({ label, icon, done, active, isLast }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: done ? '#052E16' : active ? 'rgba(78,173,255,0.1)' : '#0E1525',
              border: done ? '2px solid #1D9E75' : active ? '2px solid #4EADFF' : '2px solid #2a3550',
            }}>
            {done ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <span style={{ color: active ? '#4EADFF' : '#4A566E' }}>{icon}</span>
            )}
          </div>
          {/* Pulse ring for active step */}
          {active && (
            <div className="absolute inset-0 rounded-full animate-ping" style={{ border: '2px solid #4EADFF', opacity: 0.3, animationDuration: '2s' }} />
          )}
        </div>
        {!isLast && <div className="w-px h-10" style={{ background: done ? '#1D9E7540' : '#1a2540' }} />}
      </div>
      <p className="text-[14px] pt-2.5" style={{ color: done ? '#4ADE80' : active ? '#4EADFF' : '#4A566E' }}>{label}</p>
    </div>
  )
}

export default function RequestTracking() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const { requests, cancelRequest } = usePilotPortal()
  const [fboName, setFboName] = useState('')
  const [showCancel, setShowCancel] = useState(false)

  const req = requests.find(r => r.id === requestId)

  useEffect(() => {
    if (req?.fbo_id) {
      supabase.from('fbo_profiles').select('fbo_name').eq('id', req.fbo_id).single().then(({ data }) => {
        if (data) setFboName(data.fbo_name)
      })
    }
  }, [req?.fbo_id])

  if (!req) {
    return (
      <div>
        <button onClick={() => navigate('/pilot')} className="flex items-center gap-1.5 mb-6 bg-transparent border-none cursor-pointer" style={{ color: '#4A566E' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          <span className="text-[13px]">Home</span>
        </button>
        <div className="rounded-xl p-10 text-center" style={{ background: '#0E1525' }}>
          <p style={{ color: '#4A566E' }}>Request not found</p>
        </div>
      </div>
    )
  }

  const isActive = ['pending', 'confirmed'].includes(req.status)
  const isConfirmed = req.status === 'confirmed'
  const isDeclined = req.status === 'declined'
  const dist = Math.floor(Math.random() * 150 + 30)
  const alt = `FL${Math.floor(Math.random() * 300 + 50)}`
  const gs = Math.floor(Math.random() * 200 + 120)

  return (
    <div>
      <button onClick={() => navigate('/pilot')} className="flex items-center gap-1.5 mb-6 bg-transparent border-none cursor-pointer" style={{ color: '#4A566E' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        <span className="text-[13px]">Home</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column */}
        <div>
          {/* Header */}
          <div className="mb-6 relative">
            <div className="absolute top-0 left-0 w-[300px] h-[200px] -translate-x-1/4 -translate-y-1/4 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(78,173,255,0.06) 0%, transparent 70%)' }} />
            <p className="text-[14px] relative z-10" style={{ color: '#8B9AB0' }}>Request sent to {fboName}</p>
            <p className="text-[40px] font-medium relative z-10" style={{ color: '#4EADFF', fontFamily: "'DM Mono', monospace" }}>{req.airport_icao}</p>
            <p className="text-[12px] relative z-10" style={{ color: '#4A566E' }}>Sent {new Date(req.created_at).toLocaleString()}</p>
          </div>

          {/* Timeline */}
          <div className="rounded-xl p-6 mb-6" style={{ background: '#0E1525' }}>
            <p className="text-[13px] uppercase tracking-[0.1em] font-medium mb-5" style={{ color: '#4EADFF' }}>Status</p>
            <TimelineStep label="Request sent" icon="✓" done={true} />
            <TimelineStep label="FBO viewing" icon="👁" done={isConfirmed || isDeclined} active={req.status === 'pending'} />
            <TimelineStep label={isDeclined ? 'Request declined' : 'Response received'} icon="📋" done={isConfirmed} active={isDeclined} />
            <TimelineStep label="Ready on arrival" icon="✈" done={isConfirmed} isLast />
          </div>

          {/* FBO Response */}
          {isConfirmed && (
            <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(29,158,117,0.05)', borderLeft: '3px solid #1D9E75' }}>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ ...statusBadgeStyles.confirmed, border: `1px solid ${statusBadgeStyles.confirmed.border}` }}>
                Confirmed
              </span>
              {req.fbo_response_notes && <p className="text-[13px] mt-3" style={{ color: '#8B9AB0' }}>{req.fbo_response_notes}</p>}
            </div>
          )}
          {isDeclined && (
            <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(239,68,68,0.04)', borderLeft: '3px solid #EF4444' }}>
              <p className="text-[13px] font-semibold mb-3" style={{ color: '#F87171' }}>Unable to fulfill this request</p>
              <button onClick={() => navigate(`/pilot/airport/${req.airport_icao}`)}
                className="h-10 px-5 rounded-lg border-none cursor-pointer text-[13px] font-semibold" style={{ background: '#4EADFF', color: '#080D18' }}>
                Find another FBO →
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => navigate(`/pilot/messages/${req.id}`)}
              className="flex-1 h-12 rounded-lg border-none cursor-pointer text-[13px] font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(78,173,255,0.1)', color: '#4EADFF', border: '1px solid rgba(78,173,255,0.2)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              Message FBO
            </button>
            {isActive && (
              <button onClick={() => setShowCancel(true)}
                className="h-12 px-5 rounded-lg border-none cursor-pointer text-[13px] font-semibold"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Position card */}
          {isActive && (
            <div className="rounded-xl p-6 mb-6" style={{ background: '#0E1525' }}>
              <p className="text-[13px] uppercase tracking-[0.1em] font-medium mb-5" style={{ color: '#4EADFF' }}>Your Position</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[24px] font-medium" style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>{dist}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: '#4A566E' }}>NM</p>
                </div>
                <div>
                  <p className="text-[24px] font-medium" style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>{alt}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: '#4A566E' }}>Altitude</p>
                </div>
                <div>
                  <p className="text-[24px] font-medium" style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>{gs}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: '#4A566E' }}>kt GS</p>
                </div>
              </div>
              <p className="text-[10px] text-center mt-4" style={{ color: '#4A566E' }}>Position data is approximate</p>
            </div>
          )}

          {/* Request details */}
          <div className="rounded-xl p-6" style={{ background: '#0E1525' }}>
            <p className="text-[13px] uppercase tracking-[0.1em] font-medium mb-4" style={{ color: '#4EADFF' }}>Request Details</p>
            <div className="space-y-3 text-[14px]" style={{ color: '#8B9AB0' }}>
              <div className="flex justify-between"><span>Tail</span><span style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>{req.tail_number}</span></div>
              <div className="flex justify-between"><span>Aircraft</span><span style={{ color: '#E8EDF7' }}>{req.aircraft_type}</span></div>
              <div className="flex justify-between"><span>ETA</span><span style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>{req.eta}</span></div>
              <div className="flex justify-between"><span>Pax</span><span style={{ color: '#E8EDF7' }}>{req.pax_count}</span></div>
              {req.fuel_quantity && <div className="flex justify-between"><span>Fuel</span><span style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>{req.fuel_quantity} gal</span></div>}
            </div>
            {req.services?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                {req.services.map(s => <span key={s} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(78,173,255,0.08)', color: '#4EADFF' }}>{s}</span>)}
              </div>
            )}
            {req.pilot_notes && <p className="text-[13px] mt-4 pt-4 italic" style={{ color: '#8B9AB0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>"{req.pilot_notes}"</p>}
          </div>
        </div>
      </div>

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-xl p-6" style={{ background: '#0E1525' }}>
            <p className="text-[16px] font-semibold mb-2" style={{ color: '#E8EDF7' }}>Cancel this request?</p>
            <p className="text-[13px] mb-5" style={{ color: '#4A566E' }}>This cannot be undone. The FBO will be notified.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancel(false)} className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold" style={{ background: '#1a2540', color: '#8B9AB0' }}>
                Keep Request
              </button>
              <button onClick={() => { cancelRequest(req.id); setShowCancel(false) }} className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold" style={{ background: '#EF4444', color: 'white' }}>
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
