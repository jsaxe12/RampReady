import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/pilot', icon: 'home', label: 'Home', end: true },
  { to: '/pilot/search', icon: 'search', label: 'Search' },
  { to: '/pilot/request/new', icon: 'plus', label: 'Request' },
  { to: '/pilot/messages', icon: 'chat', label: 'Messages' },
  { to: '/pilot/profile', icon: 'person', label: 'Profile' },
]

const icons = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  plus: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  chat: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  person: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
}

export default function PilotLayout() {
  return (
    <div className="min-h-screen flex justify-center" style={{ background: '#0A0F1E' }}>
      <div className="w-full max-w-[430px] relative min-h-screen" style={{ boxShadow: '0 0 80px rgba(78,173,255,0.04)' }}>
        {/* Page content */}
        <div className="pb-20">
          <Outlet />
        </div>

        {/* Bottom navigation */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 border-t" style={{ background: '#0E1525', borderColor: '#1a2235' }}>
          <div className="flex items-center justify-around h-14">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                    tab.icon === 'plus'
                      ? ''
                      : isActive
                        ? 'text-[#4EADFF]'
                        : 'text-[#4A566E] hover:text-[#6b7a96]'
                  }`
                }
              >
                {tab.icon === 'plus' ? (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center -mt-4" style={{ background: '#4EADFF' }}>
                    <span className="text-[#0A0F1E]">{icons[tab.icon]}</span>
                  </div>
                ) : (
                  <>
                    {icons[tab.icon]}
                    <span className="text-[9px] font-medium">{tab.label}</span>
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
