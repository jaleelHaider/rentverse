import React from 'react';
import ListingCard from '@/components/marketplace/ListingCard';
import { fetchMarketplaceListings, fetchSavedListingIds } from '@/api/endpoints/listing';
import { useAuth } from '@/contexts/AuthContext';
import type { Listing } from '@rentverse/shared';

const FeaturedListings: React.FC = () => {
  const { currentUser } = useAuth();
  const [featuredListings, setFeaturedListings] = React.useState<Listing[]>([]);
  const [savedListingIds, setSavedListingIds] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchFeaturedListings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const listings = await fetchMarketplaceListings();
        setFeaturedListings(listings.slice(0, 8));
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : 'Failed to load featured listings.';
        setError(message);
        setFeaturedListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchFeaturedListings();
  }, []);

  React.useEffect(() => {
    const loadSavedIds = async () => {
      if (!currentUser) {
        setSavedListingIds(new Set());
        return;
      }

      try {
        const ids = await fetchSavedListingIds();
        setSavedListingIds(new Set(ids));
      } catch {
        setSavedListingIds(new Set());
      }
    };

    void loadSavedIds();
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
        Loading featured listings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        {error}
      </div>
    );
  }

  if (featuredListings.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
        No featured listings available yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {featuredListings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          viewMode="grid"
          initialSaved={savedListingIds.has(listing.id)}
        />
      ))}
    </div>
  );
};

export default FeaturedListings;
