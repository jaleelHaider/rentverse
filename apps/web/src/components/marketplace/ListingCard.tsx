import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Heart, Calendar, Eye, Shield, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatNavigation } from '@/hooks/useChatNavigation';
import { recordListingView } from '@/utils/behaviorTracking';
import {
  saveListing,
  unsaveListing,
  recordMarketplaceSearchEvent,
  type MarketplaceSearchFilters,
} from '@/api/endpoints/listing';

interface Listing {
  id: string;
  title: string;
  price: {
    buy?: number;
    rent?: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    securityDeposit?: number;
  };
  images: string[];
  condition: string;
  location: {
    city: string;
    area: string;
  };
  rating?: number;
  totalReviews?: number;
  views: number;
  createdAt: string;
  category: string;
  type: 'buy' | 'rent' | 'both';
  seller: {
    id: string;
    name: string;
    verified: boolean;
  };
  features?: string[];
  availability?: {
    totalForRent?: number;
    availableForRent?: number;
    totalForSale?: number;
    availableForSale?: number;
  };
}

interface ListingCardProps {
  listing: Listing;
  viewMode: 'grid' | 'list';
  initialSaved?: boolean;
  onSavedChange?: (listingId: string, isSaved: boolean) => void;
  searchTracking?: {
    searchSessionId: string;
    query: string;
    rankPosition: number;
    resultCount: number;
    page: number;
    pageSize: number;
    sortBy: string;
    filters?: MarketplaceSearchFilters;
  };
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, viewMode, initialSaved = false, onSavedChange, searchTracking }) => {
  const [isSaved, setIsSaved] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { currentUser } = useAuth();
  const { openListingChat, isStartingChat } = useChatNavigation();
  const navigate = useNavigate();
  const rating = listing.rating ?? 0;
  const totalReviews = listing.totalReviews ?? 0;
  const isOwnListing = currentUser?.id === listing.seller.id;

  React.useEffect(() => {
    setIsSaved(Boolean(initialSaved));
  }, [initialSaved, listing.id]);

  // Determine if it's a rent, buy, or both listing
  const isRentOnly = listing.type === 'rent';
  const isBuyOnly = listing.type === 'buy';
  const isBoth = listing.type === 'both';
  const availableForRent = listing.availability?.availableForRent ?? 0;
  const availableForSale = listing.availability?.availableForSale ?? 0;

  const normalizedConditionValue = String(listing.condition || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const conditionAliases: Record<string, 'new' | 'like_new' | 'good' | 'fair' | 'poor'> = {
    new: 'new',
    brand_new: 'new',
    like_new: 'like_new',
    likenew: 'like_new',
    excellent: 'new',
    good: 'good',
    fair: 'fair',
    poor: 'poor',
    needs_work: 'poor',
    needswork: 'poor',
  };
  const resolvedCondition = conditionAliases[normalizedConditionValue] || 'good';
  const conditionLabelByKey: Record<typeof resolvedCondition, string> = {
    new: 'Brand New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Needs Work',
  };
  const displayConditionLabel = conditionLabelByKey[resolvedCondition];
  const conditionBadgeClass =
    resolvedCondition === 'new' || resolvedCondition === 'like_new'
      ? 'bg-green-100 text-green-800'
      : resolvedCondition === 'good'
      ? 'bg-blue-100 text-blue-800'
      : resolvedCondition === 'fair'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-orange-100 text-orange-800';

  const listingPath = `/listing/${listing.id}`;
  const orderPath = `/order/${listing.id}?intent=${isBuyOnly ? 'buy' : 'rent'}`;

  const primaryActionLabel = isRentOnly
    ? 'Book Now'
    : isBuyOnly
    ? 'Buy Now'
    : 'Rent/Buy';

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, a')) {
      return;
    }

    // Record listing view for recommendations
    const basePrice = listing.price.rent?.daily || listing.price.buy || 0;
    recordListingView(listing.id, listing.category, basePrice, listing.location.city);

    if (searchTracking) {
      void recordMarketplaceSearchEvent({
        eventType: 'click',
        searchSessionId: searchTracking.searchSessionId,
        query: searchTracking.query,
        listingId: listing.id,
        rankPosition: searchTracking.rankPosition,
        resultCount: searchTracking.resultCount,
        page: searchTracking.page,
        pageSize: searchTracking.pageSize,
        sortBy: searchTracking.sortBy,
        filters: searchTracking.filters,
      });
    }

    navigate(listingPath);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate(listingPath);
    }
  };

  const handleSaveToggle = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentUser) {
      navigate('/?auth=login');
      return;
    }

    if (isOwnListing || isSaving) {
      return;
    }

    const previousValue = isSaved;
    setIsSaved(!previousValue);
    setIsSaving(true);

    try {
      if (previousValue) {
        await unsaveListing(listing.id);
        onSavedChange?.(listing.id, false);
      } else {
        await saveListing(listing.id);
        onSavedChange?.(listing.id, true);
      }
    } catch {
      setIsSaved(previousValue);
    } finally {
      setIsSaving(false);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow group cursor-pointer"
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        role="link"
        tabIndex={0}
      >
        <div className="flex flex-col md:flex-row gap-6">
          {/* Image */}
          <div className="md:w-64 lg:w-80">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-50">
              <img
                src={listing.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'}
                alt={listing.title}
                className="w-full h-full object-contain p-2"
              />
              
              {/* Condition Badge */}
              <div className="absolute top-3 left-3">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${conditionBadgeClass}`}>
                  {displayConditionLabel}
                </span>
              </div>
              
              {/* Type Badge */}
              <div className="absolute top-3 right-3">
                {isRentOnly && (
                  <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                    Rent Only
                  </span>
                )}
                {isBuyOnly && (
                  <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                    Buy Only
                  </span>
                )}
                {isBoth && (
                  <span className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
                    Rent or Buy
                  </span>
                )}
              </div>
              
              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveToggle}
                disabled={isOwnListing || isSaving}
                className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Heart
                  size={20}
                  className={isSaved ? 'text-red-500 fill-current' : 'text-gray-600'}
                />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      <Link to={`/listing/${listing.id}`} className="hover:text-primary-600">
                        {listing.title}
                      </Link>
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{listing.location.area}, {listing.location.city}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Listed {listing.createdAt}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{listing.views} views</span>
                      </div>
                    </div>
                    
                    {/* Seller Info */}
                    <div className="flex items-center gap-2 mb-4">
                      <Link to={`/user/${listing.seller.id}`} className="text-sm text-gray-700 hover:text-primary-600 hover:underline">
                        {listing.seller.name}
                      </Link>
                      {listing.seller.verified && (
                        <span className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          <Shield className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    
                    {/* Features */}
                    {listing.features && listing.features.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {listing.features.slice(0, 3).map((feature, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs"
                          >
                            <CheckCircle className="h-3 w-3" />
                            {feature}
                          </span>
                        ))}
                        {listing.features.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{listing.features.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Rating */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end mb-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="font-bold">{rating}</span>
                      <span className="text-gray-500">({totalReviews})</span>
                    </div>
                    <div className="text-sm text-gray-500">Item Condition: {displayConditionLabel}</div>
                  </div>
                </div>
              </div>

              {/* Price and Actions */}
              <div className="mt-auto pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    {listing.price.buy && (
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-gray-900">
                          PKR {listing.price.buy.toLocaleString()}
                        </div>
                        {isBoth && (
                          <span className="text-sm text-gray-500">or rent from</span>
                        )}
                      </div>
                    )}
                    
                    {listing.price.rent && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-700">
                            PKR {listing.price.rent.daily.toLocaleString()}/day
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          PKR {listing.price.rent.weekly.toLocaleString()}/week
                        </div>
                        <div className="text-sm text-gray-500">
                          PKR {listing.price.rent.monthly.toLocaleString()}/month
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      {(isRentOnly || isBoth) && (
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                          Rent stock: {availableForRent}
                        </span>
                      )}
                      {(isBuyOnly || isBoth) && (
                        <span className="rounded-full bg-green-50 px-2 py-1 text-green-700">
                          Sale stock: {availableForSale}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Link
                      to={orderPath}
                      className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                    >
                      {primaryActionLabel}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void openListingChat({
                          listingId: listing.id,
                          sellerId: listing.seller.id,
                        });
                      }}
                      disabled={isStartingChat || isOwnListing}
                      className="px-6 py-3 border border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isOwnListing ? 'Your Listing' : isStartingChat ? 'Opening...' : 'Contact'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid View (default)
  return (
    <div
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-shadow group cursor-pointer"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="link"
      tabIndex={0}
    >
      {/* Image Section */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={listing.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'}
          alt={listing.title}
          className="w-full h-full object-contain p-2"
        />
        
        {/* Condition Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${conditionBadgeClass}`}>
            {displayConditionLabel}
          </span>
        </div>
        
        {/* Type Badge */}
        <div className="absolute top-3 right-3">
          {isRentOnly && (
            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
              Rent
            </span>
          )}
          {isBuyOnly && (
            <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
              Buy
            </span>
          )}
          {isBoth && (
            <span className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
              Rent/Buy
            </span>
          )}
        </div>
        
        {/* Save Button */}
        <button
          type="button"
          onClick={handleSaveToggle}
          disabled={isOwnListing || isSaving}
          className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Heart
            size={20}
            className={isSaved ? 'text-red-500 fill-current' : 'text-gray-600'}
          />
        </button>
        
        {/* Security Deposit */}
        {(listing.price.securityDeposit ?? 0) > 0 && (
          <div className="absolute bottom-3 left-3">
            <span className="px-3 py-1 bg-black/70 text-white text-xs font-medium rounded-full">
              Deposit: PKR {(listing.price.securityDeposit ?? 0).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5">
        {/* Title and Location */}
        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
          <Link to={`/listing/${listing.id}`} className="hover:text-primary-600">
            {listing.title}
          </Link>
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <MapPin className="h-4 w-4" />
          <span>{listing.location.area}, {listing.location.city}</span>
        </div>

        {/* Seller Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link to={`/user/${listing.seller.id}`} className="text-sm text-gray-700 hover:text-primary-600 hover:underline">
              {listing.seller.name}
            </Link>
            {listing.seller.verified && (
              <Shield className="h-4 w-4 text-green-500" />
            )}
          </div>
          
          {/* Rating */}
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="font-bold">{rating}</span>
            <span className="text-gray-500">({totalReviews})</span>
          </div>
        </div>

        {/* Price Section */}
        <div className="space-y-3 mb-4">
          {listing.price.buy && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Buy Price</div>
              <div className="text-lg font-bold text-gray-900">
                PKR {listing.price.buy.toLocaleString()}
              </div>
            </div>
          )}
          
          {listing.price.rent && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Rent Price</div>
              <div className="text-right">
                <div className="font-bold text-blue-700">
                  PKR {listing.price.rent.daily.toLocaleString()}/day
                </div>
                <div className="text-xs text-gray-500">
                  PKR {listing.price.rent.weekly.toLocaleString()}/week • PKR {listing.price.rent.monthly.toLocaleString()}/month
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{listing.views} views</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{listing.createdAt}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {(isRentOnly || isBoth) && (
            <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">
              Rent available: {availableForRent}
            </span>
          )}
          {(isBuyOnly || isBoth) && (
            <span className="rounded-full bg-green-50 px-2 py-1 font-medium text-green-700">
              Sale available: {availableForSale}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link
            to={orderPath}
            className="py-2 bg-primary-600 text-white rounded-lg text-center font-medium hover:bg-primary-700"
          >
            {primaryActionLabel}
          </Link>
          <button
            type="button"
            onClick={() => {
              void openListingChat({
                listingId: listing.id,
                sellerId: listing.seller.id,
              });
            }}
            disabled={isStartingChat || isOwnListing}
            className="py-2 border border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isOwnListing ? 'Your Listing' : isStartingChat ? 'Opening...' : 'Contact'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
