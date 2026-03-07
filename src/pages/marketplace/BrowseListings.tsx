import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import type { MarketplaceFilters } from '@/components/marketplace/FilterSidebar'
import { fetchMarketplaceListings } from '@/api/endpoints/listing'
import type { Listing } from '@/types'

const getListingBasePrice = (listing: Listing): number => {
  const candidates = [listing.price.rent?.daily, listing.price.buy].filter(
    (value): value is number => typeof value === 'number' && value > 0
  )

  if (!candidates.length) {
    return 0
  }

  return Math.min(...candidates)
}

const computePriceBounds = (items: Listing[]): [number, number] => {
  const prices = items
    .map(getListingBasePrice)
    .filter((value) => Number.isFinite(value) && value > 0)

  if (!prices.length) {
    return [0, 0]
  }

  return [Math.min(...prices), Math.max(...prices)]
}

const normalizePriceRangeForBounds = (
  range: [number, number],
  bounds: [number, number]
): [number, number] => {
  const [minBound, maxBound] = bounds

  if (maxBound <= 0) {
    return [0, 0]
  }

  const [currentMin, currentMax] = range
  const isUnsetRange = currentMin === 0 && currentMax === 0
  const isCompletelyOutOfBounds = currentMax < minBound || currentMin > maxBound

  if (isUnsetRange || isCompletelyOutOfBounds) {
    return [minBound, maxBound]
  }

  const nextMin = Math.min(Math.max(currentMin, minBound), maxBound)
  const nextMax = Math.max(Math.min(currentMax, maxBound), nextMin)

  return [nextMin, nextMax]
}

const buildDefaultFilters = (priceRange: [number, number]): MarketplaceFilters => ({
  priceRange,
  categories: [],
  conditions: [],
  locationRadius: 25,
  sellerVerified: true,
  instantBooking: false,
  ratingMin: 0,
})

const normalizeCategory = (value: string): string => {
  const key = value.trim().toLowerCase()
  if (key === 'party') {
    return 'events'
  }
  return key
}

const normalizeCondition = (value: string): string => {
  const key = value.trim().toLowerCase().replace(/\s+/g, '_')
  if (key === 'like_new' || key === 'excellent') {
    return 'excellent'
  }
  if (key === 'needs_work' || key === 'poor') {
    return 'needs_work'
  }
  if (key === 'fair') {
    return 'fair'
  }
  return 'good'
}

const BrowseListings: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState('relevant')
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [appliedFilters, setAppliedFilters] = useState<MarketplaceFilters>(buildDefaultFilters([0, 0]))
  const lastAppliedUrlCategoryRef = useRef<string | null>(null)

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

  const globalPriceBounds = useMemo<[number, number]>(() => computePriceBounds(listings), [listings])
  const selectedCategoryFromUrl = useMemo(() => {
    const rawCategory = searchParams.get('category')
    if (!rawCategory) {
      return null
    }

    const normalized = normalizeCategory(rawCategory)
    return normalized || null
  }, [searchParams])

  useEffect(() => {
    if (!selectedCategoryFromUrl) {
      lastAppliedUrlCategoryRef.current = null
      return
    }

    if (lastAppliedUrlCategoryRef.current === selectedCategoryFromUrl) {
      return
    }

    setAppliedFilters((prev) => {
      const base = buildDefaultFilters(globalPriceBounds)
      const nextCategoryFilters = [selectedCategoryFromUrl]
      const [nextMin, nextMax] = normalizePriceRangeForBounds(base.priceRange, globalPriceBounds)

      const nextFilters: MarketplaceFilters = {
        ...prev,
        ...base,
        categories: nextCategoryFilters,
        priceRange: [nextMin, nextMax],
      }

      return nextFilters
    })

    lastAppliedUrlCategoryRef.current = selectedCategoryFromUrl
  }, [selectedCategoryFromUrl, globalPriceBounds])

  const listingsMatchingNonPriceFilters = useMemo(() => {
    return listings.filter((listing) => {
      const listingCategory = normalizeCategory(listing.category)
      const listingCondition = normalizeCondition(listing.condition)
      const listingRating = listing.seller.rating || 0

      if (appliedFilters.categories.length > 0 && !appliedFilters.categories.includes(listingCategory)) {
        return false
      }

      if (appliedFilters.conditions.length > 0 && !appliedFilters.conditions.includes(listingCondition)) {
        return false
      }

      if (appliedFilters.sellerVerified && !listing.seller.verified) {
        return false
      }

      if (appliedFilters.ratingMin > 0 && listingRating < appliedFilters.ratingMin) {
        return false
      }

      return true
    })
  }, [listings, appliedFilters.categories, appliedFilters.conditions, appliedFilters.sellerVerified, appliedFilters.ratingMin])

  const dynamicPriceBounds = useMemo<[number, number]>(() => {
    const scopedBounds = computePriceBounds(listingsMatchingNonPriceFilters)
    if (scopedBounds[1] > 0) {
      return scopedBounds
    }
    return globalPriceBounds
  }, [listingsMatchingNonPriceFilters, globalPriceBounds])

  useEffect(() => {
    setAppliedFilters((prev) => {
      const [nextMin, nextMax] = normalizePriceRangeForBounds(prev.priceRange, dynamicPriceBounds)

      if (nextMin === prev.priceRange[0] && nextMax === prev.priceRange[1]) {
        return prev
      }

      return {
        ...prev,
        priceRange: [nextMin, nextMax],
      }
    })
  }, [dynamicPriceBounds])

  useEffect(() => {
    if (!listings.length) {
      return
    }

    setAppliedFilters((prev) => {
      const noFiltersSelected =
        prev.categories.length === 0 &&
        prev.conditions.length === 0 &&
        prev.locationRadius === 25 &&
        prev.sellerVerified === true &&
        prev.instantBooking === false &&
        prev.ratingMin === 0 &&
        prev.priceRange[0] === 0 &&
        prev.priceRange[1] === 0

      if (!noFiltersSelected) {
        return prev
      }

      return buildDefaultFilters(globalPriceBounds)
    })
  }, [listings.length, globalPriceBounds])

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const listingPrice = getListingBasePrice(listing)
      const listingCategory = normalizeCategory(listing.category)
      const listingCondition = normalizeCondition(listing.condition)
      const listingRating = listing.seller.rating || 0

      if (listingPrice < appliedFilters.priceRange[0] || listingPrice > appliedFilters.priceRange[1]) {
        return false
      }

      if (appliedFilters.categories.length > 0 && !appliedFilters.categories.includes(listingCategory)) {
        return false
      }

      if (appliedFilters.conditions.length > 0 && !appliedFilters.conditions.includes(listingCondition)) {
        return false
      }

      if (appliedFilters.sellerVerified && !listing.seller.verified) {
        return false
      }

      if (appliedFilters.ratingMin > 0 && listingRating < appliedFilters.ratingMin) {
        return false
      }

      // Instant booking and radius require additional server data not currently mapped.
      return true
    })
  }, [listings, appliedFilters])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const listing of listings) {
      const key = normalizeCategory(listing.category)
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [listings])

  const conditionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const listing of listings) {
      const key = normalizeCondition(listing.condition)
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [listings])

  const sortedListings = useMemo(() => {
    const items = [...filteredListings]
    if (sortBy === 'newest' || sortBy === 'relevant') {
      return items
    }
    if (sortBy === 'price_low') {
      return items.sort((a, b) => getListingBasePrice(a) - getListingBasePrice(b))
    }
    if (sortBy === 'price_high') {
      return items.sort((a, b) => getListingBasePrice(b) - getListingBasePrice(a))
    }
    if (sortBy === 'rating' || sortBy === 'trust') {
      return items.sort((a, b) => b.seller.trustScore - a.seller.trustScore)
    }
    return items
  }, [filteredListings, sortBy])

  const handleApplyFilters = (filters: MarketplaceFilters) => {
    const listingsMatchingNewNonPriceFilters = listings.filter((listing) => {
      const listingCategory = normalizeCategory(listing.category)
      const listingCondition = normalizeCondition(listing.condition)
      const listingRating = listing.seller.rating || 0

      if (filters.categories.length > 0 && !filters.categories.includes(listingCategory)) {
        return false
      }

      if (filters.conditions.length > 0 && !filters.conditions.includes(listingCondition)) {
        return false
      }

      if (filters.sellerVerified && !listing.seller.verified) {
        return false
      }

      if (filters.ratingMin > 0 && listingRating < filters.ratingMin) {
        return false
      }

      return true
    })

    const nextBounds = computePriceBounds(listingsMatchingNewNonPriceFilters)
    const fallbackBounds = nextBounds[1] > 0 ? nextBounds : globalPriceBounds
    const [nextMin, nextMax] = normalizePriceRangeForBounds(filters.priceRange, fallbackBounds)

    setAppliedFilters({
      ...filters,
      priceRange: [nextMin, nextMax],
    })
    setShowFilters(false)
  }

  const handleClearFilters = () => {
    setAppliedFilters(buildDefaultFilters(globalPriceBounds))
  }

  const filterSidebarKey = useMemo(
    () => JSON.stringify({ filters: appliedFilters, bounds: dynamicPriceBounds }),
    [appliedFilters, dynamicPriceBounds]
  )

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
            <FilterSidebar
              key={filterSidebarKey}
              filters={appliedFilters}
              priceBounds={dynamicPriceBounds}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              categoryCounts={categoryCounts}
              conditionCounts={conditionCounts}
            />
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