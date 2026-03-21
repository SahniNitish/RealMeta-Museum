import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import SplashScreen from './pages/SplashScreen'
import AdminDashboard from './pages/AdminDashboard'
import AdminUpload from './pages/AdminUpload'
import AdminCollection from './pages/AdminCollection'
import AdminQRCodes from './pages/AdminQRCodes'
import AdminAnalytics from './pages/AdminAnalytics'
import AdminSettings from './pages/AdminSettings'
import AdminProfile from './pages/AdminProfile'
import AdminLogin from './pages/AdminLogin'
import AdminRegister from './pages/AdminRegister'
import VisitorHome from './pages/VisitorHome'
import VisitorBrowse from './pages/VisitorBrowse'
import VerifyEmail from './pages/VerifyEmail'
import './index.css'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Splash / Root */}
            <Route path="/" element={<SplashScreen />} />

            {/* Auth Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />

            {/* Protected Admin Routes */}
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
                  <AdminQRCodes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute>
                  <AdminAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <ProtectedRoute>
                  <AdminProfile />
                </ProtectedRoute>
              }
            />

            {/* Visitor Routes (public) */}
            <Route path="/visit/:qrCode" element={<VisitorHome />} />
            <Route path="/visit/:qrCode/browse" element={<VisitorBrowse />} />

            {/* Email verification (public) */}
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
