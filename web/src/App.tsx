import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SuperAdminRoute } from './components/SuperAdminRoute'
import SplashScreen from './pages/SplashScreen'
import AdminDashboard from './pages/AdminDashboard'
import AdminUpload from './pages/AdminUpload'
import AdminCollection from './pages/AdminCollection'
import AdminQRCodes from './pages/AdminQRCodes'
import AdminAnalytics from './pages/AdminAnalytics'
import AdminSettings from './pages/AdminSettings'
import AdminBilling from './pages/AdminBilling'
import AdminProfile from './pages/AdminProfile'
import AdminLogin from './pages/AdminLogin'
import AdminRegister from './pages/AdminRegister'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import SuperAdminMuseums from './pages/SuperAdminMuseums'
import SuperAdminMuseumDetail from './pages/SuperAdminMuseumDetail'
import SuperAdminUpload from './pages/SuperAdminUpload'
import SuperAdminAnalytics from './pages/SuperAdminAnalytics'
import TermsOfUse from './pages/TermsOfUse'
import PrivacyPolicy from './pages/PrivacyPolicy'
import VisitorHome from './pages/VisitorHome'
import VisitorBrowse from './pages/VisitorBrowse'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
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
            <Route path="/admin/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Legal Pages (public) */}
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />

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
              path="/admin/billing"
              element={
                <ProtectedRoute>
                  <AdminBilling />
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

            {/* Super Admin Routes */}
            <Route
              path="/superadmin"
              element={
                <SuperAdminRoute>
                  <SuperAdminDashboard />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/museums"
              element={
                <SuperAdminRoute>
                  <SuperAdminMuseums />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/museums/:id"
              element={
                <SuperAdminRoute>
                  <SuperAdminMuseumDetail />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/museums/:id/upload"
              element={
                <SuperAdminRoute>
                  <SuperAdminUpload />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/analytics"
              element={
                <SuperAdminRoute>
                  <SuperAdminAnalytics />
                </SuperAdminRoute>
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
