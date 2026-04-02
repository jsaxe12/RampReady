import { useNavigate } from 'react-router-dom'
import { usePilotPortal } from '../PilotContext'

const ICONS = {
  request_confirmed: { icon: '✓', bg: '#1D9E7520', color: '#1D9E75' },
  request_declined: { icon: '✕', bg: '#ef444420', color: '#ef4444' },
  message: { icon: '💬', bg: '#4EADFF20', color: '#4EADFF' },
  fuel_price: { icon: '⛽', bg: '#FCD34D20', color: '#FCD34D' },
  default: { icon: '•', bg: '#4A566E20', color: '#4A566E' },
}

export default function Notifications() {
  const navigate = useNavigate()
  const { notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead } = usePilotPortal()

  const handleTap = async (notif) => {
    if (!notif.read) await markNotificationRead(notif.id)
    if (notif.request_id) navigate(`/pilot/request/${notif.request_id}`)
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
    <div className="px-4 pt-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/pilot')} className="bg-transparent border-none cursor-pointer" style={{ color: '#4A566E' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-[18px] font-bold" style={{ color: '#E8EDF7' }}>Notifications</h1>
          {unreadNotifications > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#4EADFF', color: '#0A0F1E' }}>{unreadNotifications}</span>
          )}
        </div>
        {unreadNotifications > 0 && (
          <button onClick={markAllNotificationsRead} className="text-[11px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: '#4EADFF' }}>
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: '#0E1525' }}>
          <p className="text-[14px] font-medium mb-1" style={{ color: '#E8EDF7' }}>All clear</p>
          <p className="text-[12px]" style={{ color: '#4A566E' }}>You'll be notified when FBOs respond to your requests.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map(n => {
            const s = getStyle(n.type)
            return (
              <button key={n.id} onClick={() => handleTap(n)}
                className="w-full rounded-xl px-4 py-3 border-none cursor-pointer text-left flex items-start gap-3"
                style={{ background: n.read ? '#0E1525' : '#0E152599', borderLeft: n.read ? 'none' : '3px solid #4EADFF' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[14px]"
                  style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] leading-snug" style={{ color: n.read ? '#8899b0' : '#E8EDF7' }}>{n.title}</p>
                  {n.body && <p className="text-[11px] mt-0.5 truncate" style={{ color: '#4A566E' }}>{n.body}</p>}
                  <p className="text-[9px] mt-1" style={{ color: '#4A566E' }}>{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: '#4EADFF' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
