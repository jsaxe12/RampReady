import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePilotPortal } from './PilotContext'

const navItems = [
  { to: '/pilot', label: 'Home', end: true, icon: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /> },
  { to: '/pilot/search', label: 'Search FBOs', icon: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></> },
  { to: '/pilot/request/new', label: 'New Request', icon: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></> },
  { to: '/pilot/history', label: 'My Requests', icon: <><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></> },
  { to: '/pilot/messages', label: 'Messages', icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /> },
  { to: '/pilot/notifications', label: 'Notifications', icon: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></> },
  { to: '/pilot/profile', label: 'Profile', icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
]

const mobileItems = [
  { to: '/pilot', label: 'Home', end: true, icon: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /> },
  { to: '/pilot/search', label: 'Search', icon: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></> },
  { to: '/pilot/request/new', label: 'Request', isCenter: true, icon: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></> },
  { to: '/pilot/messages', label: 'Messages', icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /> },
  { to: '/pilot/profile', label: 'Profile', icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
]

export default function PilotLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { user, pilotProfile, logout } = useAuth()
  const { primaryAircraft, unreadNotifications } = usePilotPortal()

  const pilotName = pilotProfile?.first_name
    ? `${pilotProfile.first_name} ${pilotProfile.last_name || ''}`.trim()
    : pilotProfile?.display_name || 'Pilot'

  const handleSignOut = () => {
    navigate('/')
    logout()
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0A0F1E', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-[240px] z-40"
        style={{ background: '#080D18', borderRight: '0.5px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="px-5 pt-6 pb-1">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '22px', color: '#4EADFF', letterSpacing: '1.5px' }}>
            RAMPREADY
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: '#4A566E' }}>Pilot Portal</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 mt-6 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'flex items-center gap-3 h-[44px] px-4 rounded-lg text-[14px] transition-all no-underline relative'}
              style={({ isActive }) => ({
                background: isActive ? 'rgba(78,173,255,0.1)' : 'transparent',
                color: isActive ? '#4EADFF' : '#4A566E',
                borderLeft: isActive ? '2px solid #4EADFF' : '2px solid transparent',
              })}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              <span style={{ fontWeight: 500 }}>{item.label}</span>
              {item.label === 'Notifications' && unreadNotifications > 0 && (
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#EF4444', color: 'white' }}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: pilot info + sign out */}
        <div className="px-4 pb-5 pt-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[13px] font-medium" style={{ color: '#E8EDF7' }}>{pilotName}</p>
          {primaryAircraft && (
            <p className="text-[11px] font-mono mt-0.5" style={{ color: '#4EADFF' }}>{primaryAircraft.tail_number}</p>
          )}
          <button onClick={handleSignOut}
            className="mt-3 w-full h-8 rounded-lg border-none cursor-pointer text-[11px] font-semibold"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile hamburger overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
          <div className="absolute top-0 left-0 bottom-0 w-[280px]" style={{ background: '#080D18' }}
            onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-6 pb-2 flex items-center justify-between">
              <div>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '20px', color: '#4EADFF', letterSpacing: '1.5px' }}>
                  RAMPREADY
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: '#4A566E' }}>Pilot Portal</p>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="w-8 h-8 flex items-center justify-center bg-transparent border-none cursor-pointer" style={{ color: '#4A566E' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <nav className="px-3 mt-4 space-y-1">
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 h-[44px] px-4 rounded-lg text-[14px] no-underline"
                  style={({ isActive }) => ({
                    background: isActive ? 'rgba(78,173,255,0.1)' : 'transparent',
                    color: isActive ? '#4EADFF' : '#4A566E',
                  })}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {item.icon}
                  </svg>
                  <span style={{ fontWeight: 500 }}>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="px-4 mt-auto pt-4 pb-5" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              <p className="text-[13px] font-medium" style={{ color: '#E8EDF7' }}>{pilotName}</p>
              <button onClick={handleSignOut}
                className="mt-2 w-full h-8 rounded-lg border-none cursor-pointer text-[11px] font-semibold"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 lg:ml-[240px] min-h-screen flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 shrink-0"
          style={{ background: '#080D18', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setMobileMenuOpen(true)} className="w-9 h-9 flex items-center justify-center bg-transparent border-none cursor-pointer" style={{ color: '#8B9AB0' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '18px', color: '#4EADFF', letterSpacing: '1px' }}>
            RAMPREADY
          </p>
          <NavLink to="/pilot/notifications" className="relative w-9 h-9 flex items-center justify-center no-underline" style={{ color: '#4A566E' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadNotifications > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: '#EF4444' }}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </NavLink>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20 lg:pb-10">
          <div className="max-w-[1200px] mx-auto px-5 lg:px-10 py-6 lg:py-10">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16"
          style={{ background: '#080D18', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-around h-full max-w-[500px] mx-auto">
            {mobileItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className="flex flex-col items-center gap-0.5 no-underline"
                style={({ isActive }) => ({ color: item.isCenter ? undefined : isActive ? '#4EADFF' : '#4A566E' })}>
                {item.isCenter ? (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center -mt-5 shadow-lg"
                    style={{ background: '#4EADFF', boxShadow: '0 4px 20px rgba(78,173,255,0.3)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#080D18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {item.icon}
                    </svg>
                  </div>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {item.icon}
                    </svg>
                    <span className="text-[9px] font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
