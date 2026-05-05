import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from '../ui/LoadingSpinner'
import AuthPopup from '../auth/AuthPopup'
import FloatingChatbot from '../ai/FloatingChatbot'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isLoading, currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const searchParams = new URLSearchParams(location.search)
  const authMode = searchParams.get('auth')
  const popupMode =
    authMode === 'signup' ||
    authMode === 'login' ||
    authMode === 'choose' ||
    authMode === 'forgot' ||
    authMode === 'verify'
      ? authMode
      : null
  const showAuthPopup = Boolean(popupMode && !currentUser)

  const closeAuthPopup = () => {
    const updated = new URLSearchParams(location.search)
    updated.delete('auth')

    navigate(
      {
        pathname: location.pathname,
        search: updated.toString() ? `?${updated.toString()}` : '',
      },
      { replace: true }
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
      <FloatingChatbot />

      {showAuthPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            aria-label="Close auth popup"
            onClick={closeAuthPopup}
          />
          <div className="relative z-[101] w-full max-w-xl">
            <AuthPopup initialPanel={popupMode ?? undefined} onClose={closeAuthPopup} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Layout
