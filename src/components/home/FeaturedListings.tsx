import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Heart, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ListingDisplayType = 'buy' | 'rent' | 'both';

interface ListingImageRow {
  public_url: string;
  is_primary: boolean;
  display_order: number;
}

interface ListingRow {
  id: string;
  title: string;
  category: string;
  listing_type: 'rent' | 'sell' | 'both';
  buy_price: number | null;
  rent_daily_price: number | null;
  rent_weekly_price: number | null;
  location_city: string | null;
  owner_name: string | null;
  created_at: string;
  listing_images: ListingImageRow[] | null;
}

interface FeaturedListing {
  id: string;
  title: string;
  category: string;
  image: string;
  location: string;
  ownerName: string;
  createdAt: string;
  type: ListingDisplayType;
  price: {
    rentDaily: number | null;
    rentWeekly: number | null;
    buy: number | null;
  };
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1484704849700-f032a568e944';

const mapListingType = (type: ListingRow['listing_type']): ListingDisplayType => {
  if (type === 'sell') {
    return 'buy';
  }

  return type;
};

const pickPrimaryImage = (images: ListingImageRow[] | null): string => {
  if (!images || images.length === 0) {
    return FALLBACK_IMAGE;
  }

  const sorted = [...images].sort((a, b) => {
    if (a.is_primary === b.is_primary) {
      return a.display_order - b.display_order;
    }
    return a.is_primary ? -1 : 1;
  });

  return sorted[0]?.public_url || FALLBACK_IMAGE;
};

const FeaturedListings: React.FC = () => {
  const [featuredListings, setFeaturedListings] = React.useState<FeaturedListing[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchFeaturedListings = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('listings')
        .select(
          'id,title,category,listing_type,buy_price,rent_daily_price,rent_weekly_price,location_city,owner_name,created_at,listing_images(public_url,is_primary,display_order)'
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6);

      if (fetchError) {
        setError(fetchError.message || 'Failed to load featured listings.');
        setFeaturedListings([]);
        setIsLoading(false);
        return;
      }

      const rows = (data || []) as ListingRow[];
      const mapped: FeaturedListing[] = rows.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        image: pickPrimaryImage(row.listing_images),
        location: row.location_city || 'Location not provided',
        ownerName: row.owner_name || 'Owner',
        createdAt: row.created_at,
        type: mapListingType(row.listing_type),
        price: {
          rentDaily: row.rent_daily_price,
          rentWeekly: row.rent_weekly_price,
          buy: row.buy_price,
        },
      }));

      setFeaturedListings(mapped);
      setIsLoading(false);
    };

    void fetchFeaturedListings();
  }, []);

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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {featuredListings.map((listing) => (
        <div
          key={listing.id}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 group"
        >
          {/* Image */}
          <div className="relative h-48 overflow-hidden">
            <img
              src={listing.image}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            
            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-xs font-medium">
                {listing.category}
              </span>
            </div>
            
            {/* Type Badge */}
            <div className="absolute top-3 right-3">
              {listing.type === 'rent' && (
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  Rent
                </span>
              )}
              {listing.type === 'buy' && (
                <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  Buy
                </span>
              )}
              {listing.type === 'both' && (
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  Rent/Buy
                </span>
              )}
            </div>
            
            {/* Save Button */}
            <button className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100">
              <Heart className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Title and Location */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">
                  {listing.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{listing.location}</span>
                </div>
              </div>
            </div>

            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{listing.ownerName}</span>
              </div>
              <div className="text-xs text-gray-500">
                Listed {new Date(listing.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Price */}
            <div className="mb-6">
              {listing.price.rentDaily && (
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-blue-700">
                        ₹{listing.price.rentDaily.toLocaleString('en-IN')}/day
                      </div>
                      {listing.price.rentWeekly && (
                        <div className="text-sm text-gray-500">
                          Weekly: ₹{listing.price.rentWeekly.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {listing.price.buy && (
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-sm">or buy for</span>
                  <div className="text-xl font-bold text-green-700">
                    ₹{listing.price.buy.toLocaleString('en-IN')}
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <Link
              to={`/listing/${listing.id}`}
              className="block w-full py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white text-center rounded-xl font-bold hover:shadow-lg transition-shadow"
            >
              View Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FeaturedListings;