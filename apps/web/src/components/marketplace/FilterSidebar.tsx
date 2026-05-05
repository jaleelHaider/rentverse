import React, { useMemo, useState } from 'react';
import { X, Filter, Check, Star, Shield, Package, MapPin, Calendar } from 'lucide-react';

export interface MarketplaceFilters {
  priceRange: [number, number];
  categories: string[];
  conditions: string[];
  locationRadius: number;
  sellerVerified: boolean;
  ratingMin: number;
  selectedCity?: string | null;
  availabilityDate?: string | null;
}

interface FilterSidebarProps {
  filters?: MarketplaceFilters;
  priceBounds?: [number, number];
  onApplyFilters?: (filters: MarketplaceFilters) => void;
  onClearFilters?: () => void;
  categoryCounts?: Record<string, number>;
  conditionCounts?: Record<string, number>;
  availableCities?: string[];
  listingMode?: 'rent' | 'sell' | null;
  onChangeListingMode?: (mode: 'rent' | 'sell' | null) => void;
}

const buildDefaultFilters = (priceBounds: [number, number]): MarketplaceFilters => ({
  priceRange: priceBounds,
  categories: [],
  conditions: [],
  locationRadius: 25,
  sellerVerified: false,
  ratingMin: 0,
  selectedCity: null,
  availabilityDate: null,
});

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  priceBounds = [0, 0],
  onApplyFilters,
  onClearFilters,
  categoryCounts = {},
  conditionCounts = {},
  availableCities = [],
  listingMode = null,
  onChangeListingMode,
}) => {
  const initialFilters = filters ?? buildDefaultFilters(priceBounds);

  const [priceRange, setPriceRange] = useState<[number, number]>(initialFilters.priceRange);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialFilters.categories);
  const [selectedConditions, setSelectedConditions] = useState<string[]>(initialFilters.conditions);
  const [locationRadius, setLocationRadius] = useState<number>(initialFilters.locationRadius);
  const [sellerVerified, setSellerVerified] = useState<boolean>(initialFilters.sellerVerified);
  const [ratingMin, setRatingMin] = useState<number>(initialFilters.ratingMin);
  const [selectedCity, setSelectedCity] = useState<string | null>(initialFilters.selectedCity ?? null);
  const [availabilityDate, setAvailabilityDate] = useState<string | null>(initialFilters.availabilityDate ?? null);

  const hasPriceBounds = priceBounds[1] > 0;
  const isPriceRangeModified = hasPriceBounds
    ? priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1]
    : false;

  const activeFilterCount = useMemo(() => {
    return (
      selectedCategories.length +
      selectedConditions.length +
      (isPriceRangeModified ? 1 : 0) +
      (ratingMin > 0 ? 1 : 0) +
      (sellerVerified ? 1 : 0) +
      (selectedCity ? 1 : 0) +
      (availabilityDate ? 1 : 0)
    );
  }, [selectedCategories.length, selectedConditions.length, isPriceRangeModified, ratingMin, sellerVerified, selectedCity, availabilityDate]);

  const categories = [
    { id: 'electronics', label: 'Electronics' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'home', label: 'Home & Garden' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'music', label: 'Music & Instruments' },
    { id: 'sports', label: 'Sports & Outdoors' },
    { id: 'events', label: 'Party & Events' },
    { id: 'tools', label: 'Tools & Equipment' },
    { id: 'creative', label: 'Creative' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'kitchen', label: 'Kitchen & Dining' },
    { id: 'photography', label: 'Photography' },
    { id: 'other', label: 'Other' },
  ];

  const conditions = [
    { id: 'excellent', label: 'Like New / Excellent' },
    { id: 'good', label: 'Good' },
    { id: 'fair', label: 'Fair' },
    { id: 'needs_work', label: 'Needs Work' },
  ];

  const getCategoryCount = (categoryId: string): number => {
    const normalizedId = categoryId.toLowerCase();
    if (normalizedId === 'events') {
      return (categoryCounts.party || 0) + (categoryCounts.events || 0);
    }
    return categoryCounts[normalizedId] || 0;
  };

  const getConditionCount = (conditionId: string): number => {
    if (conditionId === 'excellent') {
      return (conditionCounts.excellent || 0) + (conditionCounts.like_new || 0) + (conditionCounts.like_new_or_excellent || 0);
    }
    return conditionCounts[conditionId] || 0;
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleConditionToggle = (conditionId: string) => {
    setSelectedConditions(prev =>
      prev.includes(conditionId)
        ? prev.filter(id => id !== conditionId)
        : [...prev, conditionId]
    );
  };

  const handleApplyFilters = () => {
    const minPrice = Math.min(Math.max(priceRange[0], priceBounds[0]), priceBounds[1]);
    const maxPrice = Math.max(Math.min(priceRange[1], priceBounds[1]), minPrice);

    const filters: MarketplaceFilters = {
      priceRange: [minPrice, maxPrice],
      categories: selectedCategories,
      conditions: selectedConditions,
      locationRadius,
      sellerVerified,
      ratingMin,
      selectedCity,
      availabilityDate,
    };
    
    if (onApplyFilters) {
      onApplyFilters(filters);
    }
  };

  const handleClearFilters = () => {
    const defaults = buildDefaultFilters(priceBounds);

    setPriceRange(defaults.priceRange);
    setSelectedCategories(defaults.categories);
    setSelectedConditions(defaults.conditions);
    setLocationRadius(defaults.locationRadius);
    setSellerVerified(defaults.sellerVerified);
    setRatingMin(defaults.ratingMin);
    setSelectedCity(null);
    setAvailabilityDate(null);
    
    if (onClearFilters) {
      onClearFilters();
    }
  };

  return (
    <div className="w-full lg:w-72 space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </h3>
        {(selectedCategories.length > 0 || selectedConditions.length > 0 || isPriceRangeModified) && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Listing Mode Buttons (Rent / Sale) */}
      <div className="flex gap-2">
        <button
          onClick={() => onChangeListingMode ? onChangeListingMode(listingMode === 'rent' ? null : 'rent') : undefined}
          className={`flex-1 px-4 py-2 rounded-lg font-medium bg-blue-50 ${listingMode === 'rent' ? 'ring-2 ring-primary-600 text-primary-600' : 'text-gray-700'}`}
        >
          Rentals
        </button>

        <button
          onClick={() => onChangeListingMode ? onChangeListingMode(listingMode === 'sell' ? null : 'sell') : undefined}
          className={`flex-1 px-4 py-2 rounded-lg font-medium bg-green-50 ${listingMode === 'sell' ? 'ring-2 ring-primary-600 text-primary-600' : 'text-gray-700'}`}
        >
          For Sale
        </button>
      </div>

      {/* Price Range */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Price Range</h4>
          <span className="text-sm font-medium text-primary-600">
            PKR {priceRange[0].toLocaleString()} - PKR {priceRange[1].toLocaleString()}
          </span>
        </div>
        
        <div className="space-y-3">
          <input
            type="range"
            min={priceBounds[0]}
            max={priceBounds[1]}
            step="100"
            value={priceRange[0]}
            onChange={(e) => {
              const nextMin = parseInt(e.target.value, 10);
              setPriceRange([nextMin, Math.max(nextMin, priceRange[1])]);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={!hasPriceBounds}
          />
          <input
            type="range"
            min={priceBounds[0]}
            max={priceBounds[1]}
            step="100"
            value={priceRange[1]}
            onChange={(e) => {
              const nextMax = parseInt(e.target.value, 10);
              setPriceRange([Math.min(priceRange[0], nextMax), nextMax]);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={!hasPriceBounds}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {[0.25, 0.5, 0.75].map((fraction) => {
            const rangeSize = Math.max(priceBounds[1] - priceBounds[0], 0);
            const cap = Math.round(priceBounds[0] + rangeSize * fraction);
            return (
            <button
              key={fraction}
              onClick={() => setPriceRange([priceBounds[0], cap])}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={!hasPriceBounds}
            >
              Under PKR {cap.toLocaleString()}
            </button>
            );
          })}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Categories
        </h4>
        
        <div className="space-y-2">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => handleCategoryToggle(category.id)}
                  className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="ml-3 text-gray-700 group-hover:text-gray-900">
                  {category.label}
                </span>
              </div>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {getCategoryCount(category.id)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Condition */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Condition</h4>
        
        <div className="space-y-2">
          {conditions.map((condition) => (
            <label
              key={condition.id}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedConditions.includes(condition.id)}
                  onChange={() => handleConditionToggle(condition.id)}
                  className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="ml-3 text-gray-700 group-hover:text-gray-900">
                  {condition.label}
                </span>
              </div>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {getConditionCount(condition.id)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Location Radius */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Location Radius</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Within {locationRadius} km</span>
            <span className="text-sm font-medium">{locationRadius} km</span>
          </div>
          
          <input
            type="range"
            min="1"
            max="100"
            value={locationRadius}
            onChange={(e) => setLocationRadius(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 25].map((radius) => (
              <button
                key={radius}
                onClick={() => setLocationRadius(radius)}
                className={`px-3 py-2 text-sm border rounded-lg ${
                  locationRadius === radius
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {radius} km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* City Filter */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          City
        </h4>
        
        <select
          value={selectedCity ?? ''}
          onChange={(e) => setSelectedCity(e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700"
        >
          <option value="">All Cities</option>
          {availableCities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      {/* Availability Date Filter */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Available On
        </h4>
        
        <input
          type="date"
          value={availabilityDate ?? ''}
          onChange={(e) => setAvailabilityDate(e.target.value || null)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {availabilityDate && (
          <p className="text-sm text-gray-600">
            Showing items available on {new Date(availabilityDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Seller Verification */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Seller Type
        </h4>
        
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer group">
            <input
              type="checkbox"
              checked={sellerVerified}
              onChange={() => setSellerVerified(!sellerVerified)}
              className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="ml-3 text-gray-700 group-hover:text-gray-900">
              Verified Sellers Only
            </span>
          </label>
        </div>
      </div>

      {/* Minimum Rating */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Star className="h-4 w-4" />
            Minimum Rating
          </h4>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="ml-1 font-medium">{ratingMin <= 0 ? 'Any' : `${ratingMin}.0+`}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              onClick={() => setRatingMin(rating)}
              className={`flex items-center ${
                ratingMin >= rating
                  ? 'text-yellow-500'
                  : 'text-gray-300'
              }`}
            >
              <Star className="h-5 w-5 fill-current" />
            </button>
          ))}
        </div>
      </div>

      {/* Apply Filters Button */}
      <button
        onClick={handleApplyFilters}
        className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center gap-2"
      >
        <Check className="h-5 w-5" />
        Apply Filters
        {activeFilterCount > 0 && (
          <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
            {activeFilterCount}
          </span>
        )}
      </button>

      <button
        onClick={handleClearFilters}
        className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
      >
        Clear Filters
      </button>

      {/* Active Filters */}
      {(selectedCategories.length > 0 || selectedConditions.length > 0 || isPriceRangeModified || selectedCity || availabilityDate) && (
        <div className="pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Active Filters</h4>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(catId => {
              const cat = categories.find(c => c.id === catId);
              return cat && (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  {cat.label}
                  <button
                    onClick={() => handleCategoryToggle(cat.id)}
                    className="hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            
            {selectedConditions.map(condId => {
              const cond = conditions.find(c => c.id === condId);
              return cond && (
                <span
                  key={cond.id}
                  className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                >
                  {cond.label}
                  <button
                    onClick={() => handleConditionToggle(cond.id)}
                    className="hover:text-green-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            
            {isPriceRangeModified && (
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                PKR {priceRange[0].toLocaleString()} - PKR {priceRange[1].toLocaleString()}
                <button
                  onClick={() => setPriceRange(priceBounds)}
                  className="hover:text-purple-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedCity && (
              <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                📍 {selectedCity}
                <button
                  onClick={() => setSelectedCity(null)}
                  className="hover:text-orange-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {availabilityDate && (
              <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                📅 {new Date(availabilityDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                <button
                  onClick={() => setAvailabilityDate(null)}
                  className="hover:text-red-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSidebar;
