import React, { useState } from 'react';
import { Calendar, Users, Shield, Zap } from 'lucide-react';

interface RentalSettingsProps {
  onSettingsChange?: (settings: {
    minRentalDays: number;
    maxRentalDays: number;
    instantBooking: boolean;
    maxRenters: number;
    securityDeposit: number;
  }) => void;
}

const RentalSettings: React.FC<RentalSettingsProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState({
    minRentalDays: 1,
    maxRentalDays: 30,
    instantBooking: true,
    maxRenters: 1,
    securityDeposit: 0,
  });

  const updateSetting = (key: keyof typeof settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Rental Settings</h3>
      
      {/* Minimum & Maximum Rental Days */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
            Minimum Rental Days
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="1"
              max="30"
              value={settings.minRentalDays}
              onChange={(e) => updateSetting('minRentalDays', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-lg font-semibold text-blue-600 min-w-[3rem]">
              {settings.minRentalDays} day{settings.minRentalDays !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
            Maximum Rental Days
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="1"
              max="365"
              value={settings.maxRentalDays}
              onChange={(e) => updateSetting('maxRentalDays', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-lg font-semibold text-blue-600 min-w-[3rem]">
              {settings.maxRentalDays} day{settings.maxRentalDays !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Instant Booking */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center">
          <Zap className="h-5 w-5 text-yellow-500 mr-3" />
          <div>
            <h4 className="font-medium text-gray-900">Instant Booking</h4>
            <p className="text-sm text-gray-500">Allow instant booking without approval</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateSetting('instantBooking', !settings.instantBooking)}
          className={`
            relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent 
            rounded-full cursor-pointer transition-colors ease-in-out duration-200 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            ${settings.instantBooking ? 'bg-green-500' : 'bg-gray-200'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 rounded-full bg-white 
              shadow transform ring-0 transition ease-in-out duration-200
              ${settings.instantBooking ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Max Renters */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
          <Users className="h-4 w-4 mr-2 text-gray-500" />
          Maximum Number of Renters
        </label>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => updateSetting('maxRenters', num)}
              className={`
                flex-1 py-3 text-center border rounded-lg transition-colors
                ${settings.maxRenters === num 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 hover:bg-gray-50'}
              `}
            >
              {num} {num === 1 ? 'person' : 'people'}
            </button>
          ))}
        </div>
      </div>

      {/* Security Deposit */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
          <Shield className="h-4 w-4 mr-2 text-gray-500" />
          Security Deposit
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[0, 100, 250, 500].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => updateSetting('securityDeposit', amount)}
              className={`
                py-3 text-center border rounded-lg transition-colors
                ${settings.securityDeposit === amount 
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' 
                  : 'border-gray-300 hover:bg-gray-50'}
              `}
            >
              {amount === 0 ? 'None' : `$${amount}`}
            </button>
          ))}
        </div>
        {settings.securityDeposit > 0 && (
          <p className="mt-2 text-sm text-gray-500">
            This amount will be held and refunded after the rental period ends, assuming no damages.
          </p>
        )}
      </div>
    </div>
  );
};

export default RentalSettings;