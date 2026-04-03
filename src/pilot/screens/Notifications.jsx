import { useNavigate } from 'react-router-dom'
import { usePilotPortal } from '../PilotContext'

const ICONS = {
  request_confirmed: { icon: '✓', bg: '#052E16', color: '#4ADE80', border: '#166534' },
  request_declined:  { icon: '✕', bg: '#1C0A0A', color: '#F87171', border: '#7F1D1D' },
  message:           { icon: '💬', bg: 'rgba(78,173,255,0.08)', color: '#4EADFF', border: 'rgba(78,173,255,0.2)' },
  fuel_price:        { icon: '⛽', bg: '#1C1408', color: '#FCD34D', border: '#854D0E' },
  default:           { icon: '•', bg: 'rgba(74,86,110,0.1)', color: '#4A566E', border: 'rgba(74,86,110,0.2)' },
}

export default function Notifications() {
  const navigate = useNavigate()
  const { notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead } = usePilotPortal()

  const handleTap = async (notif) => {
    if (!notif.read) await markNotificationRead(notif.id)
    if (notif.related_request_id) navigate(`/pilot/request/${notif.related_request_id}`)
  }

  const getStyle = (type) => ICONS[type] || ICONS.default

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div className="max-w-[640px]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-[32px]" style={{ color: '#E8EDF7', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
            Notifications
          </h1>
          {unreadNotifications > 0 && (
            <span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#4EADFF', color: '#080D18' }}>
              {unreadNotifications}
            </span>
          )}
        </div>
        {unreadNotifications > 0 && (
          <button onClick={markAllNotificationsRead}
            className="text-[12px] font-semibold bg-transparent border-none cursor-pointer"
            style={{ color: '#4EADFF' }}>
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: '#0E1525', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-[28px]"
            style={{ background: 'rgba(78,173,255,0.06)', border: '2px solid rgba(78,173,255,0.1)' }}>
            🔔
          </div>
          <p className="text-[15px] font-medium mb-1" style={{ color: '#E8EDF7' }}>All clear</p>
          <p className="text-[13px]" style={{ color: '#4A566E' }}>You'll be notified when FBOs respond to your requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] uppercase tracking-[0.1em] font-medium" style={{ color: '#4EADFF' }}>Recent</p>
          {notifications.map(n => {
            const s = getStyle(n.type)
            return (
              <button key={n.id} onClick={() => handleTap(n)}
                className="w-full rounded-xl px-5 py-4 border-none cursor-pointer text-left flex items-start gap-4 transition-all"
                style={{
                  background: '#0E1525',
                  borderLeft: n.read ? '3px solid transparent' : `3px solid ${s.color}`,
                  border: n.read ? '0.5px solid rgba(255,255,255,0.06)' : undefined,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = n.read ? 'rgba(255,255,255,0.06)' : s.color}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[16px]"
                  style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] leading-snug font-medium" style={{ color: n.read ? '#8B9AB0' : '#E8EDF7' }}>{n.title}</p>
                  {n.body && <p className="text-[12px] mt-1 truncate" style={{ color: '#4A566E' }}>{n.body}</p>}
                  <p className="text-[10px] mt-1.5" style={{ color: '#4A566E', fontFamily: "'DM Mono', monospace" }}>{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-2" style={{ background: '#4EADFF' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
