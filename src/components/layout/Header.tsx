import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Search, 
  User, 
  Heart, 
  Bell, 
  MessageSquare,
  ChevronDown, 
  Menu, 
  X,
  Globe,
  Shield,
  Package,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import CategoryDropdown from './CategoryDropdown'
import LanguageSelector from './LanguageSelector'
import ProfileDropdown from './ProfileDropdown'
import { fetchUnreadChatCount, fetchUnreadNotificationCount } from '@/api/endpoints/chat'
import {
  fetchUserNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from '@/api/endpoints/notifications'

const Header: React.FC = () => {
  const { currentUser, userData, logout, isEmailVerified } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadChats, setUnreadChats] = useState(0)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false)
  
  const categoryContainerRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  const displayName =
    userData?.name?.trim() ||
    ((currentUser?.user_metadata?.full_name as string | undefined)?.trim()) ||
    currentUser?.email?.split('@')[0] ||
    'User'

  const displayEmail = userData?.email || currentUser?.email || 'User'

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryContainerRef.current &&
        !categoryContainerRef.current.contains(event.target as Node)
      ) {
        setIsCategoryOpen(false)
      }

      if (
        profileRef.current && 
        !profileRef.current.contains(event.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false)
      }

      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadCounts = async () => {
      if (!currentUser) {
        setUnreadChats(0)
        setUnreadNotifications(0)
        setNotifications([])
        return
      }

      try {
        const [chatCount, notificationCount] = await Promise.all([
          fetchUnreadChatCount(currentUser.id),
          fetchUnreadNotificationCount(currentUser.id),
        ])
        if (!cancelled) {
          setUnreadChats(chatCount)
          setUnreadNotifications(notificationCount)
        }
      } catch {
        // Keep header resilient even if counters fail.
      }
    }

    void loadCounts()

    const intervalId = window.setInterval(() => {
      void loadCounts()
    }, 30000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [currentUser])

  const openNotifications = async () => {
    if (!currentUser) {
      navigate('/login')
      return
    }

    setIsNotificationsOpen(true)
    setIsNotificationsLoading(true)

    try {
      const items = await fetchUserNotifications(currentUser.id, 10)
      setNotifications(items)

      if (unreadNotifications > 0) {
        await markAllNotificationsRead(currentUser.id)
        setUnreadNotifications(0)
        setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })))
      }
    } catch {
      setNotifications([])
    } finally {
      setIsNotificationsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleCreateListing = () => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/create-listing' } })
      return
    }
    if (!isEmailVerified) {
      navigate('/verify-email')
      return
    }
    navigate('/create-listing')
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
      setIsMenuOpen(false)
      setIsProfileOpen(false)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">
       {/* Email Verification Alert - Only show if user exists AND email is NOT verified */}
      {currentUser && !isEmailVerified && (
        <div className="bg-yellow-50 border-b border-yellow-200 py-2">
          <div className="container-custom flex items-center justify-center gap-2 text-sm">
            <AlertCircle size={16} className="text-yellow-600" />
            <span className="text-yellow-800">
              Please verify your email to access all features.
            </span>
            <Link 
              to="/verify-email" 
              className="text-yellow-700 underline font-medium hover:text-yellow-900"
            >
              Verify Now
            </Link>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-primary-900 text-white py-2 px-4">
        <div className="container-custom flex justify-between items-center text-sm">
          <div className="flex items-center space-x-6">
            <Link to="/" className="hover:text-primary-200 flex items-center gap-2">
              <Globe size={16} />
              <span>Pakistan</span>
            </Link>
            <Link to="/how-it-works" className="hover:text-primary-200">
              How it works
            </Link>
            <Link to="/categories" className="hover:text-primary-200">
              Browse Categories
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <LanguageSelector />
            <Link to="/contact" className="hover:text-primary-200">
              Help & Contact
            </Link>
            {currentUser ? (
              <Link to="/dashboard" className="hover:text-primary-200 flex items-center gap-2">
                <Shield size={16} />
                <span>Seller Dashboard</span>
              </Link>
            ) : (
              <Link to="/register" className="hover:text-primary-200">
                Sell on RentVerse
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="py-4 px-4">
        <div className="container-custom">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white p-2 rounded-lg">
                <Package size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  RentVerse
                </h1>
                <p className="text-xs text-gray-500">Buy • Sell • Rent • Earn</p>
              </div>
            </Link>

            {/* Category Selector - Desktop */}
            <div ref={categoryContainerRef} className="hidden lg:block relative ml-2"> 
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
              >
                <span className="font-medium">All Categories</span>
                <ChevronDown size={20} />
              </button>
              {isCategoryOpen && (
                <CategoryDropdown onLinkClick={() => setIsCategoryOpen(false)} />
              )}
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-6">
              <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for anything "
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 transition-colors"
                >
                  Search
                </button>
              </form>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <button className="hidden md:flex items-center gap-2 text-gray-700 hover:text-primary-600">
                <Heart size={22} />
                <span className="text-sm">Saved</span>
              </button>
              
              <Link
                to={currentUser ? '/messages' : '/login'}
                className="hidden md:inline-flex items-center justify-center text-gray-700 hover:text-primary-600 relative"
                aria-label="Open messages"
              >
                <MessageSquare size={22} />
                {unreadChats > 0 ? (
                  <span className="absolute -top-2 -right-2 min-w-5 rounded-full bg-primary-600 px-1 text-center text-xs text-white">
                    {unreadChats > 9 ? '9+' : unreadChats}
                  </span>
                ) : null}
              </Link>

              <div ref={notificationRef} className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => {
                    if (isNotificationsOpen) {
                      setIsNotificationsOpen(false)
                      return
                    }
                    void openNotifications()
                  }}
                  className="inline-flex items-center justify-center text-gray-700 hover:text-primary-600 relative"
                  aria-label="Open notifications"
                >
                  <Bell size={22} />
                  {unreadNotifications > 0 ? (
                    <span className="absolute -top-2 -right-2 min-w-5 rounded-full bg-red-500 px-1 text-center text-xs text-white">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  ) : null}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-3 w-96 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      <Link to="/my-bookings" className="text-xs text-primary-600 hover:text-primary-700">
                        Open bookings
                      </Link>
                    </div>

                    {isNotificationsLoading ? (
                      <p className="py-5 text-center text-sm text-gray-500">Loading...</p>
                    ) : notifications.length === 0 ? (
                      <p className="py-5 text-center text-sm text-gray-500">No notifications yet.</p>
                    ) : (
                      <div className="max-h-80 space-y-2 overflow-y-auto">
                        {notifications.map((item) => {
                          const targetPath = item.type === 'message' ? '/messages' : '/my-bookings'
                          return (
                            <Link
                              key={item.id}
                              to={targetPath}
                              onClick={() => setIsNotificationsOpen(false)}
                              className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
                            >
                              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                              <p className="mt-1 text-sm text-gray-600">{item.body}</p>
                              <p className="mt-1 text-xs text-gray-400">
                                {new Date(item.createdAt).toLocaleString()}
                              </p>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={handleCreateListing}
                className="hidden md:block btn-primary py-2 px-6 text-sm font-semibold"
              >
                List Item
              </button>

              {currentUser ? (
                <div className="flex items-center gap-3 relative">
                  <button
                    ref={profileButtonRef}
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-1 pr-2 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      {isEmailVerified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-xs text-white">✓</span>
                        </div>
                      )}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[120px]">
                        {displayEmail}
                      </p>
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={`text-gray-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileOpen && (
                    <div ref={profileRef}>
                      <ProfileDropdown
                        currentUser={currentUser}
                        userData={userData}
                        isEmailVerified={isEmailVerified}
                        onClose={() => setIsProfileOpen(false)}
                        onLogout={handleLogout}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link 
                    to="/login" 
                    className="flex items-center gap-2 text-gray-700 hover:text-primary-600"
                  >
                    <User size={22} />
                    <span className="text-sm hidden lg:inline">Sign In</span>
                  </Link>
                  <span className="text-gray-300 hidden lg:inline">|</span>
                  <Link 
                    to="/register" 
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Join Now
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 px-4 py-4">
          <div className="container-custom space-y-4">
            <div className="flex flex-col space-y-3">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-primary-600">Home</Link>
              <Link to="/browse" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-primary-600">Browse All</Link>
              <Link to="/categories" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-primary-600">Categories</Link>
              <Link to="/how-it-works" onClick={() => setIsMenuOpen(false)} className="py-2 hover:text-primary-600">How It Works</Link>
              <button onClick={() => { handleCreateListing(); setIsMenuOpen(false); }} className="py-2 btn-primary text-center">List Item</button>
            </div>
            <div className="pt-4 border-t border-gray-200">
              {currentUser ? (
                <div className="space-y-3">
                  {/* Mobile Profile Info */}
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 flex items-center justify-center text-white font-bold">
                      {userData?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-medium">{userData?.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{userData?.email || 'User'}</p>
                    </div>
                  </div>
                  
                  {/* Mobile Links */}
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-primary-600">Dashboard</Link>
                  <Link to="/my-listings" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-primary-600">My Listings</Link>
                  <Link to="/my-bookings" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-primary-600">My Bookings</Link>
                  <Link to="/messages" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-primary-600">Messages</Link>
                  <Link to="/settings" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-primary-600">Settings</Link>
                  <button onClick={handleLogout} className="text-red-600 py-2">Sign Out</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-primary-600">Sign In</Link>
                  <Link to="/register" onClick={() => setIsMenuOpen(false)} className="block py-2 btn-primary text-center">Join Free</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header 