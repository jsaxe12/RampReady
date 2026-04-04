import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePilotPortal } from '../PilotContext'
import { supabase } from '../../lib/supabase'

const SERVICE_OPTIONS = [
  'Fuel (100LL Avgas)', 'Fuel (Jet-A)', 'Ramp parking', 'Hangar overnight',
  'Crew car', 'GPU / Ground power', 'Lav service', 'De-icing', 'Catering', 'Other',
]

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
  const { requests, editRequest, cancelRequest } = usePilotPortal()
  const [fboName, setFboName] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})

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

  const startEdit = () => {
    const etaParts = (req.eta || '').split(' ')
    setEditForm({
      tail_number: req.tail_number || '',
      aircraft_type: req.aircraft_type || '',
      eta_date: etaParts[0] || '',
      eta_time: etaParts[1] || '',
      pax_count: req.pax_count || 0,
      services: [...(req.services || [])],
      fuel_type: req.fuel_type || null,
      fuel_quantity: req.fuel_quantity || null,
      pilot_notes: req.pilot_notes || '',
    })
    setEditing(true)
  }

  const handleSaveEdit = () => {
    const eta = `${editForm.eta_date} ${editForm.eta_time}`.trim()
    const hasFuel = editForm.services.some(s => s.startsWith('Fuel'))
    const fuelType = editForm.services.includes('Fuel (Jet-A)') ? 'Jet-A' : editForm.services.includes('Fuel (100LL Avgas)') ? 'Avgas' : null
    editRequest(req.id, {
      tail_number: editForm.tail_number,
      aircraft_type: editForm.aircraft_type,
      eta,
      pax_count: editForm.pax_count,
      services: editForm.services,
      fuel_type: fuelType,
      fuel_quantity: hasFuel ? editForm.fuel_quantity : null,
      pilot_notes: editForm.pilot_notes,
    })
    setEditing(false)
  }

  const toggleService = (s) => {
    setEditForm(f => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter(x => x !== s) : [...f.services, s],
    }))
  }

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
            {isActive && !editing && (
              <button onClick={startEdit}
                className="h-12 px-5 rounded-lg border-none cursor-pointer text-[13px] font-semibold flex items-center gap-2 transition-all"
                style={{ background: 'rgba(78,173,255,0.08)', color: '#4EADFF', border: '1px solid rgba(78,173,255,0.15)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
            )}
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

          {/* Request details / Edit form */}
          <div className="rounded-xl p-6" style={{ background: '#0E1525' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] uppercase tracking-[0.1em] font-medium" style={{ color: '#4EADFF' }}>
                {editing ? 'Edit Request' : 'Request Details'}
              </p>
              {req.edited_at && !editing && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(78,173,255,0.08)', color: '#4EADFF' }}>
                  Edited by {req.edited_by}
                </span>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Tail Number</label>
                  <input type="text" value={editForm.tail_number} onChange={e => setEditForm(f => ({ ...f, tail_number: e.target.value.toUpperCase() }))}
                    className="w-full h-10 rounded-lg px-3 text-[14px] border-none outline-none" style={{ background: '#080D18', color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }} />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Aircraft Type</label>
                  <input type="text" value={editForm.aircraft_type} onChange={e => setEditForm(f => ({ ...f, aircraft_type: e.target.value }))}
                    className="w-full h-10 rounded-lg px-3 text-[14px] border-none outline-none" style={{ background: '#080D18', color: '#E8EDF7' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>ETA Date</label>
                    <input type="date" value={editForm.eta_date} onChange={e => setEditForm(f => ({ ...f, eta_date: e.target.value }))}
                      className="w-full h-10 rounded-lg px-3 text-[14px] border-none outline-none" style={{ background: '#080D18', color: '#E8EDF7', colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>ETA Time</label>
                    <input type="time" value={editForm.eta_time} onChange={e => setEditForm(f => ({ ...f, eta_time: e.target.value }))}
                      className="w-full h-10 rounded-lg px-3 text-[14px] border-none outline-none" style={{ background: '#080D18', color: '#E8EDF7', colorScheme: 'dark' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Passengers</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditForm(f => ({ ...f, pax_count: Math.max(0, f.pax_count - 1) }))}
                      className="w-10 h-10 rounded-lg border-none cursor-pointer text-[18px] font-bold" style={{ background: '#080D18', color: '#4EADFF' }}>−</button>
                    <span className="text-[18px] font-semibold w-8 text-center" style={{ color: '#E8EDF7' }}>{editForm.pax_count}</span>
                    <button onClick={() => setEditForm(f => ({ ...f, pax_count: Math.min(20, f.pax_count + 1) }))}
                      className="w-10 h-10 rounded-lg border-none cursor-pointer text-[18px] font-bold" style={{ background: '#080D18', color: '#4EADFF' }}>+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Services</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SERVICE_OPTIONS.map(s => (
                      <button key={s} onClick={() => toggleService(s)}
                        className="h-8 px-3 rounded-lg text-[11px] font-medium border-none cursor-pointer transition-all"
                        style={{
                          background: editForm.services.includes(s) ? 'rgba(78,173,255,0.15)' : '#080D18',
                          color: editForm.services.includes(s) ? '#4EADFF' : '#4A566E',
                          border: editForm.services.includes(s) ? '1px solid rgba(78,173,255,0.3)' : '1px solid transparent',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {editForm.services.some(s => s.startsWith('Fuel')) && (
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Fuel Quantity (gallons)</label>
                    <input type="number" value={editForm.fuel_quantity || ''} onChange={e => setEditForm(f => ({ ...f, fuel_quantity: parseInt(e.target.value) || null }))}
                      placeholder="Gallons needed"
                      className="w-full h-10 rounded-lg px-3 text-[14px] border-none outline-none" style={{ background: '#080D18', color: '#E8EDF7' }} />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: '#4A566E' }}>Notes</label>
                  <textarea value={editForm.pilot_notes} onChange={e => setEditForm(f => ({ ...f, pilot_notes: e.target.value.slice(0, 500) }))}
                    rows={3} placeholder="Notes for FBO..."
                    className="w-full rounded-lg px-3 py-2 text-[13px] border-none outline-none resize-none" style={{ background: '#080D18', color: '#E8EDF7' }} />
                  <p className="text-[10px] text-right mt-0.5" style={{ color: '#4A566E' }}>{editForm.pilot_notes.length}/500</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditing(false)} className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold" style={{ background: '#1a2540', color: '#8B9AB0' }}>
                    Cancel
                  </button>
                  <button onClick={handleSaveEdit}
                    className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold"
                    style={{ background: '#4EADFF', color: '#080D18' }}>
                    Save Changes
                  </button>
                </div>
                <p className="text-[10px] text-center" style={{ color: '#4A566E' }}>Saving will reset status to pending — FBO must re-confirm</p>
              </div>
            ) : (
              <>
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
              </>
            )}
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
