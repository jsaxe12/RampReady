import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FBOProvider } from './context/FBOContext'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import LineCrew from './pages/LineCrew'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-sky border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-tertiary text-sm">Loading...</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/login" element={<Navigate to="/" replace />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <FBOProvider>
              <div className="min-h-screen bg-surface-900">
                <Navbar />
                <Dashboard />
              </div>
            </FBOProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/linecrew"
        element={
          <ProtectedRoute>
            <FBOProvider>
              <div className="min-h-screen bg-surface-900">
                <Navbar />
                <LineCrew />
              </div>
            </FBOProvider>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
