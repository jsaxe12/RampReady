import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFBOSafe } from '../context/FBOContext'
import { LogoMark } from './Logo'

function NotificationBell({ notifications, unreadCount, onMarkAllRead, onMarkRead }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative h-7 w-7 flex items-center justify-center bg-surface-700 hover:bg-surface-600 rounded-md cursor-pointer border-none text-text-tertiary hover:text-text-primary"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 bg-surface-800 rounded-lg ring-1 ring-border shadow-xl z-[60] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-[12px] font-semibold text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-[10px] text-sky hover:underline bg-transparent border-none cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-[12px] text-text-tertiary text-center py-6">No notifications</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.read) onMarkRead(n.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/50 cursor-pointer bg-transparent border-x-0 border-t-0 hover:bg-surface-700 ${
                    !n.read ? 'bg-sky/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-sky shrink-0 mt-1.5" />}
                    <div className={!n.read ? '' : 'ml-3.5'}>
                      <p className="text-[12px] font-medium text-text-primary leading-tight">{n.title}</p>
                      <p className="text-[11px] text-text-tertiary leading-snug mt-0.5">{n.body}</p>
                      <p className="text-[9px] text-text-tertiary mt-1">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, role, fboProfile, pilotProfile, logout } = useAuth()
  const navigate = useNavigate()
  const fboCtx = useFBOSafe()

  const handleLogout = () => {
    navigate('/', { replace: true })
    logout()
  }

  const linkClass = ({ isActive }) =>
    `relative px-3 py-1.5 text-[13px] font-medium rounded-md transition-all ${
      isActive
        ? 'bg-sky-muted text-sky'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-600'
    }`

  const isPilot = role === 'pilot'
  const displayName = isPilot
    ? (pilotProfile?.display_name || user?.email)
    : (fboProfile?.fbo_name || user?.email)

  return (
    <nav className="h-12 bg-surface-800 border-b border-border px-5 flex items-center justify-between sticky top-0 z-50">
      {/* Left: Brand + Identifier */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="text-[15px] font-bold text-text-primary tracking-tight">
            Ramp<span className="text-sky">Ready</span>
          </span>
        </div>

        {!isPilot && fboProfile && (
          <div className="hidden sm:flex items-center gap-2 bg-surface-900/60 rounded-md px-2.5 py-1">
            <span className="text-[12px] font-semibold text-text-primary">{fboProfile.fbo_name}</span>
            <span className="w-px h-3 bg-border" />
            <span className="font-mono text-[13px] font-bold text-sky tracking-wide">{fboProfile.airport_icao}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-good ml-0.5" />
          </div>
        )}

        {isPilot && pilotProfile && (
          <div className="hidden sm:flex items-center gap-2 bg-surface-900/60 rounded-md px-2.5 py-1">
            <span className="text-[12px] font-semibold text-text-primary">{pilotProfile.display_name}</span>
            {pilotProfile.home_airport && (
              <>
                <span className="w-px h-3 bg-border" />
                <span className="font-mono text-[13px] font-bold text-good tracking-wide">{pilotProfile.home_airport}</span>
              </>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-good ml-0.5" />
          </div>
        )}
      </div>

      {/* Right: Navigation + User */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1">
          {isPilot ? (
            <NavLink to="/pilot" className={linkClass}>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                </svg>
                <span className="hidden sm:inline">My Flights</span>
                <span className="sm:hidden">Flights</span>
              </span>
            </NavLink>
          ) : (
            <>
              <NavLink to="/dashboard" className={linkClass}>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                  <span className="hidden sm:inline">Ops Desk</span>
                  <span className="sm:hidden">Ops</span>
                </span>
              </NavLink>
              <NavLink to="/linecrew" className={linkClass}>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span className="hidden sm:inline">Line Crew</span>
                  <span className="sm:hidden">Line</span>
                </span>
              </NavLink>
            </>
          )}
        </div>

        {user && (
          <>
            <div className="w-px h-5 bg-border" />

            {/* Notification bell (FBO only — context available on FBO routes) */}
            {fboCtx && (
              <NotificationBell
                notifications={fboCtx.notifications}
                unreadCount={fboCtx.unreadNotifications}
                onMarkAllRead={fboCtx.markAllNotificationsRead}
                onMarkRead={fboCtx.markNotificationRead}
              />
            )}

            <div className="hidden md:flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isPilot ? 'bg-good-muted' : 'bg-sky-muted'}`}>
                <span className={`text-[11px] font-bold ${isPilot ? 'text-good' : 'text-sky'}`}>
                  {(user.email || '').substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-text-primary font-medium leading-tight">{displayName}</p>
                <p className="text-[10px] text-text-tertiary leading-tight">{isPilot ? 'Pilot' : 'FBO'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="h-7 px-2.5 bg-surface-700 hover:bg-danger-muted hover:text-danger text-text-tertiary text-[11px] font-medium rounded-md cursor-pointer border-none flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
