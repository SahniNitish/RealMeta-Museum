import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import AdminDashboard from './pages/AdminDashboard'
import AdminUpload from './pages/AdminUpload'
import AdminCollection from './pages/AdminCollection'
import AdminPlaceholder from './pages/AdminPlaceholder'
import AdminLogin from './pages/AdminLogin'
import AdminRegister from './pages/AdminRegister'
import VisitorHome from './pages/VisitorHome'
import VisitorBrowse from './pages/VisitorBrowse'
import './index.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />

          {/* Protected Admin Routes */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/upload"
            element={
              <ProtectedRoute>
                <AdminUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/collection"
            element={
              <ProtectedRoute>
                <AdminCollection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/qr-codes"
            element={
              <ProtectedRoute>
                <AdminPlaceholder title="QR Codes" description="Generate and manage museum QR codes" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute>
                <AdminPlaceholder title="Analytics" description="View visitor statistics and engagement metrics" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute>
                <AdminPlaceholder title="Settings" description="Manage your museum settings and preferences" />
              </ProtectedRoute>
            }
          />

          {/* Visitor Routes (public - no login required) */}
          <Route path="/visit/:qrCode" element={<VisitorHome />} />
          <Route path="/visit/:qrCode/browse" element={<VisitorBrowse />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
