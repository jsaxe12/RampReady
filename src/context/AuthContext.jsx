import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

// Demo accounts for Gill Aviation
const DEMO_USERS = [
  { email: 'ops@gillaviation.com', password: 'rampready', name: 'Sarah Mitchell', role: 'Ops Manager' },
  { email: 'csr@gillaviation.com', password: 'rampready', name: 'Jake Torres', role: 'CSR' },
  { email: 'line@gillaviation.com', password: 'rampready', name: 'Marcus Dean', role: 'Line Lead' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('rampready_user')
    return saved ? JSON.parse(saved) : null
  })
  const [error, setError] = useState(null)

  const login = useCallback((email, password) => {
    const found = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )
    if (found) {
      const userData = { email: found.email, name: found.name, role: found.role }
      setUser(userData)
      setError(null)
      localStorage.setItem('rampready_user', JSON.stringify(userData))
      return true
    }
    setError('Invalid email or password')
    return false
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('rampready_user')
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return (
    <AuthContext.Provider value={{ user, error, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
