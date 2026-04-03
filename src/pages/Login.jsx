import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoMark } from '../components/Logo'

export default function Login() {
  const { login, error, clearError } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const formRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return

    // Always read from DOM — uncontrolled inputs work with all autofill methods
    const form = formRef.current
    const email = form.email.value.trim()
    const password = form.password.value

    if (!email || !password) return

    setLoading(true)
    clearError()
    const ok = await login(email, password)
    setLoading(false)
    if (ok) navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo + Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogoMark size={64} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Ramp<span className="text-sky">Ready</span>
          </h1>
          <p className="text-[13px] text-text-tertiary mt-1">FBO Portal</p>
        </div>

        {/* Login card */}
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-6">
          <h2 className="text-[14px] font-semibold text-text-primary mb-4">Sign in to your FBO</h2>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@yourfbo.com"
                required
                autoFocus
                onChange={clearError}
                className="w-full h-10 bg-surface-900 border border-surface-500 focus:border-sky rounded-lg px-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                onChange={clearError}
                className="w-full h-10 bg-surface-900 border border-surface-500 focus:border-sky rounded-lg px-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>

            {error && (
              <div className="bg-danger-muted rounded-lg px-3 py-2">
                <p className="text-[12px] text-danger">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-sky hover:bg-sky/90 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
