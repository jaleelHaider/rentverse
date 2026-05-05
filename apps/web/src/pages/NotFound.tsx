import React from 'react'
import { Link } from 'react-router-dom'
import { Home, Search, ArrowLeft, Frown, Package } from 'lucide-react'

const NotFound: React.FC = () => {
  return (
    <div className="my-10 min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-purple-50 px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-primary-100 to-purple-100 rounded-full mb-6">
            <Frown className="text-primary-600" size={48} />
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <span className="text-sm font-medium text-gray-500">404 Error</span>
            <div className="w-12 h-0.5 bg-gray-300"></div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Page Not Found
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 max-w-lg mx-auto">
            Oops! The page you're looking for doesn't exist or has been moved. 
            Let's get you back on track.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <div className="card p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Home className="text-blue-600" size={24} />
            </div>
            <h3 className="font-semibold mb-2">Go Home</h3>
            <p className="text-sm text-gray-500 mb-4">Return to the homepage</p>
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-blue-600 font-medium"
            >
              Home <ArrowLeft size={16} />
            </Link>
          </div>
          
          <div className="card p-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="text-green-600" size={24} />
            </div>
            <h3 className="font-semibold mb-2">Browse Items</h3>
            <p className="text-sm text-gray-500 mb-4">Find what you need</p>
            <Link 
              to="/browse" 
              className="inline-flex items-center gap-2 text-green-600 font-medium"
            >
              Browse <ArrowLeft size={16} />
            </Link>
          </div>
          
          <div className="card p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Package className="text-purple-600" size={24} />
            </div>
            <h3 className="font-semibold mb-2">List Item</h3>
            <p className="text-sm text-gray-500 mb-4">Sell or rent your items</p>
            <Link 
              to="/create-listing" 
              className="inline-flex items-center gap-2 text-purple-600 font-medium"
            >
              Create Listing <ArrowLeft size={16} />
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-4">Common Pages</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: 'Home', path: '/' },
                { label: 'Browse', path: '/browse' },
                { label: 'Categories', path: '/categories' },
                { label: 'How It Works', path: '/how-it-works' },
                { label: 'Sign Up', path: '/?auth=signup' },
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'Contact', path: '/contact' }
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200">
            <p className="text-gray-500 text-sm mb-4">
              Still can't find what you're looking for?
            </p>
            <Link 
              to="/contact" 
              className="btn-primary inline-flex items-center gap-2"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound
