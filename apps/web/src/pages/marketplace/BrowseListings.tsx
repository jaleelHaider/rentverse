import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Filter, 
  Grid, 
  List, 
} from 'lucide-react'
import ListingCard from '@/components/marketplace/ListingCard'
import FilterSidebar from '@/components/marketplace/FilterSidebar'
import type { MarketplaceFilters } from '@/components/marketplace/FilterSidebar'
import { fetchMarketplaceListings, fetchSavedListingIds, searchMarketplaceListings } from '@/api/endpoints/listing'
import { useAuth } from '@/contexts/AuthContext'
import type { Listing } from '@rentverse/shared'

type MarketplaceListingRow = Listing & {
  relevanceScore?: number
  rankPosition?: number
}

type ListingCardRow = Omit<Listing, 'price'> & {
  price: {
    buy?: number
    rent?: {
      daily: number
      weekly: number
      monthly: number
    }
    securityDeposit?: number
  }
  views: number
}

const toPositiveNumber = (value: number | string | null | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const getListingBasePrice = (listing: Listing): number => {
  const dailyPrice = toPositiveNumber(listing.price?.rent?.daily)
  const buyPrice = toPositiveNumber(listing.price?.buy)
  const candidates = [dailyPrice, buyPrice].filter(
    (value): value is number => value > 0
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
  sellerVerified: false,
  ratingMin: 0,
  selectedCity: null,
  availabilityDate: null,
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
  const { currentUser } = useAuth()
  const [searchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState('relevant')
  const [listings, setListings] = useState<MarketplaceListingRow[]>([])
  const [listingMode, setListingMode] = useState<'rent' | 'sell' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTotal, setSearchTotal] = useState<number | null>(null)
  const [searchPage, setSearchPage] = useState(1)
  const [searchSessionId, setSearchSessionId] = useState('')
  const [savedListingIds, setSavedListingIds] = useState<Set<string>>(new Set())
  const [appliedFilters, setAppliedFilters] = useState<MarketplaceFilters>(buildDefaultFilters([0, 0]))
  const lastAppliedUrlCategoryRef = useRef<string | null>(null)
  const prevListingModeRef = useRef<'rent' | 'sell' | null>(null)
  const searchPageSize = 24
  const searchQueryFromUrl = useMemo(() => {
    const value = String(searchParams.get('q') || '').trim()
    return value
  }, [searchParams])
  const isSearchMode = searchQueryFromUrl.length >= 2
  const searchFilters = useMemo(
    () => ({
      categories: appliedFilters.categories,
      conditions: appliedFilters.conditions,
      sellerVerified: appliedFilters.sellerVerified,
      ratingMin: appliedFilters.ratingMin,
      minPrice: Number(appliedFilters.priceRange[0]) > 0 ? Number(appliedFilters.priceRange[0]) : null,
      maxPrice: Number(appliedFilters.priceRange[1]) > 0 ? Number(appliedFilters.priceRange[1]) : null,
    }),
    [
      appliedFilters.categories,
      appliedFilters.conditions,
      appliedFilters.sellerVerified,
      appliedFilters.ratingMin,
      appliedFilters.priceRange[0],
      appliedFilters.priceRange[1],
    ]
  )

  const sortOptions = [
    { value: 'relevant', label: 'Most Relevant' },
    { value: 'newest', label: 'Newest First' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'trust', label: 'Most Trusted' },
  ]

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchPage(1)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchQueryFromUrl])

  useEffect(() => {
    const shouldResetFilters = listingMode === null && prevListingModeRef.current !== null
    prevListingModeRef.current = listingMode
    const timeoutId = window.setTimeout(() => {
      setSearchPage(1)

      if (shouldResetFilters) {
        setAppliedFilters((prev) => ({
          ...prev,
          priceRange: [0, 0],
        }))
      }
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [listingMode])

  useEffect(() => {
    const loadListings = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        if (isSearchMode) {
          const result = await searchMarketplaceListings(searchQueryFromUrl, {
            page: searchPage,
            pageSize: searchPageSize,
            sort: sortBy as 'relevant' | 'newest' | 'price_low' | 'price_high' | 'rating' | 'trust',
            filters: searchFilters,
          })
          setListings(Array.isArray(result.results) ? result.results : [])
          setSearchTotal(result.total ?? 0)
          setSearchSessionId(result.searchSessionId ?? '')
        } else {
          const data = await fetchMarketplaceListings()
          setListings(Array.isArray(data) ? data : [])
          setSearchTotal(null)
          setSearchSessionId('')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load listings.'
        setLoadError(message)
        setListings([])
      } finally {
        setIsLoading(false)
      }
    }

    void loadListings()
  }, [isSearchMode, searchQueryFromUrl, searchPage, searchPageSize, sortBy, searchFilters])

  useEffect(() => {
    const loadSavedIds = async () => {
      if (!currentUser) {
        setSavedListingIds(new Set())
        return
      }

      try {
        const ids = await fetchSavedListingIds()
        setSavedListingIds(new Set(ids))
      } catch {
        setSavedListingIds(new Set())
      }
    }

    void loadSavedIds()
  }, [currentUser])

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

    const shouldResetSearchPage = isSearchMode
    const timeoutId = window.setTimeout(() => {
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

      if (shouldResetSearchPage) {
        setSearchPage(1)
      }
    }, 0)

    lastAppliedUrlCategoryRef.current = selectedCategoryFromUrl

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isSearchMode, selectedCategoryFromUrl, globalPriceBounds])

  const listingsMatchingNonPriceFilters = useMemo(() => {
    return listings.filter((listing) => {
      // Filter by listing mode: rent / sell / both
      if (listingMode === 'rent') {
        if (toPositiveNumber(listing.price?.rent?.daily) <= 0) {
          return false
        }
      }
      if (listingMode === 'sell') {
        if (toPositiveNumber(listing.price.buy) <= 0) {
          return false
        }
      }
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

      // Filter by city
      if (appliedFilters.selectedCity && listing.location.city !== appliedFilters.selectedCity) {
        return false
      }

      // Filter by availability date
      if (appliedFilters.availabilityDate) {
        const rentalCalendar = listing.availability?.rentalCalendar
        if (rentalCalendar && !rentalCalendar[appliedFilters.availabilityDate]) {
          return false
        }
      }

      return true
    })
  }, [listings, appliedFilters.categories, appliedFilters.conditions, appliedFilters.sellerVerified, appliedFilters.ratingMin, appliedFilters.selectedCity, appliedFilters.availabilityDate, listingMode])

  const dynamicPriceBounds = useMemo<[number, number]>(() => {
    const scopedBounds = computePriceBounds(listingsMatchingNonPriceFilters)
    if (scopedBounds[1] > 0) {
      return scopedBounds
    }
    return globalPriceBounds
  }, [listingsMatchingNonPriceFilters, globalPriceBounds])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
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
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [dynamicPriceBounds])

  useEffect(() => {
    if (!listings.length) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setAppliedFilters((prev) => {
        const noFiltersSelected =
          prev.categories.length === 0 &&
          prev.conditions.length === 0 &&
          prev.locationRadius === 25 &&
          prev.sellerVerified === false &&
          prev.ratingMin === 0 &&
          prev.priceRange[0] === 0 &&
          prev.priceRange[1] === 0

        if (noFiltersSelected) {
          const newBounds = globalPriceBounds
          if (newBounds[0] !== prev.priceRange[0] || newBounds[1] !== prev.priceRange[1]) {
            return buildDefaultFilters(newBounds)
          }
        }
        return prev
      })
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [listings.length, globalPriceBounds])

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      // Apply listing mode filter (rent / sell / both)
      if (listingMode === 'rent') {
        if (toPositiveNumber(listing.price?.rent?.daily) <= 0) {
          return false
        }
      }
      if (listingMode === 'sell') {
        if (toPositiveNumber(listing.price.buy) <= 0) {
          return false
        }
      }
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

      // Filter by city
      if (appliedFilters.selectedCity && listing.location.city !== appliedFilters.selectedCity) {
        return false
      }

      // Filter by availability date
      if (appliedFilters.availabilityDate) {
        const rentalCalendar = listing.availability?.rentalCalendar
        if (rentalCalendar && !rentalCalendar[appliedFilters.availabilityDate]) {
          return false
        }
      }

      // Instant booking and radius require additional server data not currently mapped.
      return true
    })
  }, [listings, appliedFilters, listingMode])

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

  const availableCities = useMemo(() => {
    const cities = new Set<string>()
    for (const listing of listings) {
      if (listing.location.city) {
        cities.add(listing.location.city)
      }
    }
    return Array.from(cities).sort()
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

      // Filter by city
      if (filters.selectedCity && listing.location.city !== filters.selectedCity) {
        return false
      }

      // Filter by availability date
      if (filters.availabilityDate) {
        const rentalCalendar = listing.availability?.rentalCalendar
        if (rentalCalendar && !rentalCalendar[filters.availabilityDate]) {
          return false
        }
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
    if (isSearchMode) {
      setSearchPage(1)
    }
    setShowFilters(false)
  }

  const handleClearFilters = () => {
    setAppliedFilters(buildDefaultFilters(globalPriceBounds))
    if (isSearchMode) {
      setSearchPage(1)
    }
  }

  const filterSidebarKey = useMemo(
    () => JSON.stringify({ filters: appliedFilters, bounds: dynamicPriceBounds }),
    [appliedFilters, dynamicPriceBounds]
  )

  const searchTotalPages = useMemo(() => {
    if (!isSearchMode || !searchTotal) {
      return 1
    }
    return Math.max(1, Math.ceil(searchTotal / searchPageSize))
  }, [isSearchMode, searchTotal, searchPageSize])

  const searchPageWindow = useMemo(() => {
    if (!isSearchMode) {
      return [] as number[]
    }

    const windowSize = 5
    const start = Math.max(1, searchPage - Math.floor(windowSize / 2))
    const end = Math.min(searchTotalPages, start + windowSize - 1)
    const adjustedStart = Math.max(1, end - windowSize + 1)

    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index)
  }, [isSearchMode, searchPage, searchTotalPages])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isSearchMode ? `Search Results for "${searchQueryFromUrl}"` : 'Browse Listings'}
              </h1>
              <p className="text-gray-600">
                {(isSearchMode ? searchTotal ?? sortedListings.length : sortedListings.length).toLocaleString()} items
                {isSearchMode ? ' ranked by relevance' : ' available for rent and sale'}
                {isSearchMode ? ` • Page ${searchPage} of ${searchTotalPages}` : ''}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-700">Sort by:</span>
                <select 
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value)
                    if (isSearchMode) {
                      setSearchPage(1)
                    }
                  }}
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
              listingMode={listingMode}
              onChangeListingMode={setListingMode}
              categoryCounts={categoryCounts}
              conditionCounts={conditionCounts}
              availableCities={availableCities}
            />
          </div>

          {/* Listings Grid */}
          <div className="flex-1">
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}`}>
              {sortedListings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={{
                    ...listing,
                    price: {
                      buy: toPositiveNumber(listing.price.buy) || undefined,
                      rent: listing.price.rent ? {
                        daily: toPositiveNumber(listing.price.rent.daily),
                        weekly: toPositiveNumber(listing.price.rent.weekly),
                        monthly: toPositiveNumber(listing.price.rent.monthly),
                      } : {
                        daily: 0,
                        weekly: 0,
                        monthly: 0,
                      },
                      securityDeposit: toPositiveNumber(listing.price.securityDeposit) || undefined,
                    },
                    views: listing.viewCount ?? 0,
                  } as ListingCardRow} 
                  viewMode={viewMode}
                  initialSaved={savedListingIds.has(listing.id)}
                  searchTracking={
                    isSearchMode && searchSessionId
                      ? {
                          searchSessionId,
                          query: searchQueryFromUrl,
                          rankPosition: listing.rankPosition || 0,
                          resultCount: searchTotal ?? sortedListings.length,
                          page: searchPage,
                          pageSize: searchPageSize,
                          sortBy,
                          filters: {
                            categories: appliedFilters.categories,
                            conditions: appliedFilters.conditions,
                            listingTypes: [],
                            sellerVerified: appliedFilters.sellerVerified,
                            ratingMin: appliedFilters.ratingMin,
                            minPrice: Number(appliedFilters.priceRange[0]) > 0 ? Number(appliedFilters.priceRange[0]) : null,
                            maxPrice: Number(appliedFilters.priceRange[1]) > 0 ? Number(appliedFilters.priceRange[1]) : null,
                          },
                        }
                      : undefined
                  }
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
            {isSearchMode && !isLoading && !loadError && sortedListings.length > 0 && searchTotalPages > 1 && (
              <div className="mt-12 flex flex-col items-center gap-4">
                <div className="text-sm text-gray-600">
                  Showing {Math.min((searchPage - 1) * searchPageSize + 1, searchTotal || 0)}-
                  {Math.min(searchPage * searchPageSize, searchTotal || 0)} of {searchTotal || 0}
                </div>
                <nav className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setSearchPage((prev) => Math.max(1, prev - 1))}
                    disabled={searchPage <= 1}
                  >
                    Previous
                  </button>

                  {searchPageWindow.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => setSearchPage(pageNumber)}
                      className={`px-4 py-2 rounded-lg border ${
                        pageNumber === searchPage
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setSearchPage((prev) => Math.min(searchTotalPages, prev + 1))}
                    disabled={searchPage >= searchTotalPages}
                  >
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
