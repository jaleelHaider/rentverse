import React from 'react';
import { Star, Shield, MapPin, CheckCircle, MessageCircle, Phone } from 'lucide-react';

interface SellerInfoProps {
  seller: {
    name: string;
    rating: number;
    totalReviews: number;
    memberSince: string;
    verified: boolean;
    location: string;
    responseRate: number;
    responseTime: string;
    totalListings: number;
    avatar?: string;
  };
  onMessageSeller?: () => void;
  isMessageLoading?: boolean;
  disableMessageButton?: boolean;
}

const SellerInfo: React.FC<SellerInfoProps> = ({
  seller,
  onMessageSeller,
  isMessageLoading = false,
  disableMessageButton = false,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {seller.avatar ? (
              <img
                src={seller.avatar}
                alt={seller.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              seller.name.charAt(0)
            )}
          </div>
          {seller.verified && (
            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full">
              <Shield className="h-4 w-4" />
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">{seller.name}</h3>
            {seller.verified && (
              <span className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                <CheckCircle className="h-3 w-3" />
                Verified
              </span>
            )}
          </div>
          
          <div className="flex items-center mt-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(seller.rating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">
              {seller.rating} ({seller.totalReviews} reviews)
            </span>
          </div>
          
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span>{seller.location}</span>
          </div>
        </div>
      </div>

      {/* Seller Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{seller.responseRate}%</div>
          <div className="text-xs text-gray-500">Response Rate</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{seller.responseTime}</div>
          <div className="text-xs text-gray-500">Avg. Response Time</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{seller.totalListings}</div>
          <div className="text-xs text-gray-500">Active Listings</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{seller.memberSince}</div>
          <div className="text-xs text-gray-500">Member Since</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={onMessageSeller}
          disabled={isMessageLoading || disableMessageButton || !onMessageSeller}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <MessageCircle className="h-5 w-5" />
          {disableMessageButton ? 'Your Listing' : isMessageLoading ? 'Opening...' : 'Message Seller'}
        </button>
        
        <button className="w-full flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
          <Phone className="h-5 w-5" />
          Call Seller
        </button>
      </div>

      {/* Additional Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Seller Information</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>ID verified</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Email verified</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Phone verified</span>
          </li>
          {seller.verified && (
            <li className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>RentVerse Verified Seller</span>
            </li>
          )}
        </ul>
      </div>

      {/* Report Button */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <button className="w-full py-2 text-sm text-gray-500 hover:text-red-600">
          Report this seller
        </button>
      </div>
    </div>
  );
};

export default SellerInfo;