import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Calendar, 
  Package, 
  User, 
  DollarSign, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageCircle,
  Star,
  Filter,
  Download,
  ChevronRight,
  MapPin
} from 'lucide-react'

// Define proper TypeScript interfaces
interface RentalDates {
  start: string
  end: string
  totalDays: number
}

interface RentalPricing {
  dailyRate: number
  totalRent: number
  securityDeposit: number
  platformFee: number
  totalAmount: number
}

interface RentalBooking {
  id: string
  listingId: string
  listingTitle: string
  listingImage: string
  renterName: string
  renterAvatar: string
  ownerName: string
  ownerAvatar: string
  dates: RentalDates
  pricing: RentalPricing
  status: string
  paymentStatus: string
  createdAt: string
  type: 'rental'
  buyerName?: never
  buyerAvatar?: never
  sellerName?: never
  sellerAvatar?: never
  amount?: never
  completedAt?: string
  cancelledAt?: string
}

interface SaleBooking {
  id: string
  listingId: string
  listingTitle: string
  listingImage: string
  buyerName: string
  buyerAvatar: string
  sellerName: string
  sellerAvatar: string
  amount: number
  platformFee: number
  totalAmount: number
  status: string
  paymentStatus: string
  createdAt: string
  type: 'sale'
  renterName?: never
  renterAvatar?: never
  ownerName?: never
  ownerAvatar?: never
  dates?: never
  pricing?: never
  completedAt?: string
  cancelledAt?: string
}

type Booking = RentalBooking | SaleBooking

const MyBookings: React.FC = () => {
  const [bookingView, setBookingView] = useState<'incoming' | 'outgoing'>('incoming')
  const [activeTab, setActiveTab] = useState<'upcoming' | 'active' | 'past' | 'cancelled'>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')

  const bookings: Booking[] = [
    {
      id: 'booking-1',
      listingId: '1',
      listingTitle: 'Sony A7III Camera with 24-70mm Lens',
      listingImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
      renterName: 'Ahmed Raza',
      renterAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed',
      ownerName: 'Ali Khan',
      ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali',
      dates: {
        start: '2024-01-20',
        end: '2024-01-25',
        totalDays: 5
      },
      pricing: {
        dailyRate: 3000,
        totalRent: 15000,
        securityDeposit: 50000,
        platformFee: 750,
        totalAmount: 65750
      },
      status: 'upcoming',
      paymentStatus: 'held',
      createdAt: '2024-01-15',
      type: 'rental'
    },
    {
      id: 'booking-2',
      listingId: '2',
      listingTitle: 'MacBook Pro M2 16" - Like New',
      listingImage: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400',
      renterName: 'Sara Ahmed',
      renterAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sara',
      ownerName: 'You',
      ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
      dates: {
        start: '2024-01-18',
        end: '2024-01-24',
        totalDays: 6
      },
      pricing: {
        dailyRate: 2500,
        totalRent: 15000,
        securityDeposit: 40000,
        platformFee: 750,
        totalAmount: 55750
      },
      status: 'active',
      paymentStatus: 'held',
      createdAt: '2024-01-10',
      type: 'rental'
    },
    {
      id: 'booking-3',
      listingId: '3',
      listingTitle: 'Canon EOS R5 Mirrorless Camera',
      listingImage: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400',
      buyerName: 'Fatima Malik',
      buyerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima',
      sellerName: 'You',
      sellerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
      amount: 320000,
      platformFee: 9600,
      totalAmount: 329600,
      status: 'completed',
      paymentStatus: 'released',
      createdAt: '2024-01-05',
      completedAt: '2024-01-08',
      type: 'sale'
    },
    {
      id: 'booking-4',
      listingId: '4',
      listingTitle: 'DJI Mavic 3 Pro Drone',
      listingImage: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400',
      renterName: 'Omar Farooq',
      renterAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Omar',
      ownerName: 'You',
      ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
      dates: {
        start: '2024-02-01',
        end: '2024-02-03',
        totalDays: 2
      },
      pricing: {
        dailyRate: 5000,
        totalRent: 10000,
        securityDeposit: 75000,
        platformFee: 500,
        totalAmount: 85500
      },
      status: 'cancelled',
      paymentStatus: 'refunded',
      createdAt: '2024-01-12',
      cancelledAt: '2024-01-14',
      type: 'rental'
    }
  ]

  const matchesBookingView = (booking: Booking) => {
    if (booking.type === 'rental') {
      return bookingView === 'incoming' ? booking.ownerName === 'You' : booking.ownerName !== 'You'
    }

    return bookingView === 'incoming' ? booking.sellerName === 'You' : booking.sellerName !== 'You'
  }

  const bookingsForView = bookings.filter(matchesBookingView)

  const filteredBookings = bookingsForView.filter(booking => {
    const matchesTab = 
      (activeTab === 'upcoming' && booking.status === 'upcoming') ||
      (activeTab === 'active' && booking.status === 'active') ||
      (activeTab === 'past' && booking.status === 'completed') ||
      (activeTab === 'cancelled' && booking.status === 'cancelled')
    
    const matchesSearch = booking.listingTitle.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesTab && matchesSearch
  })

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: bookingsForView.filter(b => b.status === 'upcoming').length },
    { id: 'active', label: 'Active', count: bookingsForView.filter(b => b.status === 'active').length },
    { id: 'past', label: 'Past', count: bookingsForView.filter(b => b.status === 'completed').length },
    { id: 'cancelled', label: 'Cancelled', count: bookingsForView.filter(b => b.status === 'cancelled').length }
  ]

  const stats = {
    totalEarnings: bookingsForView.reduce((sum, booking) => {
      if (booking.type === 'rental') {
        return sum + (booking.status === 'completed' ? booking.pricing.totalAmount : 0)
      } else {
        return sum + (booking.status === 'completed' ? booking.totalAmount : 0)
      }
    }, 0),
    upcomingBookings: bookingsForView.filter(b => b.status === 'upcoming').length,
    activeBookings: bookingsForView.filter(b => b.status === 'active').length,
    completedTransactions: bookingsForView.filter(b => b.status === 'completed').length
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-purple-100 text-purple-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'upcoming': return <Clock size={16} />
      case 'active': return <CheckCircle size={16} />
      case 'completed': return <CheckCircle size={16} />
      case 'cancelled': return <XCircle size={16} />
      default: return <AlertCircle size={16} />
    }
  }

  // Helper function to get user display info based on booking type
  const getUserDisplayInfo = (booking: Booking) => {
    if (booking.type === 'rental') {
      return {
        name: booking.ownerName === 'You' ? booking.renterName : booking.ownerName,
        avatar: booking.ownerName === 'You' ? booking.renterAvatar : booking.ownerAvatar,
        role: booking.ownerName === 'You' ? 'Renter' : 'Owner'
      }
    } else {
      return {
        name: booking.sellerName === 'You' ? booking.buyerName : booking.sellerName,
        avatar: booking.sellerName === 'You' ? booking.buyerAvatar : booking.sellerAvatar,
        role: booking.sellerName === 'You' ? 'Buyer' : 'Seller'
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
              <p className="text-gray-600">
                {bookingView === 'incoming'
                  ? 'Bookings and purchases on your listings'
                  : 'Rentals and purchases you made from others'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download size={18} />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">PKR {stats.totalEarnings.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Total Earnings</div>
              </div>
              <DollarSign className="text-green-500" size={24} />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.upcomingBookings}</div>
                <div className="text-sm text-gray-500">Upcoming</div>
              </div>
              <Clock className="text-blue-500" size={24} />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.activeBookings}</div>
                <div className="text-sm text-gray-500">Active Now</div>
              </div>
              <CheckCircle className="text-green-500" size={24} />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.completedTransactions}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <Package className="text-purple-500" size={24} />
            </div>
          </div>
        </div>

        {/* Tabs & Controls */}
        <div className="card p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => {
                setBookingView('incoming')
                setActiveTab('upcoming')
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                bookingView === 'incoming'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              My Items Booked
            </button>
            <button
              onClick={() => {
                setBookingView('outgoing')
                setActiveTab('upcoming')
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                bookingView === 'outgoing'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              My Bookings/Purchases
            </button>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bookings..."
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>

          {/* Tab-specific Actions */}
          {activeTab === 'upcoming' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-blue-600" size={20} />
                  <div>
                    <p className="font-medium text-blue-800">Upcoming Bookings</p>
                    <p className="text-sm text-blue-700">
                      Confirm pickup/delivery details with your renter/buyer
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Send Reminders
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {filteredBookings.map((booking) => {
            const userInfo = getUserDisplayInfo(booking)
            
            return (
              <div key={booking.id} className="card p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Listing Image */}
                  <div className="lg:w-48">
                    <img 
                      src={booking.listingImage} 
                      alt={booking.listingTitle}
                      className="w-full h-48 lg:h-full object-cover rounded-lg"
                    />
                  </div>

                  {/* Booking Details */}
                  <div className="flex-1">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                      <div>
                        <Link 
                          to={`/listing/${booking.listingId}`}
                          className="text-xl font-bold text-gray-900 hover:text-primary-600"
                        >
                          {booking.listingTitle}
                        </Link>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                            {getStatusIcon(booking.status)}
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {booking.type === 'rental' ? 'Rental' : 'Sale'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          PKR {booking.type === 'rental' 
                            ? booking.pricing.totalAmount.toLocaleString() 
                            : booking.totalAmount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.type === 'rental' ? 'Total amount' : 'Sale price'}
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                      {/* Dates - Only for rentals */}
                      {booking.type === 'rental' && booking.dates && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                            <Calendar size={16} />
                            Rental Dates
                          </h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Start:</span>
                              <span className="font-medium">{booking.dates.start}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">End:</span>
                              <span className="font-medium">{booking.dates.end}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Duration:</span>
                              <span className="font-medium">{booking.dates.totalDays} days</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sale-specific details */}
                      {booking.type === 'sale' && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Sale Details</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Item Price:</span>
                              <span className="font-medium">PKR {booking.amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Platform Fee:</span>
                              <span className="font-medium">PKR {booking.platformFee.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Completed:</span>
                              <span className="font-medium">{booking.completedAt || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* User Info */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                          <User size={16} />
                          {userInfo.role}
                        </h4>
                        <div className="flex items-center gap-3">
                          <img 
                            src={userInfo.avatar} 
                            alt={userInfo.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="font-medium">{userInfo.name}</p>
                            <div className="flex items-center gap-1">
                              <Star size={12} className="text-yellow-400 fill-current" />
                              <span className="text-sm text-gray-500">4.8 (24 reviews)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Status */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Payment Status</h4>
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                          booking.paymentStatus === 'held' ? 'bg-blue-100 text-blue-800' :
                          booking.paymentStatus === 'released' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {booking.paymentStatus === 'held' ? 'In Escrow' :
                           booking.paymentStatus === 'released' ? 'Released' : 'Refunded'}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {booking.createdAt ? `Created: ${booking.createdAt}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
                      {booking.status === 'upcoming' && booking.type === 'rental' && (
                        <>
                          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2">
                            <CheckCircle size={18} />
                            Confirm Handover
                          </button>
                          <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2">
                            <MessageCircle size={18} />
                            Chat
                          </button>
                          <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2">
                            <MapPin size={18} />
                            View Location
                          </button>
                        </>
                      )}
                      
                      {booking.status === 'active' && booking.type === 'rental' && (
                        <>
                          <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2">
                            <CheckCircle size={18} />
                            Mark as Complete
                          </button>
                          <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 flex items-center gap-2">
                            <AlertCircle size={18} />
                            Report Issue
                          </button>
                        </>
                      )}
                      
                      <Link 
                        to={`/booking/${booking.id}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2"
                      >
                        View Details
                        <ChevronRight size={18} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Empty State */}
          {filteredBookings.length === 0 && (
            <div className="card p-12 text-center">
              <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Calendar size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-4">No bookings found</h3>
              <p className="text-gray-600 mb-8">
                {activeTab === 'upcoming'
                  ? bookingView === 'incoming'
                    ? 'No one has created an upcoming booking on your listings yet'
                    : 'You have no upcoming bookings or purchases'
                  : activeTab === 'active'
                    ? bookingView === 'incoming'
                      ? 'You have no active bookings on your listings'
                      : 'You have no active bookings right now'
                    : activeTab === 'past'
                      ? bookingView === 'incoming'
                        ? 'No completed bookings found for your listings'
                        : 'You have no completed bookings or purchases'
                      : bookingView === 'incoming'
                        ? 'No cancelled bookings found for your listings'
                        : 'You have no cancelled bookings'}
              </p>
              {activeTab === 'upcoming' && (
                <Link 
                  to="/browse" 
                  className="btn-primary inline-flex items-center gap-2"
                >
                  Browse Items to Rent
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Need Help with a Booking?</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-500 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Item not as described?</p>
                  <p className="text-sm text-gray-600">File a dispute within 48 hours of delivery</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="text-green-500 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-gray-900">Payment issue?</p>
                  <p className="text-sm text-gray-600">Contact our payment support team</p>
                </div>
              </div>
            </div>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-2 text-primary-600 font-medium mt-6"
            >
              Get Help Now
            </Link>
          </div>

          <div className="card p-6 bg-primary-50">
            <h3 className="font-semibold text-primary-800 mb-4">Booking Tips</h3>
            <ul className="space-y-3 text-primary-700">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>Always inspect items thoroughly before accepting</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>Use in-app messaging for all communication</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>Report issues within 48 hours for dispute resolution</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyBookings