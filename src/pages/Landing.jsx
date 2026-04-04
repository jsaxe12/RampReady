import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* ─── Design tokens ─── */
const c = {
  bg: '#0e121b',
  s900: '#181b25',
  s800: '#222530',
  s700: '#2b303b',
  blue: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  white: '#ffffff',
  soft: '#99a0ae',
  muted: '#717784',
  faded: '#525866',
}

/* ─── Scroll animation hooks ─── */
function useFadeIn() {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.unobserve(el) } },
      { threshold: 0.02 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, vis, className: `transition-[opacity,transform] duration-500 ease-out will-change-[opacity,transform] ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}` }
}

function useStaggerIn() {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.unobserve(el) } },
      { threshold: 0.02 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, className: `stagger-children ${vis ? 'visible' : ''}` }
}

function useSlideIn(dir = 'left') {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.unobserve(el) } },
      { threshold: 0.02 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, className: `slide-in-${dir} ${vis ? 'visible' : ''}` }
}

function useScaleIn() {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.unobserve(el) } },
      { threshold: 0.02 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, className: `scale-in ${vis ? 'visible' : ''}` }
}

function useParallax(speed = 0.15) {
  const ref = useRef(null)
  const [offset, setOffset] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    // Disable parallax on mobile for performance
    if (window.innerWidth < 640) return
    const h = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        const el = ref.current
        if (el) {
          const rect = el.getBoundingClientRect()
          const center = rect.top + rect.height / 2 - window.innerHeight / 2
          setOffset(center * speed)
        }
        rafRef.current = null
      })
    }
    window.addEventListener('scroll', h, { passive: true })
    h()
    return () => {
      window.removeEventListener('scroll', h)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [speed])
  return { ref, style: { transform: `translateY(${offset}px)`, willChange: 'transform' } }
}

function useCountUp(end, duration = 1200) {
  const ref = useRef(null)
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStarted(true); obs.unobserve(el) } },
      { threshold: 0.02 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  useEffect(() => {
    if (!started) return
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [started, end, duration])
  return { ref, val }
}

function Eyebrow({ children }) {
  return <p className="text-[16px] font-medium uppercase tracking-[0.01em] text-[#3b82f6] mb-4">{children}</p>
}

function GradientHeading({ as: Tag = 'h2', className = '', children }) {
  return (
    <Tag className={`font-semibold landing-gradient-text ${className}`}>
      {children}
    </Tag>
  )
}

/* ─── Sign-In / Sign-Up Modal ─── */
function SignInModal({ open, onClose }) {
  const { login, error, clearError } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loginRole, setLoginRole] = useState('fbo')
  const formRef = useRef(null)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (open) {
      clearError()
      setLoginRole('fbo')
      setLoading(false)
      loadingRef.current = false
      if (formRef.current) formRef.current.reset()
    }
  }, [open, clearError])

  const doLogin = useCallback(async (isAutoSubmit = false) => {
    if (loadingRef.current) return
    const form = formRef.current
    if (!form) return

    if (isAutoSubmit) {
      // Safari/Chrome biometric autofill commits values in stages.
      // A single rAF is not enough — the password .value can still be
      // stale/placeholder when read too early after Touch ID / Face ID.
      // Wait for the values to fully stabilize before sending to Supabase.
      await new Promise((r) => setTimeout(r, 400))
      // Re-check: if user already triggered a manual submit, bail out
      if (loadingRef.current) return
      // Read values, wait, read again — only proceed if they're stable
      const e1 = form.email?.value?.trim()
      const p1 = form.password?.value
      if (!e1 || !p1) return
      await new Promise((r) => setTimeout(r, 200))
      if (loadingRef.current) return
      const e2 = form.email?.value?.trim()
      const p2 = form.password?.value
      if (!e2 || !p2 || e1 !== e2 || p1 !== p2) return // still changing — don't submit
    } else {
      // Manual submit — just wait one frame for DOM to settle
      await new Promise((r) => requestAnimationFrame(r))
    }

    const email = form.email?.value?.trim()
    const password = form.password?.value
    if (!email || !password) return

    loadingRef.current = true
    setLoading(true)
    clearError()
    try {
      const u = await login(email, password)
      if (u) {
        onClose()
        const userRole = u.user_metadata?.role || 'fbo'
        navigate(userRole === 'pilot' ? '/pilot' : '/dashboard', { replace: true })
      }
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [login, clearError, onClose, navigate])

  // Auto-submit when Touch ID / Face ID / password manager fills both fields
  useEffect(() => {
    if (!open) return
    const form = formRef.current
    if (!form) return
    let timers = []
    let cancelled = false
    const check = () => {
      if (cancelled || loadingRef.current) return
      const e = form.email?.value?.trim()
      const p = form.password?.value
      if (e && p) doLogin(true) // true = autofill path with stabilization delay
    }
    const onChange = () => { timers.push(setTimeout(check, 150)) }
    form.addEventListener('change', onChange, true)
    form.addEventListener('input', onChange, true)
    // Scheduled checks for autofills that don't fire standard events
    timers.push(setTimeout(check, 600))
    timers.push(setTimeout(check, 1200))
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      form.removeEventListener('change', onChange, true)
      form.removeEventListener('input', onChange, true)
    }
  }, [open, doLogin])

  if (!open) return null

  const isPilot = loginRole === 'pilot'

  const handleLogin = (e) => {
    e.preventDefault()
    doLogin()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[#181b25] rounded-2xl ring-1 ring-white/10 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-[#717784] hover:text-white bg-transparent border-none cursor-pointer p-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <h2 className="text-[18px] font-semibold text-white mb-1">Welcome back</h2>
        <p className="text-[13px] text-[#717784] mb-4">Sign in to your RampReady account</p>

        {/* Role toggle */}
        <div className="flex bg-[#0e121b] rounded-lg p-0.5 mb-5 ring-1 ring-[#2b303b]">
          <button
            type="button"
            onClick={() => { setLoginRole('fbo'); clearError() }}
            className={`flex-1 h-9 text-[12px] font-semibold rounded-md border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              !isPilot ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-transparent text-[#717784]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            FBO Operator
          </button>
          <button
            type="button"
            onClick={() => { setLoginRole('pilot'); clearError() }}
            className={`flex-1 h-9 text-[12px] font-semibold rounded-md border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              isPilot ? 'bg-[#34c759]/20 text-[#34c759]' : 'bg-transparent text-[#717784]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
            Pilot
          </button>
        </div>

        <form ref={formRef} onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] text-[#717784] uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" name="email" autoComplete="email" onChange={clearError}
              placeholder={isPilot ? 'pilot@email.com' : 'you@yourfbo.com'} required autoFocus
              className="w-full h-10 bg-[#0e121b] border border-[#2b303b] focus:border-[#3b82f6] rounded-lg px-3 text-[13px] text-white placeholder:text-[#525866] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] text-[#717784] uppercase tracking-wider mb-1.5">Password</label>
            <input type="password" name="password" autoComplete="current-password" onChange={clearError} placeholder="••••••••" required
              className="w-full h-10 bg-[#0e121b] border border-[#2b303b] focus:border-[#3b82f6] rounded-lg px-3 text-[13px] text-white placeholder:text-[#525866] focus:outline-none" />
          </div>
          {error && (
            <div className="bg-red-500/10 rounded-lg px-3 py-2">
              <p className="text-[12px] text-red-400">{error}</p>
            </div>
          )}
          <button type="submit" disabled={loading}
            className={`w-full h-10 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none transition-colors ${
              isPilot ? 'bg-[#34c759] hover:bg-[#2db84e]' : 'bg-[#3b82f6] hover:bg-[#2563eb]'
            }`}>
            {loading ? 'Signing in...' : `Sign In as ${isPilot ? 'Pilot' : 'FBO'}`}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── 1. Navigation ─── */
function Nav({ onSignIn }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const scroll = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const links = [
    { label: 'Features', id: 'features' },
    { label: 'Benefits', id: 'benefits' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'About', id: 'about' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-8 pt-4">
      <div className={`max-w-[64rem] mx-auto transition-[background-color,border-color] duration-300 rounded-2xl px-4 py-2 grid grid-cols-[auto_1fr_auto] items-center gap-4 ${
        scrolled ? 'bg-[#99a0ae1a] border border-[#99a0ae1a] backdrop-blur-[4px] sm:backdrop-blur-[10px]' : 'bg-[#99a0ae0d] border border-transparent backdrop-blur-[4px] sm:backdrop-blur-[10px]'
      }`}>
        <button onClick={() => scroll('hero')} className="text-[18px] font-semibold text-white tracking-tight bg-transparent border-none cursor-pointer">
          RampReady
        </button>
        <div className="hidden md:flex items-center justify-center gap-1">
          {links.map((l) => (
            <button key={l.id} onClick={() => scroll(l.id)} className="text-[14px] text-white px-4 py-2 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity">
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0 sm:gap-2 ml-auto">
          <button onClick={onSignIn} className="text-[11px] sm:text-[14px] text-white px-1.5 sm:px-4 py-2 bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity">
            Sign In
          </button>
          <button onClick={() => scroll('founding')} className="text-[10px] sm:text-[14px] font-medium bg-[#f5f7fa] text-[#0e121b] h-7 sm:h-10 px-2 sm:px-4 rounded-lg border-none cursor-pointer hover:bg-white transition-colors whitespace-nowrap">
            Start Free
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden bg-transparent border-none cursor-pointer text-white p-0 pl-1 sm:p-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" /></>}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden max-w-[64rem] mx-auto mt-2 bg-[#99a0ae1a] backdrop-blur-[10px] border border-[#99a0ae1a] rounded-2xl p-4 space-y-1">
          {links.map((l) => (
            <button key={l.id} onClick={() => scroll(l.id)} className="block w-full text-left text-[15px] text-white py-2.5 px-3 rounded-lg bg-transparent border-none cursor-pointer hover:bg-white/5">
              {l.label}
            </button>
          ))}
          <button onClick={() => { setMenuOpen(false); onSignIn() }} className="block w-full text-left text-[15px] text-white py-2.5 px-3 bg-transparent border-none cursor-pointer">Sign In</button>
          <button onClick={() => scroll('founding')} className="w-full text-[14px] font-medium bg-[#3b82f6] text-white h-11 rounded-lg border-none cursor-pointer mt-2">
            Start for free
          </button>
        </div>
      )}
    </nav>
  )
}

/* ─── 2. Hero ─── */
function Hero() {
  const scroll = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  const parallax = useParallax(0.08)

  return (
    <section id="hero" className="relative overflow-hidden pt-[5.5rem] sm:pt-[7.5rem] pb-0" style={{ background: c.bg, borderBottomLeftRadius: '2.5rem', borderBottomRightRadius: '2.5rem' }}>
      {/* Blue glow blobs — floating */}
      <div className="absolute inset-0 pointer-events-none hero-glow-container">
        <div className="absolute bottom-[10%] left-0 right-0 min-h-[50%] opacity-100 sm:animate-float" style={{ background: 'linear-gradient(90deg, #3b82f64d, #2563eb 50%, #3b82f64d)', filter: 'blur(40px)', willChange: 'transform' }} />
        <div className="hidden sm:block absolute inset-0 opacity-80 animate-float-delay" style={{ background: 'radial-gradient(circle farthest-corner at 0% 100%, #1d4ed8, transparent 34%)' }} />
        <div className="hidden sm:block absolute inset-0 opacity-80 animate-float" style={{ background: 'radial-gradient(circle farthest-corner at 100% 100%, #1d4ed8, transparent 34%)' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[79rem] mx-auto px-4 sm:px-8">
        <div className="max-w-[800px] mx-auto text-center mb-6 sm:mb-10">
          <Eyebrow>Now Accepting Founding FBO Partners</Eyebrow>
          <GradientHeading as="h1" className="text-[28px] sm:text-[48px] md:text-[64px] leading-[1.1] tracking-[-0.04em] mb-3 sm:mb-4">
            Your ramp. Under control.
          </GradientHeading>
          <p className="text-[15px] sm:text-[18px] text-[#99a0ae] leading-[1.5] tracking-[-0.01em] max-w-[800px] mx-auto mb-6 sm:mb-8 px-2 sm:px-0">
            RampReady connects pilots with FBOs before wheels touch down — live ADS-B tracking, real fuel prices, and service requests confirmed before the aircraft is in radio range.
          </p>
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <button onClick={() => scroll('founding')} className="text-[14px] sm:text-[16px] font-medium bg-[#3b82f6] text-white h-11 sm:h-[3.25rem] px-4 sm:px-6 rounded-lg border-none cursor-pointer hover:bg-[#2563eb] transition-colors animate-pulse-glow">
              Become a Founding FBO →
            </button>
            <button onClick={() => scroll('benefits')} className="hidden sm:inline-block text-[14px] sm:text-[16px] font-medium bg-[#222530] text-white h-11 sm:h-[3.25rem] px-4 sm:px-6 rounded-lg border-none cursor-pointer hover:bg-[#2b303b] transition-colors">
              Learn more
            </button>
          </div>
        </div>

        {/* Dashboard mockup — parallax (hidden on small mobile) */}
        <div ref={parallax.ref} style={parallax.style} className="relative max-w-[1060px] mx-auto landing-parallax-slow hidden sm:block">
          <div className="rounded-t-[1.5rem] overflow-hidden shadow-[0_0_0_1px_#ffffff14,0_32px_64px_-12px_rgba(0,0,0,0.6)]">
            <HeroDashboardMockup />
          </div>
          {/* Fade to bg */}
          <div className="absolute bottom-0 left-0 right-0 h-[35%] pointer-events-none" style={{ background: `linear-gradient(${c.bg}00 10%, ${c.bg}cc 60%, ${c.bg})` }} />
        </div>
      </div>
    </section>
  )
}

/* ─── Enhanced Dashboard Mockup ─── */
function HeroDashboardMockup() {
  const [activeTab, setActiveTab] = useState('inbound')

  const inbound = [
    { tail: 'N482KW', type: 'Cessna 172', eta: '14:35', fuel: 'Avgas', gal: 38, method: 'Over-wing', status: 'Pending', statusColor: 'text-amber-400 bg-amber-400/10', pax: 2, services: ['Tie-down'], rampFee: '$25' },
    { tail: 'N103PG', type: 'Cirrus SR22', eta: '16:40', fuel: 'Jet-A', gal: 60, method: 'Single-pt', status: 'Confirmed', statusColor: 'text-emerald-400 bg-emerald-400/10', pax: 3, services: ['Hangar', 'GPU'], rampFee: '$50' },
    { tail: 'N550GD', type: 'Gulfstream G550', eta: '17:15', fuel: 'Jet-A', gal: 1200, method: 'Single-pt', status: 'Pending', statusColor: 'text-amber-400 bg-amber-400/10', pax: 8, services: ['Crew car', 'Catering', 'Lavatory'], rampFee: 'Waived' },
    { tail: 'N921KA', type: 'King Air 350', eta: '17:50', fuel: 'Jet-A', gal: 280, method: 'Over-wing', status: 'Confirmed', statusColor: 'text-emerald-400 bg-emerald-400/10', pax: 5, services: ['GPU', 'De-ice'], rampFee: '$75' },
    { tail: 'N777FL', type: 'Citation CJ3', eta: '18:20', fuel: 'Jet-A', gal: 180, method: 'Single-pt', status: 'Pending', statusColor: 'text-amber-400 bg-amber-400/10', pax: 4, services: ['Hangar'], rampFee: '$50' },
  ]

  const outbound = [
    { tail: 'N234AB', type: 'Phenom 300', etd: '15:00', fuel: 'Jet-A', gal: 220, status: 'Ready', statusColor: 'text-emerald-400 bg-emerald-400/10', pax: 6 },
    { tail: 'N88TX', type: 'Baron 58', etd: '16:00', fuel: 'Avgas', gal: 40, status: 'Fueling', statusColor: 'text-[#3b82f6] bg-[#3b82f6]/10', pax: 2 },
    { tail: 'N456CD', type: 'Pilatus PC-12', etd: '18:00', fuel: 'Jet-A', gal: 150, status: 'Pending', statusColor: 'text-amber-400 bg-amber-400/10', pax: 4 },
  ]

  return (
    <div className="bg-[#12141a] relative" style={{ minHeight: 520 }}>
      {/* Top chrome bar */}
      <div className="bg-[#181b25] border-b border-[#2a2e38] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center">
            <div className="w-3 h-3 rounded-sm bg-[#3b82f6]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">Ramp Ready Aviation · KRRA</p>
            <p className="text-[10px] text-[#636366]">Ops Desk Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-[#636366]">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#8e8e93] bg-[#1a1d24] px-2 py-0.5 rounded border border-[#2a2e38]">5 Inbound</span>
            <span className="text-[11px] text-[#8e8e93] bg-[#1a1d24] px-2 py-0.5 rounded border border-[#2a2e38]">3 Outbound</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#3b82f6]/20 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-[#3b82f6]">SM</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        {[
          { label: 'Pending', value: '3', color: 'text-amber-400' },
          { label: 'Confirmed', value: '2', color: 'text-emerald-400' },
          { label: 'On Ramp', value: '4', color: 'text-[#3b82f6]' },
          { label: 'Fuel Requests', value: '8', color: 'text-white' },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-[#1a1d24] rounded-lg px-3 py-2 border border-[#2a2e38]">
            <p className="text-[10px] text-[#636366] uppercase tracking-wider">{s.label}</p>
            <p className={`text-[20px] font-semibold ${s.color} leading-tight font-mono`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="px-5 pb-5 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
        {/* Main traffic area */}
        <div>
          {/* Tab bar */}
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={() => setActiveTab('inbound')}
              className={`flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider pb-2 bg-transparent border-none cursor-pointer transition-colors ${
                activeTab === 'inbound' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-[#636366] hover:text-[#8e8e93]'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
              Inbound
              <span className="text-[10px] bg-emerald-400/10 text-emerald-400 px-1.5 py-0.5 rounded-full">5</span>
            </button>
            <button
              onClick={() => setActiveTab('outbound')}
              className={`flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider pb-2 bg-transparent border-none cursor-pointer transition-colors ${
                activeTab === 'outbound' ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]' : 'text-[#636366] hover:text-[#8e8e93]'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>
              Outbound
              <span className="text-[10px] bg-[#3b82f6]/10 text-[#3b82f6] px-1.5 py-0.5 rounded-full">3</span>
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 bg-[#3b82f6] px-2.5 py-1.5 rounded-md cursor-pointer">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span className="text-[10px] font-semibold text-white">Add Aircraft</span>
            </div>
          </div>

          {/* Aircraft cards */}
          {activeTab === 'inbound' ? (
            <div className="space-y-2">
              {inbound.map((a, i) => (
                <div key={a.tail} className="bg-[#1a1d24] rounded-xl border border-[#2a2e38] p-3 hover:border-[#363b48] transition-colors" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[13px] font-semibold text-white tracking-wide">{a.tail}</span>
                      <span className="text-[11px] text-[#8e8e93]">{a.type}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${a.statusColor}`}>{a.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-amber-400">ETA {a.eta}</span>
                      <span className="text-[10px] text-[#636366]">{a.pax} pax</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${a.fuel === 'Avgas' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#3b82f6]/10 text-[#3b82f6]'}`}>
                      {a.fuel} · {a.gal}g · {a.method}
                    </span>
                    {a.services.map((s) => (
                      <span key={s} className="text-[10px] text-[#8e8e93] bg-[#22252e] px-2 py-0.5 rounded">{s}</span>
                    ))}
                    <span className={`text-[10px] font-medium ml-auto ${a.rampFee === 'Waived' ? 'text-emerald-400' : 'text-[#8e8e93]'}`}>
                      Ramp: {a.rampFee}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {outbound.map((d, i) => (
                <div key={d.tail} className="bg-[#1a1d24] rounded-xl border border-[#2a2e38] p-3 hover:border-[#363b48] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[13px] font-semibold text-white tracking-wide">{d.tail}</span>
                      <span className="text-[11px] text-[#8e8e93]">{d.type}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${d.statusColor}`}>{d.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-[#3b82f6]">ETD {d.etd}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${d.fuel === 'Avgas' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#3b82f6]/10 text-[#3b82f6]'}`}>
                        {d.fuel} · {d.gal}g
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Fuel Prices */}
          <div className="bg-[#1a1d24] rounded-xl border border-[#2a2e38] p-4">
            <p className="text-[11px] text-[#636366] uppercase tracking-wider font-medium mb-3">Fuel Prices</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[12px] text-[#8e8e93]">100LL</span>
                </div>
                <span className="font-mono text-[14px] font-semibold text-white">$6.45</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                  <span className="text-[12px] text-[#8e8e93]">Jet-A</span>
                </div>
                <span className="font-mono text-[14px] font-semibold text-white">$5.89</span>
              </div>
              <p className="text-[9px] text-[#525866] mt-1">Updated 2h ago</p>
            </div>
          </div>

          {/* ADS-B Tracker */}
          <div className="bg-[#1a1d24] rounded-xl border border-[#2a2e38] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[11px] text-[#636366] uppercase tracking-wider font-medium">Live Track — N550GD</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[{ l: 'DIST', v: '42 NM' }, { l: 'ALT', v: "FL280" }, { l: 'GS', v: '385 kt' }, { l: 'ETA', v: '17:15' }].map((d) => (
                <div key={d.l} className="bg-[#12141a] rounded-lg p-2 text-center">
                  <p className="text-[9px] text-[#636366]">{d.l}</p>
                  <p className="font-mono text-[12px] font-semibold text-white">{d.v}</p>
                </div>
              ))}
            </div>
            <div className="h-1.5 bg-[#22252e] rounded-full overflow-hidden">
              <div className="h-full w-[65%] bg-gradient-to-r from-[#3b82f6] to-[#2563eb] rounded-full animate-fill-bar" />
            </div>
          </div>

          {/* Ramp Fees quick ref */}
          <div className="bg-[#1a1d24] rounded-xl border border-[#2a2e38] p-4">
            <p className="text-[11px] text-[#636366] uppercase tracking-wider font-medium mb-3">Today's Revenue</p>
            <p className="font-mono text-[22px] font-semibold text-white leading-tight">$2,450</p>
            <p className="text-[10px] text-emerald-400 mt-1">↑ 18% vs last Tuesday</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── 3. Mission / Problem Statement ─── */
function Mission() {
  const fade = useFadeIn()
  const parallax = useParallax(0.05)
  return (
    <section className="py-[7.5rem] px-8">
      <div ref={(el) => { fade.ref.current = el; parallax.ref.current = el }} style={parallax.style} className={`max-w-[41ch] mx-auto text-center ${fade.className}`}>
        <p className="text-[24px] md:text-[32px] font-semibold text-white leading-[1.3] tracking-[-0.02em]">
          General aviation runs on relationships and trust. It shouldn't run on phone tag. We're building the bridge between pilots and FBOs — so both sides of the ramp can work smarter.
        </p>
      </div>
    </section>
  )
}

/* ─── 4. Features ─── */
function Features() {
  const fade = useFadeIn()
  const slideLeft = useSlideIn('left')
  const slideRight = useSlideIn('right')

  return (
    <section id="features" className="py-[7.5rem] px-8">
      <div ref={fade.ref} className={`max-w-[79rem] mx-auto ${fade.className}`}>
        <div className="text-center mb-16">
          <Eyebrow>Features</Eyebrow>
          <GradientHeading className="text-[32px] md:text-[48px] leading-[1.2] tracking-[-0.03em] mb-4">
            Everything your ramp needs. Nothing it doesn't.
          </GradientHeading>
          <p className="text-[18px] text-[#99a0ae] max-w-[560px] mx-auto leading-[1.5]">
            From live ADS-B tracking to instant pilot messaging — built the way FBOs actually work.
          </p>
        </div>

        {/* Main feature — full width */}
        <div className="bg-[#181b25] rounded-[1.25rem] overflow-hidden grid grid-cols-1 lg:grid-cols-2 mb-6">
          <div ref={slideLeft.ref} className={`p-8 md:p-12 flex flex-col justify-center ${slideLeft.className}`}>
            <p className="text-[12px] font-medium uppercase tracking-wider text-[#3b82f6] mb-3">Live Tracking</p>
            <h3 className="text-[28px] md:text-[32px] font-semibold text-white leading-[1.2] tracking-[-0.02em] mb-4">
              Watch inbound aircraft in real time
            </h3>
            <p className="text-[16px] text-[#99a0ae] leading-[1.6]">
              See tail number, altitude, groundspeed, and auto-calculated ETA the moment a request comes in. ADS-B data updates continuously — no refresh needed.
            </p>
          </div>
          <div ref={slideRight.ref} className={`bg-[#222530] p-6 md:p-8 ${slideRight.className}`}>
            <div className="bg-[#181b25] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-[#717784] uppercase tracking-wider font-medium">ADS-B Track — N482KW</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[{ l: 'TAIL', v: 'N482KW' }, { l: 'DIST', v: '42 NM' }, { l: 'ALT', v: "4,500'" }, { l: 'GS', v: '118 kt' }].map((d) => (
                  <div key={d.l} className="bg-[#222530] rounded-lg p-3 text-center">
                    <p className="text-[10px] text-[#717784] mb-1">{d.l}</p>
                    <p className="font-mono text-[13px] font-semibold text-white">{d.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-2 bg-[#222530] rounded-full overflow-hidden">
                <div className="h-full w-[65%] bg-gradient-to-r from-[#3b82f6] to-[#2563eb] rounded-full animate-fill-bar" />
              </div>
              <p className="text-[11px] text-[#717784] mt-2">ETA: 14:35 local · 19:35Z</p>
            </div>
          </div>
        </div>

        {/* Two feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              tag: 'Arrivals Queue',
              title: 'Every request, one clean view',
              desc: 'Aircraft type, pax count, services needed, fuel request, and pilot notes — all visible before the aircraft is in radio range.',
              items: ['Confirm or decline with one click', 'Reply to pilots directly from the dashboard', 'Ramp fee waivers calculated automatically'],
            },
            {
              tag: 'Line Crew',
              title: 'Built for sun on screen',
              desc: "Your ramp team sees live data on their phones — large text, high contrast, optimized for outdoor use. Always in sync with the CSR desk.",
              items: ['Next arrival countdown with fuel type', 'Live ADS-B position on approach', 'Read-only — no accidental changes'],
            },
          ].map((card, i) => {
            const scale = useScaleIn()
            return (
              <div key={card.tag} ref={scale.ref} className={`bg-[#181b25] rounded-[1.25rem] p-8 md:p-10 ${scale.className}`} style={{ transitionDelay: `${i * 120}ms` }}>
                <p className="text-[12px] font-medium uppercase tracking-wider text-[#3b82f6] mb-3">{card.tag}</p>
                <h4 className="text-[24px] font-semibold text-white leading-[1.3] tracking-[-0.015em] mb-3">
                  {card.title}
                </h4>
                <p className="text-[16px] text-[#99a0ae] leading-[1.6] mb-6">{card.desc}</p>
                <div className="space-y-2">
                  {card.items.map((t) => (
                    <div key={t} className="flex items-center gap-2.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      <span className="text-[14px] text-[#99a0ae]">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── 5. Benefits ─── */
function Benefits() {
  const fade = useFadeIn()
  const stagger = useStaggerIn()
  const items = [
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"/></svg>, title: 'Live ADS-B Tracking', text: 'Watch inbound aircraft on a live map with auto-calculated ETAs.' },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>, title: 'Fuel Price Management', text: 'Post and update 100LL and Jet-A prices. Pilots see them before they call.' },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, title: 'Real-time Team Sync', text: 'CSR manages at the desk. Line crew sees it on their phones. Always in sync.' },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>, title: 'Line Crew Mobile View', text: 'Large text, high contrast, built for outdoor use on the ramp.' },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, title: 'One-tap Service Requests', text: 'Pilots send fuel, parking, and service requests before landing.' },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94L6.7 20.24a2.12 2.12 0 01-3-3l6.77-6.77a6 6 0 017.94-7.94l-3.76 3.77z"/></svg>, title: 'Over-wing & Single-point', text: 'Set fueling methods per aircraft class. Pilots see the right type automatically.' },
  ]

  return (
    <section id="benefits" className="py-[7.5rem] px-8">
      <div ref={fade.ref} className={`max-w-[79rem] mx-auto ${fade.className}`}>
        <div className="text-center mb-16">
          <Eyebrow>Benefits</Eyebrow>
          <GradientHeading className="text-[32px] md:text-[48px] leading-[1.2] tracking-[-0.03em] mb-4">
            Built for both sides of the ramp
          </GradientHeading>
          <p className="text-[18px] text-[#99a0ae] max-w-[560px] mx-auto leading-[1.5]">
            Whether you're in the cockpit or on the fuel truck — RampReady gives you what you need, when you need it.
          </p>
        </div>

        <div ref={stagger.ref} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${stagger.className}`}>
          {items.map((item) => (
            <div key={item.title} className="bg-[#181b25] rounded-[1.25rem] p-8 hover:bg-[#1c2029] transition-colors group">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5 group-hover:scale-110 transition-transform" style={{ background: 'linear-gradient(135deg, #222530, #181b25 58%, #0e121b)' }}>
                {item.icon}
              </div>
              <h4 className="text-[18px] font-semibold text-white mb-2 tracking-[-0.01em]">{item.title}</h4>
              <p className="text-[14px] text-[#99a0ae] leading-[1.6]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── 6. Stats ─── */
function Stats() {
  const fade = useFadeIn()
  const c1 = useCountUp(73)
  const c2 = useCountUp(60)

  return (
    <section className="py-[5rem] px-8">
      <div ref={fade.ref} className={`max-w-[79rem] mx-auto ${fade.className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div ref={c1.ref} className="bg-[#181b25] rounded-[1.25rem] p-8 text-center group hover:bg-[#1c2029] transition-colors">
            <p className="text-[48px] md:text-[56px] font-semibold text-[#3b82f6] leading-none tracking-[-0.03em] mb-3">{c1.val}%</p>
            <p className="text-[14px] text-[#99a0ae] leading-relaxed">of GA pilots land without confirming services in advance</p>
          </div>
          <div ref={c2.ref} className="bg-[#181b25] rounded-[1.25rem] p-8 text-center group hover:bg-[#1c2029] transition-colors">
            <p className="text-[48px] md:text-[56px] font-semibold text-[#3b82f6] leading-none tracking-[-0.03em] mb-3">{c2.val}%+</p>
            <p className="text-[14px] text-[#99a0ae] leading-relaxed">of FBOs still rely on phone and radio for inbound coordination</p>
          </div>
          <div className="bg-[#181b25] rounded-[1.25rem] p-8 text-center group hover:bg-[#1c2029] transition-colors">
            <p className="text-[48px] md:text-[56px] font-semibold text-[#3b82f6] leading-none tracking-[-0.03em] mb-3">$0</p>
            <p className="text-[14px] text-[#99a0ae] leading-relaxed">spent by most pilots on tools to find accurate fuel prices</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── 7. Testimonials ─── */
function Testimonials() {
  const fade = useFadeIn()
  const stagger = useStaggerIn()
  const quotes = [
    { text: "We've been waiting for something like this for years. The line crew mobile view alone is worth it — my guys know exactly what's coming before I even tell them.", name: 'FBO Manager', loc: 'KADS Addison Airport' },
    { text: "I used to call ahead and still land with nobody ready. Now I send a request from cruise and the truck is waiting when I turn off the runway.", name: 'Private Pilot', loc: 'Dallas, TX' },
    { text: "The fuel price tool alone saves us time on every leg. We can plan fuel stops with real numbers — not whatever was posted six weeks ago.", name: 'Charter Operator', loc: 'Texas' },
  ]

  return (
    <section className="py-[7.5rem] px-8">
      <div ref={fade.ref} className={`max-w-[79rem] mx-auto ${fade.className}`}>
        <div className="text-center mb-16">
          <Eyebrow>Testimonials</Eyebrow>
          <GradientHeading className="text-[32px] md:text-[48px] leading-[1.2] tracking-[-0.03em]">
            The people on the ramp asked for this
          </GradientHeading>
        </div>
        <div ref={stagger.ref} className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${stagger.className}`}>
          {quotes.map((q, i) => (
            <div key={i} className="bg-[#181b25] rounded-[1.25rem] p-10 flex flex-col justify-between min-h-[320px] hover:bg-[#1c2029] transition-colors">
              <p className="text-[16px] text-white leading-[1.7] italic">"{q.text}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#222530] flex items-center justify-center">
                  <span className="text-[14px] font-semibold text-[#3b82f6]">{q.name[0]}</span>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-white">{q.name}</p>
                  <p className="text-[13px] text-[#717784]">{q.loc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── 8. Pricing ─── */
function Pricing() {
  const fade = useFadeIn()
  const stagger = useStaggerIn()
  const [annual, setAnnual] = useState(false)
  const scroll = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const plans = [
    { name: 'FBO Starter', price: annual ? '$950' : '$99', period: annual ? '/yr' : '/mo', popular: false, features: ['Arrivals queue and dashboard', 'Confirm / quote / decline', 'Fuel price posting', 'Line crew mobile view', 'Push notifications'] },
    { name: 'FBO Pro', price: annual ? '$1,910' : '$199', period: annual ? '/yr' : '/mo', popular: true, features: ['Everything in Starter', 'Live ADS-B arrivals map', 'Fuel price management', 'Over-wing / single-point', 'Analytics and reporting', 'Priority listing in pilot app'] },
    { name: 'Pilots', price: annual ? '$48' : '$5', period: annual ? '/yr' : '/mo', popular: false, features: ['Live fuel prices at every FBO', 'Ramp fee waiver calculator', 'One-tap service requests', 'Real-time FBO responses', 'Flight history log'] },
  ]

  return (
    <section id="pricing" className="py-[7.5rem] px-8">
      <div ref={fade.ref} className={`max-w-[79rem] mx-auto ${fade.className}`}>
        <div className="text-center mb-12">
          <Eyebrow>Pricing</Eyebrow>
          <GradientHeading className="text-[32px] md:text-[48px] leading-[1.2] tracking-[-0.03em] mb-4">
            Simple pricing. No surprises.
          </GradientHeading>
          <p className="text-[18px] text-[#99a0ae] max-w-[500px] mx-auto leading-[1.5] mb-8">
            Founding FBO partners get Year 1 completely free. No credit card. No contract.
          </p>

          <div className="inline-flex items-center bg-[#181b25] rounded-lg p-1 gap-1">
            <button onClick={() => setAnnual(false)} className={`text-[14px] font-medium px-4 py-2 rounded-md border-none cursor-pointer transition-colors ${!annual ? 'bg-[#222530] text-white' : 'bg-transparent text-[#717784]'}`}>
              Monthly
            </button>
            <button onClick={() => setAnnual(true)} className={`text-[14px] font-medium px-4 py-2 rounded-md border-none cursor-pointer transition-colors flex items-center gap-2 ${annual ? 'bg-[#222530] text-white' : 'bg-transparent text-[#717784]'}`}>
              Annual <span className="text-[11px] font-medium bg-[#172d69] text-[#3b82f6] px-1.5 py-0.5 rounded">20% Save</span>
            </button>
          </div>
        </div>

        <div ref={stagger.ref} className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${stagger.className}`}>
          {plans.map((p) => (
            <div key={p.name} className={`bg-[#181b25] rounded-[1.25rem] p-10 flex flex-col justify-between relative hover:bg-[#1c2029] transition-all hover:-translate-y-1 ${p.popular ? 'shadow-[inset_0_0_0_1px_#3b82f6]' : ''}`}>
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[12px] font-medium bg-[#172d69] text-[#3b82f6] px-3 py-1 rounded-full">
                  Popular!
                </span>
              )}
              <div>
                <p className="text-[14px] text-[#717784] uppercase tracking-wider font-medium mb-4">{p.name}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-[48px] font-semibold text-white tracking-[-0.03em] leading-none">{p.price}</span>
                  <span className="text-[14px] text-[#717784]">{p.period}</span>
                </div>
                <div className="space-y-3 mb-8">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      <span className="text-[14px] text-[#99a0ae]">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => scroll('founding')} className={`w-full h-[3.25rem] rounded-lg text-[16px] font-medium border-none cursor-pointer transition-colors ${
                p.popular ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]' : 'bg-[#222530] text-white hover:bg-[#2b303b]'
              }`}>
                Get started
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-[#181b25] rounded-[1.25rem] p-6 text-center shadow-[inset_0_0_0_1px_#27c06e33]">
          <p className="text-[16px] text-emerald-400 font-medium">
            Founding FBO Partners get Year 1 FREE — Limited spots available.{' '}
            <button onClick={() => scroll('founding')} className="text-emerald-400 underline font-medium bg-transparent border-none cursor-pointer">
              Apply now →
            </button>
          </p>
        </div>
      </div>
    </section>
  )
}

/* ─── 9. About ─── */
function About() {
  const fade = useFadeIn()
  return (
    <section id="about" className="py-[7.5rem] px-8">
      <div ref={fade.ref} className={`max-w-[640px] mx-auto text-center ${fade.className}`}>
        <Eyebrow>Our Story</Eyebrow>
        <GradientHeading className="text-[32px] md:text-[44px] leading-[1.2] tracking-[-0.03em] mb-8">
          Built by someone who's felt the friction firsthand
        </GradientHeading>
        <div className="text-[16px] md:text-[18px] text-[#99a0ae] leading-[1.9] space-y-6 text-left">
          <p>RampReady was born out of a simple frustration — the ramp experience in general aviation hasn't kept up with everything else that's gotten better about flying.</p>
          <p>Pilots have incredible tools for navigation, weather, and flight planning. But the moment you need fuel, parking, or ground services at an unfamiliar airport — you're back to phone calls, radio calls, and hoping someone picks up.</p>
          <p>FBOs are running lean, dedicated operations. They deserve tools that help them serve pilots better — not more complexity added to an already demanding job.</p>
          <p>RampReady is being built from direct conversations with the people who live on the ramp every day. Every feature exists because an FBO manager or a pilot said "I wish I had this."</p>
          <p>We're just getting started.</p>
        </div>
        <p className="mt-8 text-[16px] font-medium text-white">
          — Josiah, Founder · <span className="text-[#3b82f6]">getrampready.com</span>
        </p>
      </div>
    </section>
  )
}

/* ─── 10. Founding CTA ─── */
function FoundingCTA() {
  const scale = useScaleIn()
  const [form, setForm] = useState({ fbo: '', icao: '', name: '', email: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section id="founding" className="py-[7.5rem] px-8">
      <div ref={scale.ref} className={`max-w-[640px] mx-auto text-center ${scale.className}`}>
        <GradientHeading className="text-[36px] md:text-[56px] leading-[1.1] tracking-[-0.04em] mb-6">
          Be one of the first FBOs on the platform
        </GradientHeading>
        <p className="text-[16px] md:text-[18px] text-[#99a0ae] leading-[1.8] mb-12">
          We're selecting a small group of founding FBO partners to help shape RampReady from the ground up. Full access, every feature, your entire team — completely free for Year 1. In exchange, we ask for honest feedback. No credit card. No contract. No risk.
        </p>

        {submitted ? (
          <div className="bg-[#181b25] rounded-[1.25rem] p-10 shadow-[inset_0_0_0_1px_#27c06e33]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#27c06e" strokeWidth="2" strokeLinecap="round" className="mx-auto mb-4"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p className="text-[18px] font-medium text-white mb-2">Thanks! We'll be in touch within 24 hours.</p>
            <p className="text-[14px] text-[#99a0ae]">Check your email for next steps.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#181b25] rounded-[1.25rem] p-8 md:p-10 text-left space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] text-[#717784] uppercase tracking-wider mb-1.5">FBO Name</label>
                <input type="text" required value={form.fbo} onChange={(e) => setForm({ ...form, fbo: e.target.value })} placeholder="Acme Aviation" className="w-full h-11 bg-[#0e121b] border border-[#2b303b] focus:border-[#3b82f6] rounded-lg px-3.5 text-[14px] text-white placeholder:text-[#525866] outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-[12px] text-[#717784] uppercase tracking-wider mb-1.5">Airport ICAO</label>
                <input type="text" required value={form.icao} onChange={(e) => setForm({ ...form, icao: e.target.value.toUpperCase() })} placeholder="KABC" maxLength={4} className="w-full h-11 bg-[#0e121b] border border-[#2b303b] focus:border-[#3b82f6] rounded-lg px-3.5 font-mono text-[14px] text-white placeholder:text-[#525866] outline-none transition-colors uppercase" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] text-[#717784] uppercase tracking-wider mb-1.5">Your Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" className="w-full h-11 bg-[#0e121b] border border-[#2b303b] focus:border-[#3b82f6] rounded-lg px-3.5 text-[14px] text-white placeholder:text-[#525866] outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-[12px] text-[#717784] uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@yourfbo.com" className="w-full h-11 bg-[#0e121b] border border-[#2b303b] focus:border-[#3b82f6] rounded-lg px-3.5 text-[14px] text-white placeholder:text-[#525866] outline-none transition-colors" />
              </div>
            </div>
            <button type="submit" className="w-full h-[3.25rem] bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[16px] font-medium rounded-lg border-none cursor-pointer transition-colors mt-2">
              Apply for Founding Partner Access →
            </button>
            <p className="text-[12px] text-[#525866] text-center">Limited spots. Airports are first come, first served.</p>
          </form>
        )}
      </div>
    </section>
  )
}

/* ─── 11. FAQ ─── */
function FAQ() {
  const fade = useFadeIn()
  const [open, setOpen] = useState(null)

  const items = [
    { q: 'Do I need to change any of my existing systems?', a: "No. RampReady works alongside whatever you're already using. It's a browser tab on your existing computer. Nothing to install, no hardware, no integration required." },
    { q: "What if a pilot sends a request and we can't fulfill it?", a: "You decline with one click. The pilot is notified immediately and can select another FBO. You're never obligated to accept a request." },
    { q: 'How do fuel prices stay accurate?', a: "You update your own prices directly in your dashboard. If a price hasn't been updated in 48 hours, pilots see a 'verify before arrival' notice." },
    { q: "What does 'Year 1 free' actually mean?", a: 'Founding FBO partners get full access to every feature at no cost for 12 months. After that, you choose the plan that fits. No surprise charges, no automatic billing.' },
    { q: 'Is RampReady only for large FBOs?', a: 'The opposite. RampReady is designed for independent and small-to-medium FBOs. The big chains have their own portals. You deserve a tool built for your operation.' },
    { q: 'How does the line crew mobile view work?', a: 'Anyone on your team logs in as line crew. They see a simplified version of the same live data — next arrival, services, aircraft position. Read-only, always in sync.' },
  ]

  return (
    <section className="py-[7.5rem] px-8">
      <div ref={fade.ref} className={`max-w-[640px] mx-auto ${fade.className}`}>
        <div className="text-center mb-12">
          <Eyebrow>FAQ</Eyebrow>
          <GradientHeading className="text-[32px] md:text-[44px] leading-[1.2] tracking-[-0.03em]">
            Questions from the ramp
          </GradientHeading>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="bg-[#181b25] rounded-xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-6 py-5 text-left bg-transparent border-none cursor-pointer group">
                <span className="text-[15px] font-medium text-white pr-4 group-hover:text-[#3b82f6] transition-colors">{item.q}</span>
                <span className={`text-[#717784] text-[18px] shrink-0 transition-transform duration-300 ${open === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${open === i ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-[14px] text-[#99a0ae] leading-[1.8] px-6 pb-5">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── 12. CTA Marquee ─── */
function CTAMarquee() {
  const scroll = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return (
    <section className="py-[5rem] overflow-hidden">
      <button onClick={() => scroll('founding')} className="block w-full bg-transparent border-none cursor-pointer group">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="text-[10vw] md:text-[8vw] font-semibold text-white/10 uppercase tracking-tight leading-none group-hover:text-white/20 transition-colors px-8">
              Ready for the ramp? ✦
            </span>
          ))}
        </div>
      </button>
    </section>
  )
}

/* ─── 13. Footer ─── */
function Footer() {
  const scroll = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return (
    <footer className="border-t border-[#2b303b] py-16 px-8">
      <div className="max-w-[79rem] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <p className="text-[18px] font-semibold text-white tracking-tight mb-2">RampReady</p>
            <p className="text-[14px] text-[#717784] mb-3">Ground ops. Simplified.</p>
            <a href="mailto:hello@getrampready.com" className="text-[14px] text-[#99a0ae] hover:text-white transition-colors no-underline">
              hello@getrampready.com
            </a>
          </div>
          <div>
            <p className="text-[13px] text-[#717784] uppercase tracking-wider font-medium mb-4">Product</p>
            <div className="space-y-2.5">
              {[{ l: 'Features', id: 'features' }, { l: 'Benefits', id: 'benefits' }, { l: 'Pricing', id: 'pricing' }, { l: 'About', id: 'about' }].map((link) => (
                <button key={link.id} onClick={() => scroll(link.id)} className="block text-[14px] text-[#99a0ae] hover:text-white bg-transparent border-none cursor-pointer transition-colors">
                  {link.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[13px] text-[#717784] uppercase tracking-wider font-medium mb-4">Connect</p>
            <div className="space-y-2.5">
              {['LinkedIn', 'Instagram', 'X (Twitter)'].map((s) => (
                <p key={s} className="text-[14px] text-[#99a0ae]">{s}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[13px] text-[#717784] uppercase tracking-wider font-medium mb-4">Legal</p>
            <div className="space-y-2.5">
              <p className="text-[14px] text-[#99a0ae]">Privacy Policy</p>
              <p className="text-[14px] text-[#99a0ae]">Terms of Service</p>
            </div>
          </div>
        </div>
        <div className="border-t border-[#2b303b] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-[#525866]">&copy; 2026 RampReady LLC. All rights reserved.</p>
          <p className="text-[12px] text-[#525866] max-w-[500px] text-center md:text-right leading-relaxed">
            Fuel prices are self-reported by FBO operators and may not reflect current pricing. Always verify directly with your FBO.
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ─── Main Landing ─── */
export default function Landing() {
  const [signInOpen, setSignInOpen] = useState(false)

  return (
    <div style={{ background: c.bg }} className="min-h-screen font-['Inter',system-ui,sans-serif] antialiased">
      <Nav onSignIn={() => setSignInOpen(true)} />
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
      <Hero />
      <Mission />
      <Features />
      <Stats />
      <Benefits />
      <Testimonials />
      <Pricing />
      <About />
      <FoundingCTA />
      <FAQ />
      <CTAMarquee />
      <Footer />
    </div>
  )
}
