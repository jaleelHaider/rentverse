import { useEffect, useLayoutEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/layout/Layout.tsx'
import AdminLayout from './components/admin/AdminLayout'
import AdminProtectedRoute from './components/admin/AdminProtectedRoute'
import Home from './pages/Home.tsx'
import BrowseListings from './pages/marketplace/BrowseListings'
import ListingDetail from './pages/marketplace/ListingDetail'
import CreateListing from './pages/marketplace/CreateListing'
import Order from './pages/marketplace/Order'
import UserDashboard from './pages/dashboard/UserDashboard'
import MyListings from './pages/dashboard/MyListings.tsx'
import MyBookings from './pages/dashboard/MyBookings'
import OAuthCallback from './pages/auth/OAuthCallback'
import Inbox from './pages/chat/Inbox'
import About from './pages/About.tsx'
import HowItWorks from './pages/HowItWorks'
import Contact from './pages/Contact'
import Categories from './pages/Categories'
import SearchAnalytics from './pages/marketplace/SearchAnalytics'
import SavedListings from './pages/marketplace/SavedListings'
import NotFound from './pages/NotFound'
import ProfileSettings from './pages/account/ProfileSettings'
import UserProfile from './pages/account/UserProfile'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminLogin from './pages/admin/Login'
import AdminDashboard from './pages/admin/Dashboard'
import KBManagement from './pages/admin/KBManagement'
import UserManagement from './pages/admin/UserManagement'
import DisputeResolution from './pages/admin/DisputeResolution'
import Workers from './pages/admin/Workers'
import Listings from './pages/admin/Listings'
import KycReview from './pages/admin/KycReview'
import AuditLogs from './pages/admin/AuditLogs'
import ContactMessages from './pages/admin/ContactMessages'
import ReportedUsers from './pages/admin/ReportedUsers'
import ReportedListings from './pages/admin/ReportedListings'
import VerifiedSellers from './pages/admin/VerifiedSellers'
import AIDetectedFrauds from './pages/admin/AIDetectedFrauds'
import AdminSearchAnalytics from './pages/admin/SearchAnalytics'
import type { AdminAccount } from '@rentverse/shared'

const ScrollToTop: React.FC = () => {
  const location = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname, location.search])

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto'
      }
    }
  }, [])

  return null
}

function App() {
  const location = useLocation()
  const isAdminPath = location.pathname.startsWith('/admin')
  const [admin, setAdmin] = useState<AdminAccount | null>(null)

  if (isAdminPath) {
    return (
      <AuthProvider>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <AdminDashboard />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <UserManagement />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/verified-sellers"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <VerifiedSellers />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/workers"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <Workers />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/listings"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <Listings />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <DisputeResolution />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/kyc"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <KycReview />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <AuditLogs />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/contact-messages"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <ContactMessages />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/reported-users"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <ReportedUsers />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/fraud-detections"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <AIDetectedFrauds />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/search-analytics"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <AdminSearchAnalytics />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/kb"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <KBManagement />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/reported-listings"
            element={
              <AdminProtectedRoute onResolved={setAdmin}>
                <AdminLayout admin={admin}>
                  <ReportedListings />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <Layout>
        <ScrollToTop />
        <Routes> 
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<BrowseListings />} />
          <Route path="/search-analytics" element={<SearchAnalytics />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          
          {/* Auth Routes */}
          <Route path="/register" element={<Navigate to="/?auth=signup" replace />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/verify-email" element={<Navigate to="/?auth=verify" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/?auth=forgot" replace />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute requireEmailVerification>
              <UserDashboard />
            </ProtectedRoute>
          } />
          <Route path="/my-listings" element={
            <ProtectedRoute requireEmailVerification>
              <MyListings />
            </ProtectedRoute>
          } />
          <Route path="/my-bookings" element={
            <ProtectedRoute requireEmailVerification>
              <MyBookings />
            </ProtectedRoute>
          } />
          <Route path="/create-listing" element={
            <ProtectedRoute requireEmailVerification>
              <CreateListing />
            </ProtectedRoute>
          } />
          <Route path="/order/:id" element={
            <ProtectedRoute requireEmailVerification>
              <Order />
            </ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute requireEmailVerification>
              <Inbox />
            </ProtectedRoute>
          } />
          <Route path="/saved" element={
            <ProtectedRoute requireEmailVerification>
              <SavedListings />
            </ProtectedRoute>
          } />
          <Route path="/profile-settings" element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          } />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}

export default App
