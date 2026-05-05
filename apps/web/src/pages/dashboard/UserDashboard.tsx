import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Package, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  MessageSquare,
  Bell,
  HelpCircle,
  Award,
  BarChart3,
  Shield
} from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import RecentActivity from '@/components/dashboard/RecentActivity'
import QuickActions from '@/components/dashboard/QuickActions'
import EarningsChart from '@/components/dashboard/EarningsChart'
import { useAuth } from '@/contexts/AuthContext'
import { fetchUserListings } from '@/api/endpoints/listing'
import { fetchMarketplaceOrdersForUser } from '@/api/endpoints/orders'
import type { Listing } from '@rentverse/shared'
import type { MarketplaceOrder } from '@rentverse/shared'

const UserDashboard: React.FC = () => {
  const { currentUser } = useAuth()
  const [listings, setListings] = useState<Listing[]>([])
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])

  useEffect(() => {
    const run = async () => {
      if (!currentUser) {
        setListings([])
        setOrders([])
        return
      }

      try {
        const [listingRows, orderRows] = await Promise.all([
          fetchUserListings(currentUser.id),
          fetchMarketplaceOrdersForUser(currentUser.id),
        ])
        setListings(listingRows)
        setOrders(orderRows)
      } catch {
        setListings([])
        setOrders([])
      }
    }

    void run()
  }, [currentUser])

  const metrics = useMemo(() => {
    if (!currentUser) {
      return {
        activeListings: 0,
        activeRequests: 0,
        monthlyEarnings: 0,
        responseRate: 0,
      }
    }

    const activeListings = listings.filter((listing) => listing.status === 'active').length
    const incoming = orders.filter((order) => order.sellerId === currentUser.id)
    const activeRequests = incoming.filter((order) => order.status === 'pending_seller_approval').length
    const monthlyEarnings = incoming
      .filter((order) => {
        if (order.status !== 'approved') {
          return false
        }
        const dt = new Date(order.updatedAt)
        const now = new Date()
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
      })
      .reduce((sum, order) => sum + order.totalDue, 0)

    const handled = incoming.filter((order) => order.status !== 'pending_seller_approval').length
    const approved = incoming.filter((order) => order.status === 'approved').length
    const responseRate = handled > 0 ? Math.round((approved / handled) * 100) : 0

    return {
      activeListings,
      activeRequests,
      monthlyEarnings,
      responseRate,
    }
  }, [currentUser, listings, orders])

  const stats = [
    { 
      title: 'Active Listings', 
      value: String(metrics.activeListings), 
      change: 'Live from your listings', 
      icon: Package,  // ✅ Just the component, no JSX brackets
      color: 'blue' as const,
      link: '/my-listings'
    },
    { 
      title: 'Pending Requests', 
      value: String(metrics.activeRequests), 
      change: 'Waiting for your decision', 
      icon: Calendar,  // ✅ Just the component
      color: 'green' as const,
      link: '/my-bookings'
    },
    { 
      title: 'Monthly Earnings', 
      value: `PKR ${metrics.monthlyEarnings.toLocaleString()}`, 
      change: 'Approved this month', 
      icon: DollarSign,  // ✅ Just the component
      color: 'purple' as const,
      link: '#'
    },
    { 
      title: 'Response Rate', 
      value: `${metrics.responseRate}%`, 
      change: 'Approved vs handled requests', 
      icon: MessageSquare,  // ✅ Just the component
      color: 'orange' as const,
      link: '#'
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        {/* Dashboard Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <Bell size={20} />
              <span className="hidden sm:inline">Notifications</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <HelpCircle size={20} />
              <span className="hidden sm:inline">Help</span>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <StatsCard 
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}  // ✅ Now passing the component correctly
              color={stat.color}
              subtitle={stat.change}  // ✅ Using 'change' as 'subtitle'
            />
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Earnings Chart */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Earnings Overview</h2>
                <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                  <option>Last year</option>
                </select>
              </div>
              <EarningsChart />
            </div>

            {/* Recent Activity */}
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
              <RecentActivity />
            </div>

          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <QuickActions />

            {/* Trust Score */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="text-green-600" size={24} />
                <div>
                  <h3 className="font-semibold">Trust Score</h3>
                  <div className="text-3xl font-bold text-green-600">92%</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-medium">Excellent</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Listing Quality</span>
                  <span className="font-medium">Good</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transaction Success</span>
                  <span className="font-medium">Perfect</span>
                </div>
              </div>
            </div>

            {/* Performance Tips */}
            <div className="card p-6 bg-gradient-to-r from-blue-50 to-cyan-50">
              <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <TrendingUp size={20} />
                Performance Tips
              </h3>
              <ul className="space-y-3 text-sm text-blue-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  <span>Add more photos to increase views by 40%</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  <span>Enable instant booking for faster rentals</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  <span>Offer weekly/monthly discounts</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Link 
            to="/create-listing" 
            className="card p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200">
                <Package className="text-primary-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold">List New Item</h3>
                <p className="text-sm text-gray-600">Create a new listing in 2 minutes</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/my-listings" 
            className="card p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
                <BarChart3 className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold">Analytics</h3>
                <p className="text-sm text-gray-600">View listing performance</p>
              </div>
            </div>
          </Link>

          <Link 
            to="#" 
            className="card p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200">
                <Award className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold">Become Verified</h3>
                <p className="text-sm text-gray-600">Increase trust & sales</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default UserDashboard
