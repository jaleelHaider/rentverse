import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Smartphone, 
  Home, 
  Car, 
  Shirt, 
  Dumbbell, 
  Camera,
  Sofa,
  Gamepad2,
  ChevronRight
} from 'lucide-react'

interface CategoryDropdownProps {
  onLinkClick?: () => void
}

const categories = [
  {
    id: 'electronics',
    name: 'Electronics',
    icon: <Smartphone size={20} />,
    sub: ['Phones', 'Laptops', 'TVs', 'Cameras', 'Audio', 'Tablets', 'Gaming', 'Wearables'],
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'furniture',
    name: 'Furniture',
    icon: <Sofa size={20} />,
    sub: ['Sofas', 'Beds', 'Tables', 'Chairs', 'Wardrobes', 'Office', 'Garden'],
    color: 'text-amber-600',
    bgColor: 'bg-amber-50'
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    icon: <Car size={20} />,
    sub: ['Cars', 'Motorcycles', 'Scooters', 'Bicycles', 'Accessories'],
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50'
  },
  {
    id: 'fashion',
    name: 'Fashion',
    icon: <Shirt size={20} />,
    sub: ['Clothing', 'Shoes', 'Watches', 'Jewelry', 'Bags', 'Accessories'],
    color: 'text-pink-600',
    bgColor: 'bg-pink-50'
  },
  {
    id: 'sports',
    name: 'Sports',
    icon: <Dumbbell size={20} />,
    sub: ['Fitness', 'Outdoor', 'Cycling', 'Team Sports', 'Water Sports'],
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'home',
    name: 'Home & Garden',
    icon: <Home size={20} />,
    sub: ['Appliances', 'Tools', 'Decor', 'Garden', 'Kitchenware'],
    color: 'text-teal-600',
    bgColor: 'bg-teal-50'
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: <Gamepad2 size={20} />,
    sub: ['Gaming', 'Instruments', 'Books', 'Movies', 'Party'],
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  {
    id: 'equipment',
    name: 'Equipment',
    icon: <Camera size={20} />,
    sub: ['Camera Gear', 'Audio', 'DJ', 'Studio', 'Event'],
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  }
]

const CategoryDropdown: React.FC<CategoryDropdownProps> = ({ onLinkClick }) => {
  return (
    <div className="absolute top-full left-0 mt-2 w-[800px] bg-white rounded-xl shadow-2xl border border-gray-200 p-6 z-50">
      <div className="grid grid-cols-2 gap-8">
        {/* Left Column - Categories */}
        <div>
          <h3 className="font-bold text-lg mb-4">All Categories</h3>
          <div className="space-y-2">
            {categories.map(category => (
              <Link
                key={category.id}
                to={`/browse?category=${category.id}`}
                onClick={onLinkClick}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 group"
              >
                <div className={`w-10 h-10 ${category.bgColor} rounded-lg flex items-center justify-center`}>
                  <div className={category.color}>
                    {category.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 group-hover:text-primary-600">
                    {category.name}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {category.sub.slice(0, 2).map((sub, idx) => (
                      <span key={idx} className="text-xs text-gray-500">
                        {sub}{idx < 1 ? ', ' : ''}
                      </span>
                    ))}
                    {category.sub.length > 2 && (
                      <span className="text-xs text-gray-400">+{category.sub.length - 2} more</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-primary-600" />
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column - Featured & Quick Links */}
        <div>
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4">Featured</h3>
            <div className="space-y-4">
              <Link 
                to="/browse?featured=trending"
                onClick={onLinkClick}
                className="block p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl hover:from-blue-100 hover:to-cyan-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600">🔥</span>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-800">Trending Now</div>
                    <div className="text-sm text-blue-600">See what's popular this week</div>
                  </div>
                </div>
              </Link>
              
              <Link 
                to="/browse?featured=rentals"
                onClick={onLinkClick}
                className="block p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl hover:from-green-100 hover:to-emerald-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600">📅</span>
                  </div>
                  <div>
                    <div className="font-semibold text-green-800">Best for Rent</div>
                    <div className="text-sm text-green-600">Tools, equipment, party items</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link 
                to="/categories"
                onClick={onLinkClick}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm"
              >
                Browse All Categories
              </Link>
              <Link 
                to="/browse?type=rent"
                onClick={onLinkClick}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm"
              >
                Items for Rent
              </Link>
              <Link 
                to="/browse?type=buy"
                onClick={onLinkClick}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm"
              >
                Items for Sale
              </Link>
              <Link 
                to="/how-it-works"
                onClick={onLinkClick}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm"
              >
                How It Works
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900">Need help choosing?</div>
            <div className="text-sm text-gray-600">Our AI assistant can help you find what you need</div>
          </div>
          <Link 
            to="/browse?ai=assist"
            onClick={onLinkClick}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            Get AI Help
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CategoryDropdown
