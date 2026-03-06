import React, { useState } from 'react';
import { X, Filter, Check, DollarSign, Star, Shield, Package } from 'lucide-react';

interface FilterSidebarProps {
  onApplyFilters?: (filters: any) => void;
  onClearFilters?: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ onApplyFilters, onClearFilters }) => {
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [locationRadius, setLocationRadius] = useState<number>(25);
  const [sellerVerified, setSellerVerified] = useState<boolean>(true);
  const [instantBooking, setInstantBooking] = useState<boolean>(false);
  const [ratingMin, setRatingMin] = useState<number>(4);

  const categories = [
    { id: 'electronics', label: 'Electronics', count: 324 },
    { id: 'vehicles', label: 'Vehicles', count: 189 },
    { id: 'tools', label: 'Tools & Equipment', count: 256 },
    { id: 'party', label: 'Party & Events', count: 142 },
    { id: 'sports', label: 'Sports & Outdoors', count: 218 },
    { id: 'creative', label: 'Creative', count: 176 },
    { id: 'home', label: 'Home & Garden', count: 312 },
    { id: 'other', label: 'Other', count: 98 },
  ];

  const conditions = [
    { id: 'new', label: 'Brand New', count: 45 },
    { id: 'excellent', label: 'Like New', count: 123 },
    { id: 'good', label: 'Good', count: 345 },
    { id: 'fair', label: 'Fair', count: 189 },
    { id: 'poor', label: 'Needs Work', count: 67 },
  ];

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
    const filters = {
      priceRange,
      categories: selectedCategories,
      conditions: selectedConditions,
      locationRadius,
      sellerVerified,
      instantBooking,
      ratingMin,
    };
    
    if (onApplyFilters) {
      onApplyFilters(filters);
    }
  };

  const handleClearFilters = () => {
    setPriceRange([0, 10000]);
    setSelectedCategories([]);
    setSelectedConditions([]);
    setLocationRadius(25);
    setSellerVerified(true);
    setInstantBooking(false);
    setRatingMin(4);
    
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
        {(selectedCategories.length > 0 || selectedConditions.length > 0 || priceRange[1] < 10000) && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Price Range */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Price Range
          </h4>
          <span className="text-sm font-medium text-primary-600">
            PKR{priceRange[0].toLocaleString()} - PKR{priceRange[1].toLocaleString()}
          </span>
        </div>
        
        <div className="space-y-3">
          <input
            type="range"
            min="0"
            max="10000"
            step="100"
            value={priceRange[0]}
            onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <input
            type="range"
            min="0"
            max="10000"
            step="100"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {[500, 2000, 5000].map((price) => (
            <button
              key={price}
              onClick={() => setPriceRange([0, price])}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Under PKR{price}
            </button>
          ))}
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
                {category.count}
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
                {condition.count}
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
          
          <label className="flex items-center cursor-pointer group">
            <input
              type="checkbox"
              checked={instantBooking}
              onChange={() => setInstantBooking(!instantBooking)}
              className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="ml-3 text-gray-700 group-hover:text-gray-900">
              Instant Booking Available
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
            <span className="ml-1 font-medium">{ratingMin}.0+</span>
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
        {(selectedCategories.length > 0 || selectedConditions.length > 0 || priceRange[1] < 10000) && (
          <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
            {selectedCategories.length + selectedConditions.length + (priceRange[1] < 10000 ? 1 : 0)}
          </span>
        )}
      </button>

      {/* Active Filters */}
      {(selectedCategories.length > 0 || selectedConditions.length > 0 || priceRange[1] < 10000) && (
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
            
            {priceRange[1] < 10000 && (
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                Up to PKR{priceRange[1]}
                <button
                  onClick={() => setPriceRange([0, 10000])}
                  className="hover:text-purple-900"
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