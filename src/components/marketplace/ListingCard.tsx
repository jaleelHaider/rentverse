import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Heart, Calendar, Eye, Shield, CheckCircle, Clock } from 'lucide-react';

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
    name: string;
    verified: boolean;
  };
  features?: string[];
}

interface ListingCardProps {
  listing: Listing;
  viewMode: 'grid' | 'list';
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, viewMode }) => {
  const [isSaved, setIsSaved] = React.useState(false);
  const rating = listing.rating ?? 0;
  const totalReviews = listing.totalReviews ?? 0;

  // Determine if it's a rent, buy, or both listing
  const isRentOnly = listing.type === 'rent';
  const isBuyOnly = listing.type === 'buy';
  const isBoth = listing.type === 'both';

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow group">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Image */}
          <div className="md:w-64 lg:w-80">
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <img
                src={listing.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'}
                alt={listing.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* Condition Badge */}
              <div className="absolute top-3 left-3">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  listing.condition === 'Like New' || listing.condition === 'Excellent'
                    ? 'bg-green-100 text-green-800'
                    : listing.condition === 'Good'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {listing.condition}
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
                onClick={() => setIsSaved(!isSaved)}
                className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100"
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
                      <span className="text-sm text-gray-700">{listing.seller.name}</span>
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
                    <div className="text-sm text-gray-500">Excellent</div>
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
                          PKR{listing.price.buy.toLocaleString()}
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
                            ₹{listing.price.rent.daily}/day
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          ₹{listing.price.rent.weekly}/week
                        </div>
                        <div className="text-sm text-gray-500">
                          ₹{listing.price.rent.monthly}/month
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <Link
                      to={`/listing/${listing.id}`}
                      className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                    >
                      View Details
                    </Link>
                    <button className="px-6 py-3 border border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50">
                      Contact
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
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-shadow group">
      {/* Image Section */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={listing.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Condition Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            listing.condition === 'Like New' || listing.condition === 'Excellent'
              ? 'bg-green-100 text-green-800'
              : listing.condition === 'Good'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {listing.condition}
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
          onClick={() => setIsSaved(!isSaved)}
          className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100"
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
              Deposit: ₹{(listing.price.securityDeposit ?? 0).toLocaleString()}
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
            <span className="text-sm text-gray-700">{listing.seller.name}</span>
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
                ₹{listing.price.buy.toLocaleString()}
              </div>
            </div>
          )}
          
          {listing.price.rent && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Rent Price</div>
              <div className="text-right">
                <div className="font-bold text-blue-700">
                  ₹{listing.price.rent.daily}/day
                </div>
                <div className="text-xs text-gray-500">
                  ₹{listing.price.rent.weekly}/week • ₹{listing.price.rent.monthly}/month
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link
            to={`/listing/${listing.id}`}
            className="py-2 bg-primary-600 text-white rounded-lg text-center font-medium hover:bg-primary-700"
          >
            View Details
          </Link>
          <button className="py-2 border border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50">
            Contact
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;