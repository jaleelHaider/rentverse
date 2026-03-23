import React, { useState } from 'react';
import { TrendingUp, BarChart3, Download, Filter } from 'lucide-react';

interface EarningsData {
  month: string;
  earnings: number;
  bookings: number;
}

interface EarningsChartProps {
  data?: EarningsData[];
  timeframe?: 'week' | 'month' | 'year';
}

const EarningsChart: React.FC<EarningsChartProps> = ({ 
  data,
  timeframe = 'month' 
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>(timeframe);

  // Mock data
  const mockData: EarningsData[] = [
    { month: 'Jan', earnings: 42000, bookings: 12 },
    { month: 'Feb', earnings: 52000, bookings: 15 },
    { month: 'Mar', earnings: 38000, bookings: 11 },
    { month: 'Apr', earnings: 61000, bookings: 18 },
    { month: 'May', earnings: 72000, bookings: 22 },
    { month: 'Jun', earnings: 68000, bookings: 20 },
    { month: 'Jul', earnings: 85000, bookings: 25 },
    { month: 'Aug', earnings: 79000, bookings: 23 },
  ];

  const chartData = data || mockData;
  const maxEarnings = Math.max(...chartData.map(d => d.earnings));
  const totalEarnings = chartData.reduce((sum, d) => sum + d.earnings, 0);
  const totalBookings = chartData.reduce((sum, d) => sum + d.bookings, 0);

  const timeframes: Array<{ id: 'week' | 'month' | 'year'; label: string }> = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Earnings Overview</h3>
            <p className="text-sm text-gray-500 mt-1">Track your rental income and bookings</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <Filter className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex space-x-2 mt-4">
          {timeframes.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setSelectedTimeframe(tf.id)}
              className={`
                px-4 py-2 text-sm rounded-lg transition-colors
                ${selectedTimeframe === tf.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-700">Total Earnings</p>
                <h4 className="text-2xl font-bold text-blue-900">
                  PKR {totalEarnings.toLocaleString()}
                </h4>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              +12% from last {selectedTimeframe}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-xl">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700">Total Bookings</p>
                <h4 className="text-2xl font-bold text-green-900">
                  {totalBookings}
                </h4>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2">
              {Math.round((totalBookings / chartData.length) * 10) / 10} avg per month
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-xl">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-purple-700">Avg. per Booking</p>
                <h4 className="text-2xl font-bold text-purple-900">
                  PKR {Math.round(totalEarnings / totalBookings).toLocaleString()}
                </h4>
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-2">
              Highest: PKR 4,500 • Lowest: PKR 1,800
            </p>
          </div>
        </div>
        
        {/* Chart */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Monthly Breakdown</h4>
            <div className="flex items-center text-sm text-gray-500">
              <div className="flex items-center mr-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>Earnings</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Bookings</span>
              </div>
            </div>
          </div>
          
          <div className="relative h-64">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-gray-100"></div>
              ))}
            </div>
            
            {/* Chart Bars and Labels */}
            <div className="absolute inset-0 flex items-end justify-between px-4 pb-8">
              {chartData.map((item, index) => {
                const barHeight = (item.earnings / maxEarnings) * 80;
                const bookingHeight = (item.bookings / Math.max(...chartData.map(d => d.bookings))) * 40;
                
                return (
                  <div key={index} className="flex flex-col items-center w-8">
                    {/* Earnings Bar */}
                    <div
                      className="w-6 bg-blue-500 rounded-t-lg relative group"
                      style={{ height: `${barHeight}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        PKR {item.earnings.toLocaleString()}
                      </div>
                    </div>
                    
                    {/* Bookings Bar */}
                    <div
                      className="w-4 bg-green-500 rounded-t-lg mt-1 relative group"
                      style={{ height: `${bookingHeight}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {item.bookings} bookings
                      </div>
                    </div>
                    
                    {/* Month Label */}
                    <span className="text-xs text-gray-500 mt-2">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Chart Legend */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Performance Insights</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Peak earnings in July: PKR 85,000</li>
                <li>• Average booking value: PKR 3,450</li>
                <li>• 88% customer satisfaction rate</li>
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Add more weekend availability</li>
                <li>• Consider premium pricing in peak months</li>
                <li>• Bundle items for higher value bookings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsChart;