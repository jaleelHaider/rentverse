import React from 'react';
import { Plus, Edit, Eye, Share2, Bell, Settings, Download, Filter } from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  actions?: QuickAction[];
}

const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  const defaultActions: QuickAction[] = [
    {
      id: 'create',
      title: 'Create New Listing',
      description: 'List an item for rent or sale',
      icon: <Plus className="h-6 w-6" />,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      id: 'edit',
      title: 'Edit Listings',
      description: 'Update your existing listings',
      icon: <Edit className="h-6 w-6" />,
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      id: 'view',
      title: 'View Analytics',
      description: 'See your earnings and stats',
      icon: <Eye className="h-6 w-6" />,
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      id: 'share',
      title: 'Share Profile',
      description: 'Share your renter profile',
      icon: <Share2 className="h-6 w-6" />,
      color: 'bg-orange-600 hover:bg-orange-700',
    },
    {
      id: 'notify',
      title: 'Notifications',
      description: 'Manage your notification settings',
      icon: <Bell className="h-6 w-6" />,
      color: 'bg-red-600 hover:bg-red-700',
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Account and listing preferences',
      icon: <Settings className="h-6 w-6" />,
      color: 'bg-gray-600 hover:bg-gray-700',
    },
    {
      id: 'export',
      title: 'Export Data',
      description: 'Download your rental history',
      icon: <Download className="h-6 w-6" />,
      color: 'bg-teal-600 hover:bg-teal-700',
    },
    {
      id: 'filter',
      title: 'Advanced Filters',
      description: 'Filter your listings and bookings',
      icon: <Filter className="h-6 w-6" />,
      color: 'bg-indigo-600 hover:bg-indigo-700',
    },
  ];

  const displayActions = actions || defaultActions;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-500 mt-1">Frequently used actions for your dashboard</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayActions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`
              flex flex-col items-center justify-center p-4 rounded-xl
              text-white ${action.color} transition-all hover:scale-[1.02]
              min-h-[120px] text-center
            `}
          >
            <div className="mb-3">
              {action.icon}
            </div>
            <h4 className="font-medium text-sm mb-1">{action.title}</h4>
            <p className="text-xs opacity-90">{action.description}</p>
          </button>
        ))}
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Pro Tip</h4>
          <p className="text-sm text-gray-600">
            Use the "Create New Listing" wizard to quickly add items. 
            Items with photos get 3x more views!
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
