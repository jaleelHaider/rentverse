import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  MapPin, 
  Shield, 
  Star, 
  Heart, 
  Share2, 
  Flag, 
  ChevronRight,
  Clock,
  Eye,
  CheckCircle,
  MessageCircle,
  Phone,
  AlertCircle
} from 'lucide-react'
import ImageGallery from '@/components/listing/ImageGallery'
import RentalCalculator from '@/components/listing/RentalCalculator'
import SellerInfo from '@/components/listing/SellerInfo'
import Specifications from '@/components/listing/Specifications'
import SimilarListings from '@/components/listing/SimilarListings'
import { fetchMarketplaceListingById, fetchSellerDerivedStats } from '@/api/endpoints/listing'
import type { Listing } from '@/types'

const ListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [selectedTab, setSelectedTab] = useState('details')
  const [isSaved, setIsSaved] = useState(false)
  const [listing, setListing] = useState<Listing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sellerStats, setSellerStats] = useState({ activeListings: 0, memberSince: '0' })

  useEffect(() => {
    const loadListing = async () => {
      if (!id) {
        setLoadError('Invalid listing id.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setLoadError(null)

      try {
        const data = await fetchMarketplaceListingById(id)
        setListing(data)

        try {
          const stats = await fetchSellerDerivedStats(data.seller.id)
          setSellerStats(stats)
        } catch {
          setSellerStats({ activeListings: 0, memberSince: '0' })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load listing.'
        setLoadError(message)
        setListing(null)
        setSellerStats({ activeListings: 0, memberSince: '0' })
      } finally {
        setIsLoading(false)
      }
    }

    void loadListing()
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-custom py-12">
          <div className="card p-8 text-center text-gray-600">Loading listing details...</div>
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-custom py-12">
          <div className="card p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Listing not found</h1>
            <p className="text-gray-600 mb-6">{loadError || 'This listing is not available.'}</p>
            <Link to="/browse" className="btn-primary">Back to Browse</Link>
          </div>
        </div>
      </div>
    )
  }

  const sellerForDisplay = {
    name: listing.seller.name,
    rating: listing.seller.rating,
    totalReviews: 0,
    memberSince: sellerStats.memberSince,
    verified: listing.seller.verified,
    location: `${listing.location.area}, ${listing.location.city}`,
    responseRate: listing.seller.responseRate,
    responseTime: '0h',
    totalListings: sellerStats.activeListings,
    avatar: listing.seller.avatar,
  }

  const rentalListingForCalculator = {
    title: listing.title,
    price: {
      rent: {
        daily: listing.price.rent?.daily || 0,
        weekly: listing.price.rent?.weekly || 0,
        monthly: listing.price.rent?.monthly || 0,
      },
      securityDeposit: listing.price.securityDeposit || 0,
    },
  }
  
  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'specs', label: 'Specifications' },
    { id: 'reviews', label: 'Reviews (0)' },
    { id: 'shipping', label: 'Delivery & Returns' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-custom py-8">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-600 mb-6">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <ChevronRight size={16} />
          <Link to="/browse" className="hover:text-primary-600">Browse</Link>
          <ChevronRight size={16} />
          <Link to={`/browse?category=${listing.category}`} className="hover:text-primary-600">
            {listing.category}
          </Link>
          <ChevronRight size={16} />
          <span className="text-gray-900 font-medium">{listing.title}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Images */}
          <div className="lg:col-span-2">
            <ImageGallery images={listing.images} />
            
            {/* Listing Title & Stats */}
            <div className="card p-6 mt-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
                    {listing.seller.verified && (
                      <span className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        <Shield size={14} />
                        Verified
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-6 mb-6">
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-gray-400" />
                      <span className="text-gray-700">{listing.location.area}, {listing.location.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-gray-400" />
                      <span className="text-gray-700">Listed {listing.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye size={18} className="text-gray-400" />
                      <span className="text-gray-700">{listing.views} views</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsSaved(!isSaved)}
                    className={`p-3 rounded-lg ${isSaved ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
                  </button>
                  <button className="p-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
                    <Share2 size={20} />
                  </button>
                  <button className="p-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
                    <Flag size={20} />
                  </button>
                </div>
              </div>
              
              {/* Price Display */}
              <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    {listing.type === 'buy' || listing.type === 'both' ? (
                      <div className="mb-4">
                        <div className="text-sm text-gray-500 mb-1">Buy Now Price</div>
                        <div className="text-3xl font-bold text-gray-900">
                          ₹{listing.price.buy?.toLocaleString()}
                        </div>
                      </div>
                    ) : null}
                    
                    {listing.type === 'rent' || listing.type === 'both' ? (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Rental Rates</div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">
                              ₹{listing.price.rent?.daily}
                            </div>
                            <div className="text-sm text-blue-600">per day</div>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">
                              ₹{listing.price.rent?.weekly}
                            </div>
                            <div className="text-sm text-blue-600">per week</div>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">
                              ₹{listing.price.rent?.monthly}
                            </div>
                            <div className="text-sm text-blue-600">per month</div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Available Now</span>
                    </div>
                    <div className="text-sm text-gray-500">Security Deposit</div>
                    <div className="text-lg font-semibold text-gray-900">
                      ₹{listing.price.securityDeposit?.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="card mt-6">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedTab(tab.id)}
                      className={`py-4 px-6 font-medium text-sm border-b-2 ${
                        selectedTab === tab.id
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
              
              <div className="p-6">
                {selectedTab === 'details' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Description</h3>
                    <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
                    
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">Features</h3>
                      <ul className="grid grid-cols-2 gap-3">
                        {listing.features?.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle size={16} className="text-green-500" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {selectedTab === 'specs' && <Specifications listing={listing} />}
                {selectedTab === 'reviews' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-4xl font-bold">4.8</div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={20} className="text-yellow-400 fill-current" />
                          ))}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Based on 0 reviews</div>
                      </div>
                      <button className="btn-primary">Write a Review</button>
                    </div>
                    {/* Reviews would go here */}
                  </div>
                )}
              </div>
            </div>
            
            {/* Similar Listings */}
            <SimilarListings currentListingId={listing.id} />
          </div>

          {/* Right Column - Action Panel */}
          <div className="space-y-6">
            {/* Seller Info */}
            <SellerInfo seller={sellerForDisplay} />
            
            {/* Rental Calculator */}
            {listing.type === 'rent' || listing.type === 'both' ? (
              <RentalCalculator listing={rentalListingForCalculator} />
            ) : null}
            
            {/* Action Buttons */}
            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-lg">Ready to proceed?</h3>
              
              {listing.type === 'buy' || listing.type === 'both' ? (
                <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-shadow">
                  Buy Now - ₹{listing.price.buy?.toLocaleString()}
                </button>
              ) : null}
              
              {listing.type === 'rent' || listing.type === 'both' ? (
                <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-shadow">
                  Rent This Item
                </button>
              ) : null}
              
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <MessageCircle size={20} />
                  Chat
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Phone size={20} />
                  Call
                </button>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <Shield size={20} className="text-primary-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Protected by RentVerse Escrow</p>
                    <p className="mt-1">Your payment is held securely until you confirm item delivery</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Safety Tips */}
            <div className="card p-6 bg-yellow-50 border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-2">Safety Tips</h4>
                  <ul className="space-y-2 text-sm text-yellow-700">
                    <li>• Meet in safe, public locations</li>
                    <li>• Inspect items thoroughly before paying</li>
                    <li>• Never share personal banking details</li>
                    <li>• Use RentVerse escrow for large transactions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ListingDetail