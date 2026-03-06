import React, { useState } from 'react';
import { DollarSign, Tag, AlertCircle } from 'lucide-react';

interface PriceInputProps {
  value?: number;
  onChange?: (price: number, isNegotiable: boolean) => void;
  currency?: string;
  showNegotiableOption?: boolean;
}

const PriceInput: React.FC<PriceInputProps> = ({
  value = 0,
  onChange,
  currency = 'USD',
  showNegotiableOption = true,
}) => {
  const [price, setPrice] = useState<string>(value.toString());
  const [isNegotiable, setIsNegotiable] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Allow only numbers and decimal point
    if (input === '' || /^\d*\.?\d*$/.test(input)) {
      setPrice(input);
      setError('');
      
      const numValue = parseFloat(input);
      if (!isNaN(numValue) && onChange) {
        onChange(numValue, isNegotiable);
      }
    }
  };

  const handleNegotiableToggle = () => {
    const newNegotiable = !isNegotiable;
    setIsNegotiable(newNegotiable);
    
    if (onChange) {
      const numValue = parseFloat(price) || 0;
      onChange(numValue, newNegotiable);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const validatePrice = () => {
    const numValue = parseFloat(price);
    if (price && isNaN(numValue)) {
      setError('Please enter a valid number');
      return false;
    }
    if (numValue < 0) {
      setError('Price cannot be negative');
      return false;
    }
    if (numValue > 1000000) {
      setError('Price seems unusually high');
      return false;
    }
    setError('');
    return true;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rental Price
        </label>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          
          <input
            type="text"
            value={price}
            onChange={handlePriceChange}
            onBlur={validatePrice}
            placeholder="0.00"
            className={`
              block w-full pl-10 pr-12 py-3 border rounded-lg shadow-sm
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${error ? 'border-red-300' : 'border-gray-300'}
              ${isNegotiable ? 'bg-gray-50' : 'bg-white'}
            `}
          />
          
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">{currency}</span>
          </div>
        </div>

        {error && (
          <div className="mt-2 flex items-center text-sm text-red-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            {error}
          </div>
        )}

        {/* Price preview */}
        {price && !error && (
          <div className="mt-2 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">Preview:</span>{" "}
              {formatCurrency(parseFloat(price))} per day
            </div>
            {parseFloat(price) > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                ≈ {formatCurrency(parseFloat(price) * 30)} per month
              </div>
            )}
          </div>
        )}
      </div>

      {showNegotiableOption && (
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleNegotiableToggle}
            className={`
              relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent 
              rounded-full cursor-pointer transition-colors ease-in-out duration-200 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              ${isNegotiable ? 'bg-blue-600' : 'bg-gray-200'}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 rounded-full bg-white 
                shadow transform ring-0 transition ease-in-out duration-200
                ${isNegotiable ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
          
          <div className="ml-3">
            <span className="text-sm font-medium text-gray-700">
              Price is negotiable
            </span>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <Tag className="h-3 w-3 mr-1" />
              <span>
                {isNegotiable 
                  ? "Buyers can negotiate the price" 
                  : "Fixed price - no negotiation"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Suggested prices */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Suggested daily rates:
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {[25, 50, 100, 200].map((suggestedPrice) => (
            <button
              key={suggestedPrice}
              type="button"
              onClick={() => {
                setPrice(suggestedPrice.toString());
                if (onChange) {
                  onChange(suggestedPrice, isNegotiable);
                }
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {formatCurrency(suggestedPrice)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriceInput;