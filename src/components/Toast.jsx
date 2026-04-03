import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'

const ToastContext = createContext(null)

const ICONS = {
  message: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  request_confirmed: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  request_declined: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  arrival: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
}

const STYLES = {
  message:           { bg: 'rgba(78,173,255,0.12)', border: 'rgba(78,173,255,0.3)', color: '#4EADFF', iconBg: 'rgba(78,173,255,0.15)' },
  request_confirmed: { bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.3)', color: '#4ADE80', iconBg: 'rgba(74,222,128,0.15)' },
  request_declined:  { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', color: '#F87171', iconBg: 'rgba(248,113,113,0.15)' },
  arrival:           { bg: 'rgba(252,211,77,0.1)', border: 'rgba(252,211,77,0.3)', color: '#FCD34D', iconBg: 'rgba(252,211,77,0.15)' },
  info:              { bg: 'rgba(139,154,176,0.1)', border: 'rgba(139,154,176,0.3)', color: '#8B9AB0', iconBg: 'rgba(139,154,176,0.15)' },
}

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false)
  const s = STYLES[toast.type] || STYLES.info
  const icon = ICONS[toast.type] || ICONS.info

  useEffect(() => {
    const t = setTimeout(() => setExiting(true), toast.duration || 4000)
    return () => clearTimeout(t)
  }, [toast.duration])

  useEffect(() => {
    if (exiting) {
      const t = setTimeout(() => onDismiss(toast.id), 300)
      return () => clearTimeout(t)
    }
  }, [exiting, toast.id, onDismiss])

  return (
    <div
      onClick={() => { if (toast.onClick) toast.onClick(); setExiting(true) }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
        exiting ? 'opacity-0 translate-x-[120%]' : 'opacity-100 translate-x-0'
      }`}
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        backdropFilter: 'blur(20px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${s.border}`,
        maxWidth: '380px',
        width: '100%',
      }}
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: s.iconBg, color: s.color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight" style={{ color: '#E8EDF7' }}>
          {toast.title}
        </p>
        {toast.body && (
          <p className="text-[12px] mt-0.5 leading-snug truncate" style={{ color: '#8B9AB0' }}>
            {toast.body}
          </p>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setExiting(true) }}
        className="w-5 h-5 flex items-center justify-center bg-transparent border-none cursor-pointer shrink-0 mt-0.5 rounded hover:bg-white/10"
        style={{ color: '#4A566E' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

let toastIdCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  // Dedup: track recently shown toast keys to prevent duplicates from realtime
  const recentKeys = useRef(new Set())

  const showToast = useCallback(({ title, body, type = 'info', duration = 4500, onClick, key }) => {
    // Dedup by key if provided
    if (key) {
      if (recentKeys.current.has(key)) return
      recentKeys.current.add(key)
      setTimeout(() => recentKeys.current.delete(key), 5000)
    }

    const id = ++toastIdCounter
    setToasts(prev => {
      // Max 4 visible toasts
      const next = [...prev, { id, title, body, type, duration, onClick }]
      return next.length > 4 ? next.slice(-4) : next
    })
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — fixed top-right */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-auto"
          style={{ maxWidth: '380px', width: 'calc(100vw - 32px)' }}>
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
