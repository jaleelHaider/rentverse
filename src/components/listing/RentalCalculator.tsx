import React, { useState, useEffect } from 'react';
import { Calendar, Calculator, Tag, Clock } from 'lucide-react';

interface RentalPrice {
  daily: number;
  weekly: number;
  monthly: number;
}

interface RentalCalculatorProps {
  listing: {
    price: {
      rent: RentalPrice;
      securityDeposit: number;
    };
    title: string;
  };
}

const RentalCalculator: React.FC<RentalCalculatorProps> = ({ listing }) => {
  const [duration, setDuration] = useState(1);
  const [durationType, setDurationType] = useState<'days' | 'weeks' | 'months'>('days');
  const [includeDeposit, setIncludeDeposit] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  useEffect(() => {
    calculatePrice();
  }, [duration, durationType, includeDeposit, discount]);

  const calculatePrice = () => {
    let basePrice = 0;
    
    switch (durationType) {
      case 'days':
        basePrice = listing.price.rent.daily * duration;
        break;
      case 'weeks':
        basePrice = listing.price.rent.weekly * duration;
        break;
      case 'months':
        basePrice = listing.price.rent.monthly * duration;
        break;
    }

    // Apply discount
    const discountedPrice = basePrice - (basePrice * discount) / 100;
    
    // Add security deposit if included
    const total = discountedPrice + (includeDeposit ? listing.price.securityDeposit : 0);
    
    setCalculatedPrice(total);
  };

  const getBasePrice = () => {
    switch (durationType) {
      case 'days':
        return listing.price.rent.daily;
      case 'weeks':
        return listing.price.rent.weekly;
      case 'months':
        return listing.price.rent.monthly;
    }
  };

  const discountOptions = [
    { value: 0, label: 'No Discount' },
    { value: 5, label: '5% (Weekly)' },
    { value: 10, label: '10% (Monthly)' },
    { value: 15, label: '15% (Seasonal)' },
  ];

  const totalWithoutDeposit = calculatedPrice - (includeDeposit ? listing.price.securityDeposit : 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calculator className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Rental Calculator</h3>
          <p className="text-sm text-gray-500">Estimate your rental cost</p>
        </div>
      </div>

      {/* Duration Selector */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rental Duration
          </label>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <select
                value={durationType}
                onChange={(e) => setDurationType(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>
        </div>

        {/* Discount Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Discount
          </label>
          <div className="grid grid-cols-2 gap-2">
            {discountOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDiscount(option.value)}
                className={`py-2 px-3 text-sm border rounded-lg transition-colors ${
                  discount === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Security Deposit Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-gray-500 mr-3" />
            <div>
              <div className="font-medium text-gray-900">Security Deposit</div>
              <div className="text-sm text-gray-500">Fully refundable</div>
            </div>
          </div>
          <div className="flex items-center">
            <span className="mr-3 text-gray-900">₹{listing.price.securityDeposit}</span>
            <button
              type="button"
              onClick={() => setIncludeDeposit(!includeDeposit)}
              className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ${
                includeDeposit ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transform transition-transform ${
                  includeDeposit ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base price ({duration} {durationType}):</span>
            <span className="font-medium">₹{totalWithoutDeposit.toLocaleString()}</span>
          </div>
          
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount ({discount}%):</span>
              <span className="text-green-600 font-medium">
                -₹{((getBasePrice() * duration * discount) / 100).toLocaleString()}
              </span>
            </div>
          )}
          
          {includeDeposit && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Security deposit:</span>
              <span className="text-blue-600 font-medium">
                +₹{listing.price.securityDeposit.toLocaleString()}
              </span>
            </div>
          )}
          
          <div className="pt-3 border-t border-gray-300">
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold text-gray-900">Total Amount</div>
              <div className="text-2xl font-bold text-blue-700">
                ₹{calculatedPrice.toLocaleString()}
              </div>
            </div>
            {includeDeposit && (
              <div className="text-xs text-gray-500 mt-1">
                * ₹{listing.price.securityDeposit} deposit will be refunded after item return
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <button className="py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            Add to Cart
          </button>
          <button className="py-3 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50">
            Save Quote
          </button>
        </div>

        {/* Savings Info */}
        {durationType === 'months' && duration >= 1 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Tag className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm text-green-700">
                Save ₹{(listing.price.rent.daily * 30 - listing.price.rent.monthly).toLocaleString()} by choosing monthly rental
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RentalCalculator;