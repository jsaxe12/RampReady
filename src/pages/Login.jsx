import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoMark } from '../components/Logo'

export default function Login() {
  const { login, error, clearError } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    // Simulate network delay
    setTimeout(() => {
      const ok = login(email, password)
      setLoading(false)
      if (ok) navigate('/dashboard', { replace: true })
    }, 400)
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo + Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogoMark size={64} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Ramp<span className="text-sky">Ready</span>
          </h1>
          <p className="text-[13px] text-text-tertiary mt-1">FBO Operations Platform</p>
        </div>

        {/* Login card */}
        <div className="bg-surface-800 rounded-xl ring-1 ring-border p-6">
          <h2 className="text-[14px] font-semibold text-text-primary mb-4">Sign in to your FBO</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError() }}
                placeholder="ops@gillaviation.com"
                required
                autoFocus
                className="w-full h-10 bg-surface-900 border border-surface-500 focus:border-sky rounded-lg px-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError() }}
                placeholder="••••••••"
                required
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

        {/* Demo credentials hint */}
        <div className="mt-4 bg-surface-800/50 rounded-lg ring-1 ring-border/50 p-4">
          <p className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold mb-2">
            Demo Accounts
          </p>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">ops@gillaviation.com</span>
              <span className="text-text-tertiary">Ops Manager</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">csr@gillaviation.com</span>
              <span className="text-text-tertiary">CSR</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">line@gillaviation.com</span>
              <span className="text-text-tertiary">Line Lead</span>
            </div>
            <p className="text-text-tertiary mt-1">Password: <span className="font-mono text-text-secondary">rampready</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
