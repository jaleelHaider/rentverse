import React from 'react';
import { Calendar, MessageSquare, Star, DollarSign, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'booking' | 'message' | 'review' | 'payment' | 'warning' | 'success' | 'error';
  title: string;
  description: string;
  time: string;
  user?: string;
  amount?: number;
  read?: boolean;
}

interface RecentActivityProps {
  activities?: ActivityItem[];
  maxItems?: number;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ 
  activities = [],
  maxItems = 5 
}) => {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'booking': return Calendar;
      case 'message': return MessageSquare;
      case 'review': return Star;
      case 'payment': return DollarSign;
      case 'warning': return AlertCircle;
      case 'success': return CheckCircle;
      case 'error': return XCircle;
      default: return AlertCircle;
    }
  };

  const getIconColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'booking': return 'text-blue-600 bg-blue-100';
      case 'message': return 'text-purple-600 bg-purple-100';
      case 'review': return 'text-yellow-600 bg-yellow-100';
      case 'payment': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-orange-600 bg-orange-100';
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Mock data if none provided
  const mockActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'booking',
      title: 'New Booking Request',
      description: 'John Doe wants to rent your Canon EOS R5',
      time: '10 min ago',
      user: 'John Doe',
      amount: 2500,
    },
    {
      id: '2',
      type: 'payment',
      title: 'Payment Received',
      description: 'PKR 5,200 received for Sony A7III rental',
      time: '2 hours ago',
      amount: 5200,
    },
    {
      id: '3',
      type: 'review',
      title: 'New 5-Star Review',
      description: 'Sarah Johnson gave your camera 5 stars',
      time: '1 day ago',
      user: 'Sarah Johnson',
    },
    {
      id: '4',
      type: 'message',
      title: 'New Message',
      description: 'Alex wants to know about availability next week',
      time: '2 days ago',
      user: 'Alex Chen',
    },
    {
      id: '5',
      type: 'success',
      title: 'Listing Approved',
      description: 'Your GoPro Hero 11 listing is now live',
      time: '3 days ago',
    },
  ];

  const displayActivities = activities.length > 0 ? activities.slice(0, maxItems) : mockActivities;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <p className="text-sm text-gray-500 mt-1">Latest updates from your listings</p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {displayActivities.map((activity) => {
          const Icon = getIcon(activity.type);
          
          return (
            <div 
              key={activity.id} 
              className={`p-4 hover:bg-gray-50 transition-colors ${!activity.read ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-start">
                <div className={`p-2 rounded-lg ${getIconColor(activity.type)} mr-4`}>
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{activity.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      
                      {activity.user && (
                        <div className="flex items-center mt-2">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {activity.user}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <span className="text-sm text-gray-500">{activity.time}</span>
                      {activity.amount && (
                        <div className="text-lg font-bold text-green-600 mt-1">
                          PKR {activity.amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!activity.read && (
                    <div className="flex items-center mt-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                      <span className="text-xs text-blue-600">New</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {displayActivities.length > 0 && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button className="text-sm text-blue-600 font-medium hover:text-blue-800">
            View All Activity →
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;