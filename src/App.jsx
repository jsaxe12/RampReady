import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FBOProvider } from './context/FBOContext'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import LineCrew from './pages/LineCrew'
import Login from './pages/Login'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<Landing />} />

      {/* Auth */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Protected app routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-surface-900">
              <Navbar />
              <Dashboard />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/linecrew"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-surface-900">
              <Navbar />
              <LineCrew />
            </div>
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
      <FBOProvider>
        <AppRoutes />
      </FBOProvider>
    </AuthProvider>
  )
}
