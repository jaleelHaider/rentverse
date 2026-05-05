import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import ListingCard from '@/components/marketplace/ListingCard';
import { fetchMarketplaceListings, fetchSavedListingIds } from '@/api/endpoints/listing';
import { useAuth } from '@/contexts/AuthContext';
import {
  getViewingHistory,
  getUserPreferences,
  getTransactionBehavior,
} from '@/utils/behaviorTracking';
import type { Listing } from '@rentverse/shared';

const RecommendedForYou: React.FC = () => {
  const { currentUser } = useAuth();
  const [recommendations, setRecommendations] = useState<Listing[]>([]);
  const [savedListingIds, setSavedListingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const itemsPerSlide = 4;

  // Generate recommendations based on browsing behavior
  const generateRecommendations = (allListings: Listing[]): Listing[] => {
    if (allListings.length === 0) return [];

    const viewingHistory = getViewingHistory();
    const preferences = getUserPreferences();
    const behavior = getTransactionBehavior();

    // If no viewing history, return random listings
    if (viewingHistory.length === 0) {
      return allListings.sort(() => Math.random() - 0.5).slice(0, 12);
    }

    const viewedListingIds = new Set(viewingHistory.map(v => v.listingId));

    // Score listings based on behavior
    const scoredListings = allListings.map(listing => {
      let score = 0;

      // Category boost: +10 points if matches viewed category
      if (preferences.preferredCategories.includes(listing.category)) {
        score += 10;
      }

      // City preference: +8 points if matches user city
      if (preferences.userCity && listing.location.city === preferences.userCity) {
        score += 8;
      }

      // Price range: +5 points if within user's typical range
      if (preferences.priceRange) {
        const listingPrice = listing.price.rent?.daily || listing.price.buy || 0;
        const avgPrice = (preferences.priceRange.min + preferences.priceRange.max) / 2;
        const variance = Math.abs(listingPrice - avgPrice);
        if (variance < avgPrice * 0.5) {
          score += 5;
        }
      }

      // Transaction type preference: +6 points if matches behavior
      if (behavior) {
        if (behavior.rentingPreference === 'rent' && listing.type !== 'buy') {
          score += 6;
        } else if (behavior.rentingPreference === 'buy' && listing.type !== 'rent') {
          score += 6;
        } else if (behavior.rentingPreference === 'both') {
          score += 3;
        }
      }

      // Seller quality: +7 points for verified sellers
      if (listing.seller.verified) {
        score += 7;
      }

      // Rating boost: +5 points for highly rated sellers
      if (listing.seller.rating && listing.seller.rating >= 4.5) {
        score += 5;
      }

      // Popularity: +0.05 per view
      score += (listing.views || 0) * 0.05;

      // Penalty for already viewed items: -3 points
      if (viewedListingIds.has(listing.id)) {
        score -= 3;
      }

      // Add some randomness for variety
      score += Math.random() * 2;

      return { listing, score };
    });

    // Sort by score and return top recommendations
    return scoredListings
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(item => item.listing);
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const allListings = await fetchMarketplaceListings();
        const recommended = generateRecommendations(allListings);
        setRecommendations(recommended);
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : 'Failed to load recommendations.';
        setError(message);
        setRecommendations([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchRecommendations();
  }, []);

  useEffect(() => {
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

  const handlePrevious = () => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    const maxIndex = Math.max(0, recommendations.length - itemsPerSlide);
    setCurrentSlideIndex(prev => Math.min(maxIndex, prev + 1));
  };

  const canGoBack = currentSlideIndex > 0;
  const canGoForward = currentSlideIndex < Math.max(0, recommendations.length - itemsPerSlide);

  // Scroll carousel to show current index
  useEffect(() => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.offsetWidth / itemsPerSlide;
      carouselRef.current.scroll({
        left: currentSlideIndex * cardWidth,
        behavior: 'smooth'
      });
    }
  }, [currentSlideIndex]);

  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-r from-primary-50 to-purple-50">
        <div className="container-custom">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
            Loading personalized recommendations...
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gradient-to-r from-primary-50 to-purple-50">
        <div className="container-custom">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            {error}
          </div>
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-r from-primary-50 to-purple-50">
        <div className="container-custom">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
            No recommendations available yet. Start browsing to get personalized suggestions!
          </div>
        </div>
      </section>
    );
  }

  const visibleListings = recommendations.slice(
    currentSlideIndex,
    currentSlideIndex + itemsPerSlide
  );

  return (
    <section className="py-16 bg-gradient-to-r from-primary-50 to-purple-50">
      <div className="container-custom">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={24} className="text-primary-600" />
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Recommended for You
              </h2>
            </div>
            <p className="text-gray-600">
              Personalized picks based on your browsing and interests
            </p>
          </div>

          {/* Browse All Button */}
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors whitespace-nowrap"
          >
            Browse All
            <ChevronRight size={20} />
          </Link>
        </div>

        {/* Carousel Container */}
        <div className="relative group">
          {/* Left Arrow */}
          <button
            onClick={handlePrevious}
            disabled={!canGoBack}
            className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 -ml-6 p-2 rounded-full transition-all ${
              canGoBack
                ? 'bg-white shadow-lg hover:bg-gray-50 text-gray-900 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Previous listings"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Carousel */}
          <div
            ref={carouselRef}
            className="flex gap-6 overflow-hidden scroll-smooth"
            style={{
              scrollBehavior: 'smooth',
            }}
          >
            {recommendations.map((listing) => (
              <div
                key={listing.id}
                className="flex-shrink-0"
                style={{ width: `calc(25% - 1.5rem)` }}
              >
                <ListingCard
                  listing={listing}
                  viewMode="grid"
                  initialSaved={savedListingIds.has(listing.id)}
                  onSavedChange={(listingId, isSaved) => {
                    if (isSaved) {
                      setSavedListingIds(prev => new Set([...prev, listingId]));
                    } else {
                      setSavedListingIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(listingId);
                        return newSet;
                      });
                    }
                  }}
                />
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          <button
            onClick={handleNext}
            disabled={!canGoForward}
            className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 -mr-6 p-2 rounded-full transition-all ${
              canGoForward
                ? 'bg-white shadow-lg hover:bg-gray-50 text-gray-900 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Next listings"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Pagination Indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({
            length: Math.ceil(recommendations.length / itemsPerSlide),
          }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlideIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === Math.floor(currentSlideIndex / itemsPerSlide)
                  ? 'bg-primary-600 w-8'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Info Text */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Showing {Math.min(currentSlideIndex + itemsPerSlide, recommendations.length)} of{' '}
          {recommendations.length} recommendations
        </p>
      </div>
    </section>
  );
};

export default RecommendedForYou;

