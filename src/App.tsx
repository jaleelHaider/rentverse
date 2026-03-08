import { useEffect, useLayoutEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/layout/Layout.tsx'
import Home from './pages/Home.tsx'
import BrowseListings from './pages/marketplace/BrowseListings'
import ListingDetail from './pages/marketplace/ListingDetail'
import CreateListing from './pages/marketplace/CreateListing'
import UserDashboard from './pages/dashboard/UserDashboard'
import MyListings from './pages/dashboard/MyListings.tsx'
import MyBookings from './pages/dashboard/MyBookings'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import VerifyEmail from './pages/auth/VerifyEmail'
import ForgotPassword from './pages/auth/ForgotPassword'
import Inbox from './pages/chat/inbox'
import About from './pages/About.tsx'
import HowItWorks from './pages/HowItWorks'
import Contact from './pages/Contact'
import Categories from './pages/Categories'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/auth/ProtectedRoute'

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
  return (
    <AuthProvider>
      <Layout>
        <ScrollToTop />
        <Routes> 
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<BrowseListings />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
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
          <Route path="/messages" element={
            <ProtectedRoute requireEmailVerification>
              <Inbox />
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