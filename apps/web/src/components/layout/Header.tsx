import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Search, 
  User, 
  Heart, 
  Bell, 
  MessageSquare,
  Menu, 
  X,
  Globe,
  Shield,
  Package,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import LanguageSelector from './LanguageSelector'
import ProfileDropdown from './ProfileDropdown'
import { fetchUnreadChatCount } from '@/api/endpoints/chat'
import {
  fetchUnreadNotificationSummary,
  fetchUserNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from '@/api/endpoints/notifications'
import {
  fetchMarketplaceSuggestions,
  type MarketplaceSuggestionItem,
} from '@/api/endpoints/listing'

const Header: React.FC = () => {
  const { currentUser, userData, logout, isEmailVerified, isKycVerified } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<MarketplaceSuggestionItem[]>([])
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadChats, setUnreadChats] = useState(0)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false)
  
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  const displayName =
    userData?.name?.trim() ||
    ((currentUser?.user_metadata?.full_name as string | undefined)?.trim()) ||
    currentUser?.email?.split('@')[0] ||
    'User'
  const avatarUrl =
    userData?.avatarUrl ||
    (currentUser?.user_metadata?.avatar_url as string | undefined) ||
    ''

  const getAuthPopupPath = (mode: 'choose' | 'signup' | 'login' = 'choose') => {
    const params = new URLSearchParams(location.search)
    params.set('auth', mode)
    return `${location.pathname}?${params.toString()}`
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false)
        setActiveSuggestionIndex(-1)
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
        const [chatCount, notificationSummary] = await Promise.all([
          fetchUnreadChatCount(currentUser.id),
          fetchUnreadNotificationSummary(currentUser.id),
        ])
        if (!cancelled) {
          setUnreadChats(chatCount)
          setUnreadNotifications(notificationSummary.unreadTotal)
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

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchSuggestions([])
      setSuggestedKeywords([])
      setIsSuggestionsLoading(false)
      setActiveSuggestionIndex(-1)
      return
    }

    let cancelled = false
    setIsSuggestionsLoading(true)

    const timeout = window.setTimeout(() => {
      void fetchMarketplaceSuggestions(trimmed, 6)
        .then((response) => {
          if (cancelled) {
            return
          }

          setSuggestedKeywords(Array.isArray(response.keywords) ? response.keywords.slice(0, 6) : [])
          setSearchSuggestions(Array.isArray(response.listings) ? response.listings.slice(0, 6) : [])
          setIsSuggestionsOpen(true)
          setActiveSuggestionIndex(-1)
        })
        .catch(() => {
          if (cancelled) {
            return
          }

          setSuggestedKeywords([])
          setSearchSuggestions([])
        })
        .finally(() => {
          if (!cancelled) {
            setIsSuggestionsLoading(false)
          }
        })
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [searchQuery])

  const searchNavigationItems = [
    ...suggestedKeywords.map((keyword) => ({
      id: `kw-${keyword}`,
      label: keyword,
      type: 'keyword' as const,
    })),
    ...searchSuggestions.map((listing) => ({
      id: `ls-${listing.id}`,
      label: listing.title,
      type: 'listing' as const,
      listing,
    })),
  ]

  const navigateToSearchResults = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      return
    }

    navigate(`/browse?q=${encodeURIComponent(trimmed)}`)
    setIsSuggestionsOpen(false)
    setActiveSuggestionIndex(-1)
  }

  const handleSuggestionSelect = (
    item:
      | { id: string; label: string; type: 'keyword' }
      | { id: string; label: string; type: 'listing'; listing: MarketplaceSuggestionItem }
  ) => {
    if (item.type === 'listing') {
      navigate(`/listing/${item.listing.id}`)
      setIsSuggestionsOpen(false)
      setActiveSuggestionIndex(-1)
      return
    }

    setSearchQuery(item.label)
    navigateToSearchResults(item.label)
  }

  const getSuggestionPriceText = (item: MarketplaceSuggestionItem) => {
    if (typeof item.price.buy === 'number' && item.price.buy > 0) {
      return `Rs ${item.price.buy.toLocaleString()}`
    }
    if (typeof item.price.rent?.daily === 'number' && item.price.rent.daily > 0) {
      return `Rs ${item.price.rent.daily.toLocaleString()}/day`
    }
    return 'Price on request'
  }

  const openNotifications = async () => {
    if (!currentUser) {
      navigate('/?auth=choose')
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
    navigateToSearchResults(searchQuery)
  }

  const handleCreateListing = () => {
    if (!currentUser) {
      navigate('/?auth=signup')
      return
    }
    if (!isEmailVerified) {
      navigate('/?auth=verify')
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
              to="/?auth=verify" 
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
              <Link to={getAuthPopupPath('signup')} className="hover:text-primary-200">
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

            {/* Search Bar */}
            <div ref={searchContainerRef} className="flex-1 max-w-4xl mx-6">
              <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      if (!isSuggestionsOpen && e.target.value.trim().length >= 2) {
                        setIsSuggestionsOpen(true)
                      }
                    }}
                    onFocus={() => {
                      if (searchQuery.trim().length >= 2) {
                        setIsSuggestionsOpen(true)
                      }
                    }}
                    onKeyDown={(event) => {
                      if (!isSuggestionsOpen || searchNavigationItems.length === 0) {
                        return
                      }

                      if (event.key === 'ArrowDown') {
                        event.preventDefault()
                        setActiveSuggestionIndex((prev) =>
                          prev < searchNavigationItems.length - 1 ? prev + 1 : 0
                        )
                        return
                      }

                      if (event.key === 'ArrowUp') {
                        event.preventDefault()
                        setActiveSuggestionIndex((prev) =>
                          prev > 0 ? prev - 1 : searchNavigationItems.length - 1
                        )
                        return
                      }

                      if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
                        event.preventDefault()
                        const selected = searchNavigationItems[activeSuggestionIndex]
                        if (selected) {
                          handleSuggestionSelect(selected)
                        }
                        return
                      }

                      if (event.key === 'Escape') {
                        setIsSuggestionsOpen(false)
                        setActiveSuggestionIndex(-1)
                      }
                    }}
                    placeholder="Search for anything "
                    className="w-full pl-12 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    style={{ border: '3px solid black' }}
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 transition-colors"
                >
                  Search
                </button>

                {isSuggestionsOpen && searchQuery.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                    {isSuggestionsLoading && searchNavigationItems.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-gray-500">Searching products...</p>
                    ) : (
                      <>
                        {suggestedKeywords.length > 0 && (
                          <div className="border-b border-gray-100 px-2 py-2">
                            {suggestedKeywords.map((keyword, index) => {
                              const navIndex = index
                              const isActive = activeSuggestionIndex === navIndex
                              return (
                                <button
                                  key={keyword}
                                  type="button"
                                  onMouseEnter={() => setActiveSuggestionIndex(navIndex)}
                                  onClick={() => handleSuggestionSelect({ id: `kw-${keyword}`, label: keyword, type: 'keyword' })}
                                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  <Search size={14} />
                                  <span>{keyword}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {searchSuggestions.length > 0 && (
                          <div className="max-h-80 overflow-y-auto p-2">
                            {searchSuggestions.map((item, index) => {
                              const navIndex = suggestedKeywords.length + index
                              const isActive = activeSuggestionIndex === navIndex
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onMouseEnter={() => setActiveSuggestionIndex(navIndex)}
                                  onClick={() =>
                                    handleSuggestionSelect({
                                      id: `ls-${item.id}`,
                                      label: item.title,
                                      type: 'listing',
                                      listing: item,
                                    })
                                  }
                                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                                    isActive ? 'bg-primary-50' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  {item.image ? (
                                    <img src={item.image} alt={item.title} className="h-12 w-12 rounded-md object-cover" />
                                  ) : (
                                    <div className="h-12 w-12 rounded-md bg-gray-100" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
                                    <p className="truncate text-xs text-gray-500">
                                      {item.category}
                                      {item.subCategory ? ` • ${item.subCategory}` : ''}
                                      {item.location ? ` • ${item.location}` : ''}
                                    </p>
                                  </div>
                                  <span className="text-xs font-semibold text-primary-700">{getSuggestionPriceText(item)}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {!isSuggestionsLoading && searchNavigationItems.length === 0 && (
                          <p className="px-4 py-4 text-sm text-gray-500">No matching products found.</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <Link
                to={currentUser ? '/saved' : getAuthPopupPath('choose')}
                className="hidden md:flex items-center gap-2 text-gray-700 hover:text-primary-600"
              >
                <Heart size={22} />
              </Link>
              
              <Link
                to={currentUser ? '/messages' : `/?auth=choose`}
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
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {isKycVerified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-xs text-white">✓</span>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileOpen && (
                    <div ref={profileRef}>
                      <ProfileDropdown
                        currentUser={currentUser}
                        userData={userData}
                        isEmailVerified={isEmailVerified}
                        isKycVerified={isKycVerified}
                        onClose={() => setIsProfileOpen(false)}
                        onLogout={handleLogout}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link 
                    to={getAuthPopupPath('choose')} 
                    className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-100"
                  >
                    <User size={22} />
                    <span>Sign In</span>
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
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 flex items-center justify-center text-white font-bold">
                        {displayName.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{displayName}</p>
                      <p className="text-xs text-gray-500">{userData?.email || currentUser?.email || 'User'}</p>
                    </div>
                  </div>
                  
                  {/* Mobile Links */}
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-primary-600">Dashboard</Link>
                  <Link to="/my-listings" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-primary-600">My Listings</Link>
                  <Link to="/my-bookings" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-primary-600">My Bookings</Link>
                  <Link to="/messages" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-primary-600">Messages</Link>
                  <Link to="/saved" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-primary-600">Saved Items</Link>
                  <Link to="/profile-settings" onClick={() => setIsMenuOpen(false)} className="block py-2 hover:text-primary-600">Profile Settings</Link>
                  <button onClick={handleLogout} className="text-red-600 py-2">Sign Out</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link to={getAuthPopupPath('choose')} onClick={() => setIsMenuOpen(false)} className="block py-2 btn-primary text-center">Sign In</Link>
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
