import { NavLink } from 'react-router-dom'
import { FBO_INFO } from '../data/seed'
import { useAuth } from '../context/AuthContext'
import { LogoMark } from './Logo'

export default function Navbar() {
  const { user, logout } = useAuth()

  const linkClass = ({ isActive }) =>
    `relative px-3 py-1.5 text-[13px] font-medium rounded-md transition-all ${
      isActive
        ? 'bg-sky-muted text-sky'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-600'
    }`

  return (
    <nav className="h-12 bg-surface-800 border-b border-border px-5 flex items-center justify-between sticky top-0 z-50">
      {/* Left: Brand + Airport ID */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="text-[15px] font-bold text-text-primary tracking-tight">
            Ramp<span className="text-sky">Ready</span>
          </span>
        </div>

        {/* FBO + Airport identifier */}
        <div className="hidden sm:flex items-center gap-2 bg-surface-900/60 rounded-md px-2.5 py-1">
          <span className="text-[12px] font-semibold text-text-primary">{FBO_INFO.fboName}</span>
          <span className="w-px h-3 bg-border" />
          <span className="font-mono text-[13px] font-bold text-sky tracking-wide">
            {FBO_INFO.icao}
          </span>
          <span className="w-px h-3 bg-border" />
          <span className="text-[12px] text-text-tertiary">{FBO_INFO.airportName}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-good ml-0.5" />
        </div>
      </div>

      {/* Right: Navigation + User */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1">
          <NavLink to="/dashboard" className={linkClass}>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span className="hidden sm:inline">Ops Desk</span>
              <span className="sm:hidden">Ops</span>
            </span>
          </NavLink>
          <NavLink to="/linecrew" className={linkClass}>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span className="hidden sm:inline">Line Crew</span>
              <span className="sm:hidden">Line</span>
            </span>
          </NavLink>
        </div>

        {/* User + Logout */}
        {user && (
          <>
            <div className="w-px h-5 bg-border" />
            <div className="hidden md:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-muted flex items-center justify-center">
                <span className="text-[11px] font-bold text-sky">
                  {user.name.split(' ').map((n) => n[0]).join('')}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-text-primary font-medium leading-tight">{user.name}</p>
                <p className="text-[10px] text-text-tertiary leading-tight">{user.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
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
