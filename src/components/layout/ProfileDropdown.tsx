// src/components/layout/ProfileDropdown.tsx
import React from 'react'
import { Link } from 'react-router-dom'
import {
  Home,
  List,
  Calendar,
  MessageSquare,
  Heart,
  BarChart,
  CreditCard,
  ShieldCheck,
  Star,
  User as UserIcon,
  Settings,
  Wallet,
  HelpCircle,
  LogOut,
  Shield,
  AlertCircle,
  Bell
} from 'lucide-react'
import { User } from 'firebase/auth'

interface UserData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  emailVerified: boolean;
  profileCompleted: boolean;
  createdAt: string;
  lastLogin: string;
}

interface ProfileDropdownProps {
  currentUser: User | null;
  userData: UserData | null;
  isEmailVerified: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  currentUser,
  userData,
  isEmailVerified,
  onClose,
  onLogout
}) => {
  const displayName =
    userData?.name?.trim() ||
    currentUser?.displayName?.trim() ||
    currentUser?.email?.split('@')[0] ||
    'User'

  const displayEmail = userData?.email || currentUser?.email || ''

  const menuItems = {
    main: [
      { icon: <Home size={18} />, label: 'Dashboard', path: '/dashboard', color: 'text-primary-600' },
      { icon: <List size={18} />, label: 'My Listings', path: '/my-listings', color: 'text-green-600' },
      { icon: <Calendar size={18} />, label: 'My Bookings', path: '/my-bookings', color: 'text-blue-600' },
      { icon: <MessageSquare size={18} />, label: 'Messages', path: '/messages', badge: '3', color: 'text-purple-600' },
      { icon: <Heart size={18} />, label: 'Saved Items', path: '/saved', color: 'text-pink-600' },
    ],
    seller: [
      { icon: <BarChart size={18} />, label: 'Seller Dashboard', path: '/seller-dashboard', color: 'text-orange-600' },
      { icon: <CreditCard size={18} />, label: 'Earnings & Payouts', path: '/earnings', color: 'text-green-600' },
      { icon: <ShieldCheck size={18} />, label: 'Verification Status', path: '/verification', color: 'text-blue-600' },
      { icon: <Star size={18} />, label: 'Reviews & Ratings', path: '/reviews', color: 'text-yellow-600' },
    ],
    account: [
      { icon: <UserIcon size={18} />, label: 'Profile Settings', path: '/profile', color: 'text-gray-600' },
      { icon: <Settings size={18} />, label: 'Account Settings', path: '/account', color: 'text-gray-600' },
      { icon: <Wallet size={18} />, label: 'Payment Methods', path: '/payments', color: 'text-gray-600' },
      { icon: <HelpCircle size={18} />, label: 'Help & Support', path: '/help', color: 'text-gray-600' },
    ]
  }

  const getInitial = () => {
    return displayName.charAt(0).toUpperCase() || 'U'
  }

  const getMemberSince = () => {
    if (userData?.createdAt) {
      return new Date(userData.createdAt).getFullYear()
    }
    return new Date().getFullYear()
  }

  return (
    <div className="fixed right-4 top-20 w-80 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 max-h-[80vh] flex flex-col">
      {/* User Info Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
            {getInitial()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{displayName}</h3>
            <p className="text-sm text-gray-500 truncate">
              {displayEmail}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {isEmailVerified ? (
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={10} />
                  Verified
                </span>
              ) : (
                <Link 
                  to="/verify-email" 
                  className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full hover:bg-yellow-200"
                  onClick={onClose}
                >
                  <AlertCircle size={10} />
                  Verify Email
                </Link>
              )}
              <span className="text-xs text-gray-500 truncate">
                Member since {getMemberSince()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Main Menu */}
        <div className="mb-2">
          <div className="px-2 mb-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3">Main</p>
          </div>
          {menuItems.main.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 group"
              onClick={onClose}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.color.replace('text-', 'bg-')} bg-opacity-10 group-hover:bg-opacity-20`}>
                  {item.icon}
                </div>
                <span className="font-medium text-gray-700">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Seller Section */}
        {userData?.profileCompleted && (
          <div className="mb-2 border-t border-gray-100 pt-2">
            <div className="px-2 mb-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3">Seller Tools</p>
            </div>
            {menuItems.seller.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group"
                onClick={onClose}
              >
                <div className={`p-2 rounded-lg ${item.color.replace('text-', 'bg-')} bg-opacity-10 group-hover:bg-opacity-20`}>
                  {item.icon}
                </div>
                <span className="font-medium text-gray-700">{item.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Account Settings */}
        <div className="border-t border-gray-100 pt-2">
          <div className="px-2 mb-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3">Account</p>
          </div>
          {menuItems.account.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group"
              onClick={onClose}
            >
              <div className={`p-2 rounded-lg ${item.color.replace('text-', 'bg-')} bg-opacity-10 group-hover:bg-opacity-20`}>
                {item.icon}
              </div>
              <span className="font-medium text-gray-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Logout Button */}
      <div className="border-t border-gray-100 pt-2 flex-shrink-0">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 group"
        >
          <div className="p-2 rounded-lg bg-red-100 bg-opacity-10 group-hover:bg-opacity-20">
            <LogOut size={18} className="text-red-600" />
          </div>
          <span className="font-medium">Sign Out</span>
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Shield size={12} />
            <span>Secure Account</span>
          </div>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  )
}

export default ProfileDropdown