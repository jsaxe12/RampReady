import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePilotPortal } from '../PilotContext'
import { supabase } from '../../lib/supabase'

function TimelineStep({ label, done, active, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${active ? 'animate-pulse' : ''}`}
          style={{ background: done ? '#1D9E7520' : active ? '#FCD34D20' : '#1a2540', border: `2px solid ${done ? '#1D9E75' : active ? '#FCD34D' : '#2a3550'}` }}>
          {done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
        </div>
        {!isLast && <div className="w-0.5 h-8" style={{ background: done ? '#1D9E7540' : '#1a2540' }} />}
      </div>
      <p className="text-[13px] pt-0.5" style={{ color: done ? '#1D9E75' : active ? '#FCD34D' : '#4A566E' }}>{label}</p>
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
      <div className="px-4 pt-5">
        <button onClick={() => navigate('/pilot')} className="flex items-center gap-1 mb-4 bg-transparent border-none cursor-pointer" style={{ color: '#4A566E' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          <span className="text-[12px]">Home</span>
        </button>
        <div className="rounded-xl p-8 text-center" style={{ background: '#0E1525' }}>
          <p style={{ color: '#4A566E' }}>Request not found</p>
        </div>
      </div>
    )
  }

  const isActive = ['pending', 'confirmed'].includes(req.status)
  const isConfirmed = req.status === 'confirmed'
  const isDeclined = req.status === 'declined'

  // Simulated position data
  const dist = Math.floor(Math.random() * 150 + 30)
  const alt = `FL${Math.floor(Math.random() * 300 + 50)}`
  const gs = Math.floor(Math.random() * 200 + 120)

  return (
    <div className="px-4 pt-5">
      <button onClick={() => navigate('/pilot')} className="flex items-center gap-1 mb-3 bg-transparent border-none cursor-pointer" style={{ color: '#4A566E' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        <span className="text-[12px]">Home</span>
      </button>

      {/* Header */}
      <div className="mb-4">
        <p className="text-[13px]" style={{ color: '#8899b0' }}>Request sent to {fboName}</p>
        <p className="text-[28px] font-bold font-mono" style={{ color: '#4EADFF' }}>{req.airport_icao}</p>
        <p className="text-[11px]" style={{ color: '#4A566E' }}>Sent {new Date(req.created_at).toLocaleString()}</p>
      </div>

      {/* Timeline */}
      <div className="rounded-xl p-4 mb-4" style={{ background: '#0E1525' }}>
        <TimelineStep label="Request sent" done={true} />
        <TimelineStep label="FBO viewing" done={isConfirmed || isDeclined} active={req.status === 'pending'} />
        <TimelineStep label={isDeclined ? 'Request declined' : 'Response received'} done={isConfirmed} active={isDeclined} />
        <TimelineStep label="Ready on arrival" done={isConfirmed} isLast />
      </div>

      {/* FBO Response */}
      {isConfirmed && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#0E1525', border: '1px solid #1D9E7530' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#1D9E7520', color: '#1D9E75' }}>Confirmed</span>
          </div>
          {req.fbo_response_notes && <p className="text-[12px]" style={{ color: '#8899b0' }}>{req.fbo_response_notes}</p>}
        </div>
      )}

      {isDeclined && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#0E1525', border: '1px solid #ef444430' }}>
          <p className="text-[12px] font-semibold mb-2" style={{ color: '#ef4444' }}>Unable to fulfill this request</p>
          <button onClick={() => navigate(`/pilot/airport/${req.airport_icao}`)}
            className="h-9 px-4 rounded-lg border-none cursor-pointer text-[12px] font-semibold" style={{ background: '#4EADFF', color: '#0A0F1E' }}>
            Find another FBO →
          </button>
        </div>
      )}

      {/* Position card */}
      {isActive && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#0E1525' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: '#4A566E' }}>Your Position</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-[16px] font-bold font-mono" style={{ color: '#E8EDF7' }}>{dist} NM</p><p className="text-[9px]" style={{ color: '#4A566E' }}>Distance</p></div>
            <div><p className="text-[16px] font-bold font-mono" style={{ color: '#E8EDF7' }}>{alt}</p><p className="text-[9px]" style={{ color: '#4A566E' }}>Altitude</p></div>
            <div><p className="text-[16px] font-bold font-mono" style={{ color: '#E8EDF7' }}>{gs} kt</p><p className="text-[9px]" style={{ color: '#4A566E' }}>GS</p></div>
          </div>
          <p className="text-[9px] text-center mt-2" style={{ color: '#4A566E' }}>Position data is approximate</p>
        </div>
      )}

      {/* Request summary */}
      <details className="mb-4">
        <summary className="text-[12px] font-semibold cursor-pointer list-none flex items-center gap-1" style={{ color: '#4A566E' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          Request Details
        </summary>
        <div className="rounded-xl p-4 mt-2 space-y-1.5 text-[12px]" style={{ background: '#0E1525', color: '#8899b0' }}>
          <div className="flex justify-between"><span>Tail</span><span className="font-mono" style={{ color: '#E8EDF7' }}>{req.tail_number}</span></div>
          <div className="flex justify-between"><span>Aircraft</span><span style={{ color: '#E8EDF7' }}>{req.aircraft_type}</span></div>
          <div className="flex justify-between"><span>ETA</span><span className="font-mono" style={{ color: '#E8EDF7' }}>{req.eta}</span></div>
          <div className="flex justify-between"><span>Pax</span><span style={{ color: '#E8EDF7' }}>{req.pax_count}</span></div>
          {req.fuel_quantity && <div className="flex justify-between"><span>Fuel</span><span className="font-mono" style={{ color: '#E8EDF7' }}>{req.fuel_quantity} gal</span></div>}
          {req.services?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{req.services.map(s => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#1a2540' }}>{s}</span>)}</div>}
          {req.pilot_notes && <p className="pt-1" style={{ borderTop: '1px solid #1a2540' }}>"{req.pilot_notes}"</p>}
        </div>
      </details>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => navigate(`/pilot/messages/${req.id}`)}
          className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[12px] font-semibold flex items-center justify-center gap-1.5"
          style={{ background: '#4EADFF20', color: '#4EADFF' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          Message FBO
        </button>
        {isActive && (
          <button onClick={() => setShowCancel(true)}
            className="h-10 px-4 rounded-lg border-none cursor-pointer text-[12px] font-semibold"
            style={{ background: '#ef444415', color: '#ef4444' }}>
            Cancel
          </button>
        )}
      </div>

      {/* Cancel confirm */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-xl p-5" style={{ background: '#0E1525' }}>
            <p className="text-[15px] font-semibold mb-2" style={{ color: '#E8EDF7' }}>Cancel this request?</p>
            <p className="text-[12px] mb-4" style={{ color: '#4A566E' }}>This cannot be undone. The FBO will be notified.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowCancel(false)} className="flex-1 h-9 rounded-lg border-none cursor-pointer text-[12px] font-semibold" style={{ background: '#1a2540', color: '#8899b0' }}>
                Keep Request
              </button>
              <button onClick={() => { cancelRequest(req.id); setShowCancel(false) }} className="flex-1 h-9 rounded-lg border-none cursor-pointer text-[12px] font-semibold" style={{ background: '#ef4444', color: 'white' }}>
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
