import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Calendar, Eye } from 'lucide-react';

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
    securityDeposit: number;
  };
  images: string[];
  condition: string;
  location: {
    city: string;
    area: string;
  };
  rating: number;
  totalReviews: number;
  views: number;
  createdAt: string;
  category: string;
  type: 'buy' | 'rent' | 'both';
}

interface SimilarListingsProps {
  currentListingId: string;
}

const SimilarListings: React.FC<SimilarListingsProps> = ({ currentListingId }) => {
  // Mock similar listings
  const similarListings: Listing[] = [
    {
      id: '2',
      title: 'Sony A7IV Mirrorless Camera with 28-70mm Lens',
      price: {
        buy: 165000,
        rent: { daily: 1800, weekly: 9000, monthly: 32000 },
        securityDeposit: 30000,
      },
      images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32'],
      condition: 'Excellent',
      location: { city: 'Mumbai', area: 'Bandra' },
      rating: 4.9,
      totalReviews: 42,
      views: 1250,
      createdAt: '3 days ago',
      category: 'Electronics',
      type: 'both',
    },
    {
      id: '3',
      title: 'Canon EOS R5 Professional Camera Body',
      price: {
        buy: 285000,
        rent: { daily: 2800, weekly: 14000, monthly: 52000 },
        securityDeposit: 50000,
      },
      images: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd'],
      condition: 'Like New',
      location: { city: 'Delhi', area: 'Connaught Place' },
      rating: 4.8,
      totalReviews: 31,
      views: 890,
      createdAt: '1 week ago',
      category: 'Electronics',
      type: 'rent',
    },
    {
      id: '4',
      title: 'Nikon Z6 II with 24-70mm f/4 Lens Kit',
      price: {
        buy: 195000,
        rent: { daily: 2200, weekly: 11000, monthly: 38000 },
        securityDeposit: 35000,
      },
      images: ['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446'],
      condition: 'Good',
      location: { city: 'Bangalore', area: 'Koramangala' },
      rating: 4.7,
      totalReviews: 28,
      views: 760,
      createdAt: '2 days ago',
      category: 'Electronics',
      type: 'both',
    },
    {
      id: '5',
      title: 'Fujifilm X-T4 Mirrorless Camera',
      price: {
        buy: 145000,
        rent: { daily: 1600, weekly: 8000, monthly: 28000 },
        securityDeposit: 25000,
      },
      images: ['https://images.unsplash.com/photo-1514905552197-0610a4d8fd73'],
      condition: 'Excellent',
      location: { city: 'Chennai', area: 'Adyar' },
      rating: 4.9,
      totalReviews: 37,
      views: 1120,
      createdAt: '5 days ago',
      category: 'Electronics',
      type: 'rent',
    },
  ];

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Similar Listings</h2>
          <p className="text-gray-600 mt-1">Other items you might be interested in</p>
        </div>
        <Link
          to="/browse?category=electronics"
          className="text-primary-600 hover:text-primary-800 font-medium"
        >
          View All →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {similarListings.map((listing) => (
          <Link
            key={listing.id}
            to={`/listing/${listing.id}`}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group"
          >
            {/* Image */}
            <div className="relative h-48 overflow-hidden">
              <img
                src={listing.images[0]}
                alt={listing.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 left-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  listing.condition === 'Like New' || listing.condition === 'Excellent'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {listing.condition}
                </span>
              </div>
              {listing.type === 'rent' && (
                <div className="absolute top-3 right-3 bg-blue-600 text-white px-2 py-1 text-xs font-medium rounded-full">
                  Rent
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                {listing.title}
              </h3>
              
              {/* Price */}
              <div className="mb-3">
                {listing.type === 'buy' || listing.type === 'both' ? (
                  <div className="text-lg font-bold text-gray-900">
                    ₹{listing.price.buy?.toLocaleString()}
                  </div>
                ) : null}
                
                {listing.type === 'rent' || listing.type === 'both' ? (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">
                      ₹{listing.price.rent?.daily}/day
                    </span>
                    <span className="mx-2">•</span>
                    <span className="font-medium text-gray-900">
                      ₹{listing.price.rent?.weekly}/week
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Location & Stats */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{listing.location.area}, {listing.location.city}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{listing.rating}</span>
                    <span>({listing.totalReviews})</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{listing.views}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Listed {listing.createdAt}</span>
                </div>
              </div>

              {/* Action Button */}
              <button className="w-full mt-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100">
                View Details
              </button>
            </div>
          </Link>
        ))}
      </div>

      {/* Filter Suggestions */}
      <div className="mt-8 p-6 bg-gray-50 rounded-xl">
        <h3 className="font-semibold text-gray-900 mb-4">Looking for something specific?</h3>
        <div className="flex flex-wrap gap-2">
          {['Under ₹2,000/day', 'With Prime Lens', 'Brand New', 'Video Capable', 'Lightweight'].map((filter) => (
            <button
              key={filter}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimilarListings;