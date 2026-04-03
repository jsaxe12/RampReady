import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'fbo' | 'pilot' | null
  const [fboProfile, setFboProfile] = useState(null)
  const [pilotProfile, setPilotProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async (u) => {
    const userRole = u.user_metadata?.role || 'fbo'
    setRole(userRole)

    if (userRole === 'pilot') {
      const { data, error: err } = await supabase
        .from('pilot_profiles')
        .select('*')
        .eq('id', u.id)
        .single()
      if (!err && data) setPilotProfile(data)
    } else {
      const { data, error: err } = await supabase
        .from('fbo_profiles')
        .select('*')
        .eq('id', u.id)
        .single()
      if (!err && data) setFboProfile(data)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      if (!u) {
        setUser(null)
        setFboProfile(null)
        setPilotProfile(null)
        setRole(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const login = useCallback(async (email, password) => {
    setError(null)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      return null
    }
    // Pre-fetch profile immediately so we don't wait for onAuthStateChange
    const u = data.user
    setUser(u)
    await fetchProfile(u)
    return u
  }, [fetchProfile])

  const signUp = useCallback(async ({ email, password, role: userRole, displayName, homeAirport, tailNumber }) => {
    setError(null)
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: userRole } },
    })
    if (err) {
      setError(err.message)
      return null
    }
    if (data.user && userRole === 'pilot') {
      await supabase.from('pilot_profiles').insert({
        id: data.user.id,
        display_name: displayName,
        email,
        home_airport: homeAirport || null,
        tail_numbers: tailNumber ? [tailNumber] : [],
      })
    }
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setFboProfile(null)
    setPilotProfile(null)
    setRole(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user)
  }, [user, fetchProfile])

  return (
    <AuthContext.Provider value={{ user, role, fboProfile, pilotProfile, loading, error, login, signUp, logout, clearError, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
