import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePilotPortal } from '../PilotContext'

const FUEL_TYPES = ['Avgas', 'Jet-A']
const CERT_TYPES = ['Private', 'Instrument', 'Commercial', 'ATP']

export default function Profile() {
  const navigate = useNavigate()
  const { user, pilotProfile, logout } = useAuth()
  const { aircraft, addAircraft, deleteAircraft, updateProfile } = usePilotPortal()

  const [showAddAircraft, setShowAddAircraft] = useState(false)
  const [newAc, setNewAc] = useState({ tailNumber: '', makeModel: '', fuelType: 'Avgas', isPrimary: false })
  const [saving, setSaving] = useState(false)
  const [editSection, setEditSection] = useState(null)
  const [editFields, setEditFields] = useState({})
  const [showSignOut, setShowSignOut] = useState(false)

  const handleAddAircraft = async () => {
    if (!newAc.tailNumber.trim() || !newAc.makeModel.trim()) return
    setSaving(true)
    await addAircraft(newAc)
    setNewAc({ tailNumber: '', makeModel: '', fuelType: 'Avgas', isPrimary: false })
    setShowAddAircraft(false)
    setSaving(false)
  }

  const handleEditProfile = (section) => {
    setEditSection(section)
    if (section === 'personal') {
      setEditFields({ first_name: pilotProfile?.first_name || '', last_name: pilotProfile?.last_name || '', phone: pilotProfile?.phone || '' })
    } else if (section === 'certificate') {
      setEditFields({ certificate_type: pilotProfile?.certificate_type || 'Private', certificate_number: pilotProfile?.certificate_number || '' })
    } else if (section === 'preferences') {
      setEditFields({ default_fuel_quantity: pilotProfile?.default_fuel_quantity || '', push_notifications: pilotProfile?.push_notifications ?? true, email_notifications: pilotProfile?.email_notifications ?? true })
    }
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    await updateProfile(editFields)
    setEditSection(null)
    setSaving(false)
  }

  const handleSignOut = () => { navigate('/'); logout() }

  const inputStyle = 'w-full h-10 rounded-lg px-4 text-[13px] border-none outline-none'
  const inputBg = { background: '#1a2540', color: '#E8EDF7', caretColor: '#4EADFF' }

  return (
    <div className="max-w-[640px]">
      <h1 className="text-[32px] mb-8" style={{ color: '#E8EDF7', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>Profile</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-[24px] font-bold"
          style={{ background: 'rgba(78,173,255,0.1)', color: '#4EADFF', border: '2px solid rgba(78,173,255,0.2)' }}>
          {(pilotProfile?.first_name?.[0] || user?.email?.[0] || 'P').toUpperCase()}
        </div>
        <div>
          <p className="text-[16px] font-semibold" style={{ color: '#E8EDF7' }}>
            {pilotProfile?.first_name ? `${pilotProfile.first_name} ${pilotProfile.last_name || ''}`.trim() : pilotProfile?.display_name || 'Pilot'}
          </p>
          <p className="text-[13px]" style={{ color: '#4A566E' }}>{user?.email}</p>
          {pilotProfile?.certificate_type && (
            <span className="inline-block mt-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: '#052E16', color: '#4ADE80', border: '1px solid #166534' }}>
              {pilotProfile.certificate_type} Pilot
            </span>
          )}
        </div>
      </div>

      {/* Sections */}
      <Section title="Personal Information" onEdit={() => handleEditProfile('personal')}>
        {editSection === 'personal' ? (
          <div className="space-y-3">
            <Input label="First Name" value={editFields.first_name} onChange={v => setEditFields(p => ({ ...p, first_name: v }))} />
            <Input label="Last Name" value={editFields.last_name} onChange={v => setEditFields(p => ({ ...p, last_name: v }))} />
            <Input label="Phone" value={editFields.phone} onChange={v => setEditFields(p => ({ ...p, phone: v }))} />
            <EditButtons onCancel={() => setEditSection(null)} onSave={handleSaveEdit} saving={saving} />
          </div>
        ) : (
          <div className="space-y-2 text-[13px]">
            <Row label="Name" value={pilotProfile?.first_name ? `${pilotProfile.first_name} ${pilotProfile.last_name || ''}`.trim() : '—'} />
            <Row label="Email" value={user?.email} />
            <Row label="Phone" value={pilotProfile?.phone || '—'} />
          </div>
        )}
      </Section>

      <Section title="Certificate" onEdit={() => handleEditProfile('certificate')}>
        {editSection === 'certificate' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] mb-1.5" style={{ color: '#4A566E' }}>Type</label>
              <select value={editFields.certificate_type} onChange={e => setEditFields(p => ({ ...p, certificate_type: e.target.value }))}
                className={inputStyle} style={{ ...inputBg, appearance: 'none', cursor: 'pointer' }}>
                {CERT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Certificate Number" value={editFields.certificate_number} onChange={v => setEditFields(p => ({ ...p, certificate_number: v }))} />
            <EditButtons onCancel={() => setEditSection(null)} onSave={handleSaveEdit} saving={saving} />
          </div>
        ) : (
          <div className="space-y-2 text-[13px]">
            <Row label="Type" value={pilotProfile?.certificate_type || '—'} />
            <Row label="Number" value={pilotProfile?.certificate_number || '—'} />
          </div>
        )}
      </Section>

      {/* Aircraft */}
      <div className="rounded-xl p-5 mb-4" style={{ background: '#0E1525', border: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] uppercase tracking-[0.1em] font-medium" style={{ color: '#4EADFF' }}>Aircraft</p>
          <button onClick={() => setShowAddAircraft(true)} className="text-[12px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: '#4EADFF' }}>+ Add</button>
        </div>
        {aircraft.length === 0 ? (
          <p className="text-[13px]" style={{ color: '#4A566E' }}>No aircraft added yet.</p>
        ) : (
          <div className="space-y-2">
            {aircraft.map(ac => (
              <div key={ac.id} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: '#1a2540' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium" style={{ color: '#E8EDF7', fontFamily: "'DM Mono', monospace" }}>{ac.tail_number}</span>
                    {ac.is_primary && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(78,173,255,0.1)', color: '#4EADFF' }}>PRIMARY</span>}
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: '#4A566E' }}>{ac.make_model} · {ac.fuel_type}</p>
                </div>
                <button onClick={() => deleteAircraft(ac.id)} className="bg-transparent border-none cursor-pointer" style={{ color: '#EF4444' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Section title="Preferences" onEdit={() => handleEditProfile('preferences')}>
        {editSection === 'preferences' ? (
          <div className="space-y-3">
            <Input label="Default Fuel (gal)" value={editFields.default_fuel_quantity} onChange={v => setEditFields(p => ({ ...p, default_fuel_quantity: v }))} type="number" />
            <Toggle label="Push Notifications" value={editFields.push_notifications} onChange={v => setEditFields(p => ({ ...p, push_notifications: v }))} />
            <Toggle label="Email Notifications" value={editFields.email_notifications} onChange={v => setEditFields(p => ({ ...p, email_notifications: v }))} />
            <EditButtons onCancel={() => setEditSection(null)} onSave={handleSaveEdit} saving={saving} />
          </div>
        ) : (
          <div className="space-y-2 text-[13px]">
            <Row label="Default Fuel" value={pilotProfile?.default_fuel_quantity ? `${pilotProfile.default_fuel_quantity} gal` : '—'} />
            <Row label="Push Notifications" value={pilotProfile?.push_notifications !== false ? 'On' : 'Off'} />
            <Row label="Email Notifications" value={pilotProfile?.email_notifications !== false ? 'On' : 'Off'} />
          </div>
        )}
      </Section>

      {/* Sign out — hidden on desktop (sidebar has it), shown on mobile */}
      <button onClick={() => setShowSignOut(true)}
        className="lg:hidden w-full h-12 rounded-xl border-none cursor-pointer text-[14px] font-semibold mb-8"
        style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
        Sign Out
      </button>

      {/* Add Aircraft Modal */}
      {showAddAircraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-xl p-6" style={{ background: '#0E1525' }}>
            <p className="text-[16px] font-semibold mb-4" style={{ color: '#E8EDF7' }}>Add Aircraft</p>
            <div className="space-y-3 mb-5">
              <Input label="Tail Number" value={newAc.tailNumber} onChange={v => setNewAc(p => ({ ...p, tailNumber: v.toUpperCase() }))} placeholder="N12345" />
              <Input label="Make & Model" value={newAc.makeModel} onChange={v => setNewAc(p => ({ ...p, makeModel: v }))} placeholder="Cessna 172" />
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] mb-1.5" style={{ color: '#4A566E' }}>Fuel Type</label>
                <div className="flex gap-2">
                  {FUEL_TYPES.map(t => (
                    <button key={t} onClick={() => setNewAc(p => ({ ...p, fuelType: t }))}
                      className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[13px] font-medium"
                      style={{ background: newAc.fuelType === t ? 'rgba(78,173,255,0.15)' : '#1a2540', color: newAc.fuelType === t ? '#4EADFF' : '#4A566E', border: newAc.fuelType === t ? '1px solid rgba(78,173,255,0.3)' : '1px solid transparent' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle label="Set as primary aircraft" value={newAc.isPrimary} onChange={v => setNewAc(p => ({ ...p, isPrimary: v }))} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddAircraft(false)} className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold" style={{ background: '#1a2540', color: '#8B9AB0' }}>Cancel</button>
              <button onClick={handleAddAircraft} disabled={saving || !newAc.tailNumber.trim() || !newAc.makeModel.trim()}
                className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold disabled:opacity-40"
                style={{ background: '#4EADFF', color: '#080D18' }}>
                {saving ? 'Adding...' : 'Add Aircraft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirm */}
      {showSignOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-xl p-6" style={{ background: '#0E1525' }}>
            <p className="text-[16px] font-semibold mb-2" style={{ color: '#E8EDF7' }}>Sign out?</p>
            <p className="text-[13px] mb-5" style={{ color: '#4A566E' }}>You'll need to log in again to access your pilot portal.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSignOut(false)} className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold" style={{ background: '#1a2540', color: '#8B9AB0' }}>Cancel</button>
              <button onClick={handleSignOut} className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold" style={{ background: '#EF4444', color: 'white' }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, onEdit, children }) {
  return (
    <div className="rounded-xl p-5 mb-4" style={{ background: '#0E1525', border: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] uppercase tracking-[0.1em] font-medium" style={{ color: '#4EADFF' }}>{title}</p>
        <button onClick={onEdit} className="text-[12px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: '#4EADFF' }}>Edit</button>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between"><span style={{ color: '#8B9AB0' }}>{label}</span><span style={{ color: '#E8EDF7' }}>{value}</span></div>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.08em] mb-1.5" style={{ color: '#4A566E' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-10 rounded-lg px-4 text-[13px] border-none outline-none"
        style={{ background: '#1a2540', color: '#E8EDF7', caretColor: '#4EADFF' }} />
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[13px]" style={{ color: '#8B9AB0' }}>{label}</span>
      <button onClick={() => onChange(!value)} className="w-11 h-6 rounded-full border-none cursor-pointer relative transition-colors"
        style={{ background: value ? '#4EADFF' : '#1a2540' }}>
        <div className="absolute top-1 w-4 h-4 rounded-full transition-all" style={{ background: '#E8EDF7', left: value ? '24px' : '4px' }} />
      </button>
    </div>
  )
}

function EditButtons({ onCancel, onSave, saving }) {
  return (
    <div className="flex gap-3 pt-2">
      <button onClick={onCancel} className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold" style={{ background: '#1a2540', color: '#8B9AB0' }}>Cancel</button>
      <button onClick={onSave} disabled={saving} className="flex-1 h-10 rounded-lg border-none cursor-pointer text-[13px] font-semibold" style={{ background: '#4EADFF', color: '#080D18' }}>{saving ? 'Saving...' : 'Save'}</button>
    </div>
  )
}
