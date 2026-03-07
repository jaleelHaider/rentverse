import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Package, 
  Edit, 
  Eye, 
  Trash2, 
  Plus, 
  Filter, 
  MoreVertical,
  Calendar,
  DollarSign,
  TrendingUp,
  PauseCircle,
  CheckCircle,
  Search,
  BarChart3
} from 'lucide-react'
import { fetchUserListings } from '@/api/endpoints/listing'
import { useAuth } from '@/contexts/AuthContext'
import type { Listing } from '@/types'

const MyListings: React.FC = () => {
  const { currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedListings, setSelectedListings] = useState<string[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'sold', label: 'Sold', color: 'bg-blue-100 text-blue-800' },
    { value: 'rented', label: 'Rented', color: 'bg-purple-100 text-purple-800' },
    { value: 'paused', label: 'Paused', color: 'bg-gray-100 text-gray-800' }
  ]

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'buy', label: 'Buy Only' },
    { value: 'rent', label: 'Rent Only' },
    { value: 'both', label: 'Both' }
  ]

  useEffect(() => {
    const loadMyListings = async () => {
      if (!currentUser) {
        setListings([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setLoadError(null)

      try {
        const data = await fetchUserListings(currentUser.uid)
        setListings(data)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load listings.'
        setLoadError(message)
        setListings([])
      } finally {
        setIsLoading(false)
      }
    }

    void loadMyListings()
  }, [currentUser])

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || listing.status === statusFilter
    const matchesType = typeFilter === 'all' || listing.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const stats = useMemo(() => ({
    total: listings.length,
    active: listings.filter(l => l.status === 'active').length,
    rented: listings.filter(l => l.status === 'rented').length,
    sold: listings.filter(l => l.status === 'sold').length,
    views: listings.reduce((sum, l) => sum + l.views, 0),
    saves: listings.reduce((sum, l) => sum + l.saves, 0)
  }), [listings])

  const toggleSelectListing = (id: string) => {
    setSelectedListings(prev => 
      prev.includes(id) 
        ? prev.filter(listingId => listingId !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedListings.length === filteredListings.length) {
      setSelectedListings([])
    } else {
      setSelectedListings(filteredListings.map(l => l.id))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
              <p className="text-gray-600">Manage your items for sale and rent</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                to="/create-listing" 
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={20} />
                Add New Listing
              </Link>
              
              <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                <BarChart3 size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="card p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Listings</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.rented}</div>
            <div className="text-sm text-gray-500">Rented</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.sold}</div>
            <div className="text-sm text-gray-500">Sold</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.views.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Views</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.saves}</div>
            <div className="text-sm text-gray-500">Saves</div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="card p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            {/* Search */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your listings..."
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                {typeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter size={18} />
                More Filters
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedListings.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="text-blue-600" size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">
                      {selectedListings.length} listing{selectedListings.length > 1 ? 's' : ''} selected
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                    <PauseCircle size={16} className="inline mr-2" />
                    Pause
                  </button>
                  <button className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 text-sm">
                    <Trash2 size={16} className="inline mr-2" />
                    Delete
                  </button>
                  <button 
                    onClick={() => setSelectedListings([])}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Listings Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedListings.length === filteredListings.length && filteredListings.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-primary-600 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Listing
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px 6 py-4 text-left text-sm font-semibold text-gray-900">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Views/Saves
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-200">
                {filteredListings.map((listing) => {
                  const statusOption = statusOptions.find(opt => opt.value === listing.status)
                  return (
                    <tr key={listing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedListings.includes(listing.id)}
                          onChange={() => toggleSelectListing(listing.id)}
                          className="h-4 w-4 text-primary-600 rounded border-gray-300"
                        />
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <img 
                            src={listing.images[0] || 'https://images.unsplash.com/photo-1484704849700-f032a568e944'} 
                            alt={listing.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div>
                            <Link 
                              to={`/listing/${listing.id}`}
                              className="font-medium text-gray-900 hover:text-primary-600"
                            >
                              {listing.title}
                            </Link>
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {listing.description.substring(0, 60)}...
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {listing.location.area}, {listing.location.city}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          listing.type === 'buy' ? 'bg-green-100 text-green-800' :
                          listing.type === 'rent' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {listing.type === 'both' ? 'Buy & Rent' : 
                           listing.type === 'buy' ? 'Buy Only' : 'Rent Only'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        {statusOption && (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusOption.color}`}>
                            {statusOption.label}
                          </span>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {listing.price.buy && (
                            <div className="text-sm font-semibold text-green-600">
                              ₹{listing.price.buy.toLocaleString()}
                            </div>
                          )}
                          {listing.price.rent && (
                            <div className="text-xs text-blue-600">
                              ₹{listing.price.rent.daily}/day
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Eye size={14} className="text-gray-400" />
                            <span>{listing.views}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp size={14} className="text-gray-400" />
                            <span>{listing.saves}</span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {listing.createdAt}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/listing/${listing.id}`}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            title="View"
                          >
                            <Eye size={18} />
                          </Link>
                          <Link 
                            to={`/create-listing?edit=${listing.id}`}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </Link>
                          <button 
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {!isLoading && filteredListings.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Package size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-4">No listings found</h3>
              <p className="text-gray-600 mb-8">
                {loadError
                  ? loadError
                  : searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms' 
                  : 'You haven\'t created any listings yet'}
              </p>
              <Link 
                to="/create-listing" 
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Create Your First Listing
              </Link>
            </div>
          )}

          {/* Pagination */}
          {filteredListings.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-500">
                  Showing {filteredListings.length} of {listings.length} listings
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Previous
                  </button>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg">1</button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">2</button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">3</button>
                  <span className="px-2">...</span>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">10</button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Performance Tips</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>Add more photos to increase views by 40%</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>Respond to messages within 2 hours for better ranking</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>Update prices weekly based on market trends</span>
              </li>
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <span>Boost All Active Listings</span>
                <DollarSign size={18} className="text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <span>Download Listing Report</span>
                <BarChart3 size={18} className="text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <span>Set Availability Calendar</span>
                <Calendar size={18} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="card p-6 bg-primary-50">
            <h3 className="font-semibold text-primary-800 mb-4">Need Help?</h3>
            <p className="text-primary-700 text-sm mb-4">
              Our seller support team can help you optimize your listings for better performance.
            </p>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-2 text-primary-600 font-medium"
            >
              Contact Seller Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyListings