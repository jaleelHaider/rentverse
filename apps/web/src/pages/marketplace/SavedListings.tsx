import React from 'react'
import { Link } from 'react-router-dom'
import { Grid, List, Heart } from 'lucide-react'
import ListingCard from '@/components/marketplace/ListingCard'
import { fetchSavedListings } from '@/api/endpoints/listing'
import type { Listing } from '@rentverse/shared'

const PAGE_SIZE = 24

const SavedListings: React.FC = () => {
  const [savedListings, setSavedListings] = React.useState<Listing[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid')
  const [page, setPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(false)

  React.useEffect(() => {
    const loadSavedListings = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchSavedListings(page, PAGE_SIZE)
        setSavedListings(response.results || [])
        setTotal(response.total || 0)
        setHasMore(Boolean(response.hasMore))
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load saved listings.'
        setError(message)
        setSavedListings([])
        setTotal(0)
        setHasMore(false)
      } finally {
        setIsLoading(false)
      }
    }

    void loadSavedListings()
  }, [page])

  const handleSavedChange = (listingId: string, isSaved: boolean) => {
    if (isSaved) {
      return
    }

    setSavedListings((prev) => prev.filter((item) => item.id !== listingId))
    setTotal((prev) => Math.max(0, prev - 1))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-custom py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Saved Listings</h1>
            <p className="mt-1 text-gray-600">{total.toLocaleString()} saved item{total === 1 ? '' : 's'}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex overflow-hidden rounded-lg border border-gray-300">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-3 ${viewMode === 'grid' ? 'bg-gray-100' : 'bg-white'}`}
                aria-label="Grid view"
              >
                <Grid size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-3 ${viewMode === 'list' ? 'bg-gray-100' : 'bg-white'}`}
                aria-label="List view"
              >
                <List size={18} />
              </button>
            </div>

            <Link to="/browse" className="btn-primary px-5 py-2 text-sm font-semibold">
              Browse More
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">
            Loading saved listings...
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            {error}
          </div>
        ) : null}

        {!isLoading && !error && savedListings.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-pink-600">
              <Heart size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">No saved items yet</h2>
            <p className="mt-2 text-gray-600">Tap the heart icon on listings to save them here.</p>
            <Link to="/browse" className="btn-primary mt-6 inline-flex px-6 py-2 text-sm font-semibold">
              Explore Listings
            </Link>
          </div>
        ) : null}

        {!isLoading && !error && savedListings.length > 0 ? (
          <>
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-6'}>
              {savedListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  viewMode={viewMode}
                  initialSaved
                  onSavedChange={handleSavedChange}
                />
              ))}
            </div>

            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-gray-700">Page {page}</span>
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!hasMore}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default SavedListings

