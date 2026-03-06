import React, { useEffect, useMemo, useState } from 'react'
import { 
  Filter, 
  Grid, 
  List, 
  DollarSign,
  Shield,
  TrendingUp
} from 'lucide-react'
import ListingCard from '@/components/marketplace/ListingCard'
import FilterSidebar from '@/components/marketplace/FilterSidebar'
import { fetchMarketplaceListings } from '@/api/endpoints/listing'
import type { Listing } from '@/types'

const BrowseListings: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState('relevant')
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const sortOptions = [
    { value: 'relevant', label: 'Most Relevant' },
    { value: 'newest', label: 'Newest First' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'trust', label: 'Most Trusted' },
  ]

  useEffect(() => {
    const loadListings = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const data = await fetchMarketplaceListings()
        setListings(data)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load listings.'
        setLoadError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadListings()
  }, [])

  const sortedListings = useMemo(() => {
    const getBasePrice = (listing: Listing): number => {
      if (listing.price.rent?.daily) return listing.price.rent.daily
      if (listing.price.buy) return listing.price.buy
      return 0
    }

    const items = [...listings]
    if (sortBy === 'newest' || sortBy === 'relevant') {
      return items
    }
    if (sortBy === 'price_low') {
      return items.sort((a, b) => getBasePrice(a) - getBasePrice(b))
    }
    if (sortBy === 'price_high') {
      return items.sort((a, b) => getBasePrice(b) - getBasePrice(a))
    }
    if (sortBy === 'rating' || sortBy === 'trust') {
      return items.sort((a, b) => b.seller.trustScore - a.seller.trustScore)
    }
    return items
  }, [listings, sortBy])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Browse Listings</h1>
              <p className="text-gray-600">{sortedListings.length.toLocaleString()} items available for rent and sale</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-700">Sort by:</span>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 ${viewMode === 'grid' ? 'bg-gray-100' : 'bg-white'}`}
                >
                  <Grid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 ${viewMode === 'list' ? 'bg-gray-100' : 'bg-white'}`}
                >
                  <List size={20} />
                </button>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg"
              >
                <Filter size={20} />
                Filters
              </button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
              <Shield size={16} className="text-blue-600" />
              <span className="text-sm font-medium">234 Verified Sellers</span>
            </div>
            <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
              <TrendingUp size={16} className="text-green-600" />
              <span className="text-sm font-medium">89 Items for Rent Today</span>
            </div>
            <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg">
              <DollarSign size={16} className="text-purple-600" />
              <span className="text-sm font-medium">Best Price Guarantee</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:block ${showFilters ? 'block fixed inset-0 z-50 bg-white p-6 overflow-auto' : 'hidden'}`}>
            {showFilters && (
              <div className="flex justify-between items-center mb-6 lg:hidden">
                <h2 className="text-xl font-bold">Filters</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            )}
            <FilterSidebar />
          </div>

          {/* Listings Grid */}
          <div className="flex-1">
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}`}>
              {sortedListings.map(listing => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  viewMode={viewMode}
                />
              ))}
            </div>

            {isLoading && (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">
                Loading listings...
              </div>
            )}

            {loadError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
                {loadError}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && !loadError && sortedListings.length > 0 && (
            <div className="mt-12 flex justify-center">
              <nav className="flex items-center gap-2">
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
              </nav>
            </div>
            )}

            {/* Empty State */}
            {!isLoading && !loadError && sortedListings.length === 0 && (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <Filter size={40} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-4">No listings found</h3>
                <p className="text-gray-600 mb-8">Try adjusting your filters or search terms</p>
                <button 
                  onClick={() => setShowFilters(true)}
                  className="btn-primary"
                >
                  Adjust Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"></div>
      )}
    </div>
  )
}

export default BrowseListings