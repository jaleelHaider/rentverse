import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Shield, 
  TrendingUp, 
  Clock, 
  ArrowRight,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import CategoryGrid from '@/components/home/CategoryGrid'
import FeaturedListings from '@/components/home/FeaturedListings'
import RecommendedForYou from '@/components/home/RecommendedForYou'
import HowItWorks from '@/components/home/HowItWorks'
import Testimonials from '@/components/home/Testimonials'
import StatsSection from '@/components/home/StatsSection'

const Home: React.FC = () => {

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-purple-50 pt-20 pb-10 px-4">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container-custom relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-100 to-purple-100 px-4 py-2 rounded-full mb-6">
              <Sparkles size={16} className="text-primary-600" />
              <span className="text-sm font-medium text-primary-700">Pakistan's #1 Rental Marketplace</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Rent, Buy & Sell
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">
                Anything in Pakistan Right Now
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              From electronics to furniture, vehicles to equipment. Rent what you need, 
              sell what you don't. All secured with AI-powered protection.
            </p>

            {/* Hero Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">50K+</div>
                <div className="text-gray-600">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">200K+</div>
                <div className="text-gray-600">Listings</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">98%</div>
                <div className="text-gray-600">Satisfaction Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">PKR 10Cr+</div>
                <div className="text-gray-600">Transactions</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended For You */}
      <RecommendedForYou />

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <h2 className="section-title text-center">Why Choose RentVerse?</h2>
          <p className="section-subtitle text-center max-w-2xl mx-auto">
            We're revolutionizing how Pakistan buys, sells, and rents items
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="card p-8 text-center hover:transform hover:-translate-y-2 transition-transform">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="text-blue-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-4">Escrow Protection</h3>
              <p className="text-gray-600">
                Payments held securely until you confirm item delivery. 
                Full refund if not as described.
              </p>
            </div>
            
            <div className="card p-8 text-center hover:transform hover:-translate-y-2 transition-transform">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-4">Earn from Idle Items</h3>
              <p className="text-gray-600">
                Turn unused items into income. Rent out your camera, 
                tools, or party equipment easily.
              </p>
            </div>
            
            <div className="card p-8 text-center hover:transform hover:-translate-y-2 transition-transform">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Clock className="text-purple-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-4">Short-term Rentals</h3>
              <p className="text-gray-600">
                Need something for a day, week, or month? Rent instead of 
                buying. Save money, reduce waste.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="section-title">Browse by Category</h2>
              <p className="section-subtitle">Find exactly what you're looking for</p>
            </div>
            <Link 
              to="/categories" 
              className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-2"
            >
              View all categories <ChevronRight size={20} />
            </Link>
          </div>
          <CategoryGrid />
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="section-title">Featured Listings</h2>
              <p className="section-subtitle">Popular items for rent and sale</p>
            </div>
            <Link 
              to="/browse" 
              className="btn-primary flex items-center gap-2"
            >
              Browse All <ArrowRight size={20} />
            </Link>
          </div>
          <FeaturedListings />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gradient-to-br from-primary-50 to-purple-50">
        <HowItWorks />
      </section>

      {/* Stats */}
      <StatsSection />

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <Testimonials />
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-purple-600">
        <div className="container-custom text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Earning or Saving?
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Join thousands of Pakistanis who are making money from idle items 
            and saving by renting what they need.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/register" 
              className="bg-white text-primary-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              Join Free Now
            </Link>
            <Link 
              to="/how-it-works" 
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              See How It Works
            </Link>
          </div>
          <p className="text-primary-200 mt-8">
            No credit card required • List your first item in 2 minutes
          </p>
        </div>
      </section>
    </div>
  )
}

export default Home
