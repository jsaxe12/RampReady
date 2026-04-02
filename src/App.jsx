import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { FBOProvider } from './context/FBOContext'
import { PilotPortalProvider } from './pilot/PilotContext'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import LineCrew from './pages/LineCrew'
import PilotLayout from './pilot/PilotLayout'
import Home from './pilot/screens/Home'
import Search from './pilot/screens/Search'
import AirportDetail from './pilot/screens/AirportDetail'
import Calculator from './pilot/screens/Calculator'
import NewRequest from './pilot/screens/NewRequest'
import RequestTracking from './pilot/screens/RequestTracking'
import History from './pilot/screens/History'
import Messages from './pilot/screens/Messages'
import Profile from './pilot/screens/Profile'
import Notifications from './pilot/screens/Notifications'

function ProtectedRoute({ children, allowedRole }) {
  const { user, role, loading } = useAuth()
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
  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === 'pilot' ? '/pilot' : '/dashboard'} replace />
  }
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
          <ProtectedRoute allowedRole="fbo">
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
          <ProtectedRoute allowedRole="fbo">
            <FBOProvider>
              <div className="min-h-screen bg-surface-900">
                <Navbar />
                <LineCrew />
              </div>
            </FBOProvider>
          </ProtectedRoute>
        }
      />

      {/* Pilot portal routes */}
      <Route
        path="/pilot"
        element={
          <ProtectedRoute allowedRole="pilot">
            <PilotPortalProvider>
              <PilotLayout />
            </PilotPortalProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="airport/:icao" element={<AirportDetail />} />
        <Route path="calculator/:fboId" element={<Calculator />} />
        <Route path="request/new" element={<NewRequest />} />
        <Route path="request/:requestId" element={<RequestTracking />} />
        <Route path="history" element={<History />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/:requestId" element={<Messages />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>

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
