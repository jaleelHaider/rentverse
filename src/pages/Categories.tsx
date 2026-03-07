import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Smartphone, 
  Home, 
  Car, 
  Shirt, 
  Dumbbell, 
  BookOpen, 
  Camera,
  Sofa,
  Gamepad2,
  Music,
  TrendingUp,
  Star,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react'

const Categories: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')

  const categories = [
    {
      id: 'electronics',
      name: 'Electronics',
      icon: <Smartphone size={32} />,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      count: 12500,
      subCategories: ['Smartphones', 'Laptops', 'Cameras', 'TVs', 'Audio', 'Tablets', 'Gaming Consoles', 'Smart Watches'],
      popular: true
    },
    {
      id: 'furniture',
      name: 'Furniture',
      icon: <Sofa size={32} />,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      count: 8400,
      subCategories: ['Sofas', 'Beds', 'Tables', 'Chairs', 'Wardrobes', 'Office Furniture', 'Garden Furniture'],
      popular: true
    },
    {
      id: 'vehicles',
      name: 'Vehicles',
      icon: <Car size={32} />,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-50',
      count: 5600,
      subCategories: ['Cars', 'Motorcycles', 'Scooters', 'Bicycles', 'Car Accessories', 'Vehicle Rental'],
      popular: true
    },
    {
      id: 'fashion',
      name: 'Fashion',
      icon: <Shirt size={32} />,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-50',
      count: 15200,
      subCategories: ['Clothing', 'Shoes', 'Watches', 'Jewelry', 'Bags', 'Accessories', 'Traditional Wear'],
      popular: true
    },
    {
      id: 'sports',
      name: 'Sports & Fitness',
      icon: <Dumbbell size={32} />,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-50',
      count: 6800,
      subCategories: ['Fitness Equipment', 'Outdoor Sports', 'Cycling', 'Team Sports', 'Camping Gear', 'Water Sports'],
      popular: false
    },
    {
      id: 'home',
      name: 'Home & Garden',
      icon: <Home size={32} />,
      color: 'from-teal-500 to-emerald-500',
      bgColor: 'bg-teal-50',
      count: 9200,
      subCategories: ['Appliances', 'Tools', 'Home Decor', 'Garden Tools', 'Kitchenware', 'Lighting'],
      popular: true
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      icon: <Gamepad2 size={32} />,
      color: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-50',
      count: 7400,
      subCategories: ['Gaming', 'Musical Instruments', 'Books', 'Movies', 'Board Games', 'Party Equipment'],
      popular: false
    },
    {
      id: 'equipment',
      name: 'Equipment',
      icon: <Camera size={32} />,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-indigo-50',
      count: 4100,
      subCategories: ['Camera Gear', 'Audio Equipment', 'DJ Gear', 'Studio Equipment', 'Event Equipment'],
      popular: false
    },
    {
      id: 'baby',
      name: 'Baby & Kids',
      icon: <BookOpen size={32} />,
      color: 'from-rose-500 to-pink-500',
      bgColor: 'bg-rose-50',
      count: 3800,
      subCategories: ['Toys', 'Baby Gear', 'Kids Furniture', 'Educational', 'Strollers', 'Clothing'],
      popular: false
    },
    {
      id: 'services',
      name: 'Services',
      icon: <Music size={32} />,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-50',
      count: 2500,
      subCategories: ['Photography', 'Music', 'Tutoring', 'Repair', 'Delivery', 'Event Planning'],
      popular: false
    }
  ]

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.subCategories.some(sub => sub.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const popularCategories = categories.filter(cat => cat.popular)

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-purple-50 py-20">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Browse Categories
            </h1>
            <p className="text-xl text-gray-600 mb-10">
              Find exactly what you're looking for across 50,000+ items for rent and sale in Pakistan
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories (e.g., 'camera', 'furniture', 'sports')"
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-primary-500 focus:border-transparent"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-sm text-gray-500">Popular:</span>
                {['Electronics', 'Furniture', 'Vehicles', 'Fashion'].map((item) => (
                  <button
                    key={item}
                    onClick={() => setSearchQuery(item)}
                    className="text-sm bg-white border border-gray-300 hover:border-primary-500 hover:text-primary-600 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-200">
        <div className="container-custom py-6">
          <div className="flex flex-wrap justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{categories.length}</div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">50K+</div>
                <div className="text-sm text-gray-600">Active Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">200+</div>
                <div className="text-sm text-gray-600">Cities</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter size={18} />
                <span>Filter</span>
              </button>
              <select className="border border-gray-300 rounded-lg px-3 py-2">
                <option>Sort by: Popularity</option>
                <option>Sort by: Name A-Z</option>
                <option>Sort by: Item Count</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Main Categories Grid */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          {searchQuery ? (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">
                Search Results for "{searchQuery}"
                <span className="text-gray-500 font-normal ml-2">
                  ({filteredCategories.length} categories found)
                </span>
              </h2>
            </div>
          ) : (
            <>
              {/* Popular Categories */}
              <div className="mb-12">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Most Popular Categories</h2>
                    <p className="text-gray-600">Browse our most active categories</p>
                  </div>
                  <div className="flex items-center gap-2 text-primary-600">
                    <TrendingUp size={20} />
                    <span className="font-medium">Trending Now</span>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {popularCategories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/browse?category=${category.id}`}
                      className="card p-6 hover:shadow-lg transition-shadow group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-14 h-14 rounded-xl ${category.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <div className={`bg-gradient-to-r ${category.color} bg-clip-text text-transparent`}>
                            {category.icon}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-primary-50 text-primary-700 px-2 py-1 rounded-full text-sm">
                          <Star size={12} />
                          <span>Popular</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-2 group-hover:text-primary-600">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {category.count.toLocaleString()} items available
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {category.subCategories.slice(0, 3).map((sub, index) => (
                          <span
                            key={index}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                          >
                            {sub}
                          </span>
                        ))}
                        {category.subCategories.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{category.subCategories.length - 3} more
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">All Categories</h2>
                <p className="text-gray-600">Browse everything available on RentVerse</p>
              </div>
            </>
          )}

          {/* All Categories Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCategories.map((category) => (
              <Link
                key={category.id}
                to={`/browse?category=${category.id}`}
                className="card p-6 hover:shadow-lg transition-shadow group"
              >
                <div className={`w-16 h-16 rounded-xl ${category.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <div className={`bg-gradient-to-r ${category.color} bg-clip-text text-transparent`}>
                    {category.icon}
                  </div>
                </div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg group-hover:text-primary-600">
                    {category.name}
                  </h3>
                  <span className="text-sm font-medium text-primary-600">
                    {category.count.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {category.subCategories.slice(0, 4).join(', ')}
                  {category.subCategories.length > 4 && '...'}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm text-primary-600 font-medium flex items-center gap-1">
                    Browse <ChevronRight size={16} />
                  </span>
                  <span className="text-xs text-gray-500">
                    {category.subCategories.length} sub-categories
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* No Results State */}
          {filteredCategories.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Search size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-4">No categories found</h3>
              <p className="text-gray-600 mb-8">
                We couldn't find any categories matching "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="btn-primary"
              >
                View All Categories
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Category Spotlight */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Category Spotlight</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover what's trending in popular categories this month
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-8 rounded-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <TrendingUp className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Fastest Growing</h3>
                  <p className="text-sm text-gray-600">Camera Equipment</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Rental demand for professional cameras and gear has increased by 45% this month
              </p>
              <Link 
                to="/browse?category=equipment"
                className="text-blue-600 font-medium flex items-center gap-2"
              >
                Explore Category <ChevronRight size={16} />
              </Link>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <Star className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Highest Rated</h3>
                  <p className="text-sm text-gray-600">Home Appliances</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                4.8/5 average rating with 2,400+ verified transactions this month
              </p>
              <Link 
                to="/browse?category=home"
                className="text-green-600 font-medium flex items-center gap-2"
              >
                Explore Category <ChevronRight size={16} />
              </Link>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-8 rounded-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <Car className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Best for Earnings</h3>
                  <p className="text-sm text-gray-600">Vehicle Rentals</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Average monthly earnings of PKR 25,000+ for vehicle owners on our platform
              </p>
              <Link 
                to="/browse?category=vehicles"
                className="text-purple-600 font-medium flex items-center gap-2"
              >
                Explore Category <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-purple-600">
        <div className="container-custom text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Found What You're Looking For?
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Start browsing thousands of items or list your own in just minutes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/browse" 
              className="bg-white text-primary-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              Start Browsing
            </Link>
            <Link 
              to="/create-listing" 
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              List Your Item
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Categories