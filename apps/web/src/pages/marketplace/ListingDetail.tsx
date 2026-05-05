import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  MapPin, 
  Shield, 
  Star, 
  Heart, 
  Share2, 
  ChevronRight,
  Clock,
  Eye,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import ImageGallery from '@/components/listing/ImageGallery'
import RentalCalculator from '@/components/listing/RentalCalculator'
import SellerInfo from '@/components/listing/SellerInfo'
import Specifications from '@/components/listing/Specifications'
import SimilarListings from '@/components/listing/SimilarListings'
import {
  fetchMarketplaceListingById,
  fetchSavedListingStatus,
  fetchSellerDerivedStats,
  saveListing,
  unsaveListing,
} from '@/api/endpoints/listing'
import {
  CONDITION_DESCRIPTIONS,
  CONDITION_ISSUES_OPTIONS,
} from '@/utils/conditionDescriptions'
import {
  createMarketplaceReview,
  fetchEligibleReviewOrders,
  fetchUserProfileReviews,
  fetchUserProfileSummary,
} from '@/api/endpoints/profiles'
import { submitListingReport, submitUserReport } from '@/api/endpoints/reports'
import type { Listing } from '@rentverse/shared'
import { useChatNavigation } from '@/hooks/useChatNavigation'
import { useAuth } from '@/contexts/AuthContext'
import ReportModal from '@/components/ui/ReportModal'

const ListingDetail: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [selectedTab, setSelectedTab] = useState('details')
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [listing, setListing] = useState<Listing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sellerStats, setSellerStats] = useState({ activeListings: 0, memberSince: '0' })
  const [sellerSummary, setSellerSummary] = useState<Awaited<ReturnType<typeof fetchUserProfileSummary>> | null>(null)
  const [sellerReviews, setSellerReviews] = useState<Awaited<ReturnType<typeof fetchUserProfileReviews>>['reviews']>([])
  const [eligibleOrderIds, setEligibleOrderIds] = useState<string[]>([])
  const [reviewOrderId, setReviewOrderId] = useState('')
  const [reviewRating, setReviewRating] = useState<1 | 2 | 3 | 4 | 5>(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [isConditionInfoHovered, setIsConditionInfoHovered] = useState(false)
  const [isConditionInfoPinned, setIsConditionInfoPinned] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportSuccess, setReportSuccess] = useState('')
  const [sellerReportOpen, setSellerReportOpen] = useState(false)
  const [sellerReportSubmitting, setSellerReportSubmitting] = useState(false)
  const [sellerReportError, setSellerReportError] = useState('')
  const [sellerReportSuccess, setSellerReportSuccess] = useState('')
  const { openListingChat, isStartingChat } = useChatNavigation()
  const isOwnListing = Boolean(listing && currentUser && listing.seller.id === currentUser.id)

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
          const [stats, summaryPayload, reviewsPayload] = await Promise.all([
            fetchSellerDerivedStats(data.seller.id),
            fetchUserProfileSummary(data.seller.id),
            fetchUserProfileReviews(data.seller.id, {
              page: 1,
              limit: 8,
              sort: 'newest',
              transactionType: 'all',
              targetRole: 'seller',
            }),
          ])
          setSellerStats(stats)
          setSellerSummary(summaryPayload)
          setSellerReviews(reviewsPayload.reviews || [])

          if (currentUser && currentUser.id !== data.seller.id) {
            try {
              const eligible = await fetchEligibleReviewOrders(data.seller.id, data.id)
              setEligibleOrderIds(eligible.eligibleOrderIds || [])
              setReviewOrderId(eligible.eligibleOrderIds?.[0] || '')
            } catch {
              setEligibleOrderIds([])
              setReviewOrderId('')
            }
          } else {
            setEligibleOrderIds([])
            setReviewOrderId('')
          }
        } catch {
          setSellerStats({ activeListings: 0, memberSince: '0' })
          setSellerSummary(null)
          setSellerReviews([])
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load listing.'
        setLoadError(message)
        setListing(null)
        setSellerStats({ activeListings: 0, memberSince: '0' })
        setSellerSummary(null)
        setSellerReviews([])
      } finally {
        setIsLoading(false)
      }
    }

    void loadListing()
  }, [id, currentUser])

  useEffect(() => {
    const loadSavedStatus = async () => {
      if (!id || !currentUser) {
        setIsSaved(false)
        return
      }

      try {
        const status = await fetchSavedListingStatus(id)
        setIsSaved(Boolean(status.isSaved))
      } catch {
        setIsSaved(false)
      }
    }

    void loadSavedStatus()
  }, [id, currentUser])

  const handleSaveToggle = async () => {
    if (!listing) {
      return
    }

    if (!currentUser) {
      navigate('/?auth=login')
      return
    }

    if (isOwnListing || isSaving) {
      return
    }

    const previousValue = isSaved
    setIsSaved(!previousValue)
    setIsSaving(true)

    try {
      if (previousValue) {
        await unsaveListing(listing.id)
      } else {
        await saveListing(listing.id)
      }
    } catch {
      setIsSaved(previousValue)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReviewSubmit = async () => {
    if (!listing || !reviewOrderId) {
      setReviewError('Select a valid transaction order before submitting review.')
      return
    }

    setReviewError(null)
    setReviewSuccess(null)
    setIsSubmittingReview(true)

    try {
      await createMarketplaceReview({
        orderId: reviewOrderId,
        revieweeId: listing.seller.id,
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim() || undefined,
      })

      const refreshedReviews = await fetchUserProfileReviews(listing.seller.id, {
        page: 1,
        limit: 8,
        sort: 'newest',
        transactionType: 'all',
        targetRole: 'seller',
      })
      setSellerReviews(refreshedReviews.reviews || [])

      const summaryPayload = await fetchUserProfileSummary(listing.seller.id)
      setSellerSummary(summaryPayload)

      const eligible = await fetchEligibleReviewOrders(listing.seller.id, listing.id)
      setEligibleOrderIds(eligible.eligibleOrderIds || [])
      setReviewOrderId(eligible.eligibleOrderIds?.[0] || '')

      setReviewTitle('')
      setReviewComment('')
      setReviewSuccess('Review submitted successfully.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit review.'
      setReviewError(message)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const handleSubmitListingReport = async (input: { reasonCode: string; description: string }) => {
    if (!listing) return
    if (!currentUser) {
      navigate('/?auth=login')
      return
    }

    setReportSubmitting(true)
    setReportError('')
    setReportSuccess('')
    try {
      await submitListingReport({
        listingId: listing.id,
        reasonCode: input.reasonCode,
        description: input.description || undefined,
      })
      setReportSuccess('Report submitted successfully. Our moderation team will review it.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit listing report.'
      setReportError(message)
    } finally {
      setReportSubmitting(false)
    }
  }

  const handleSubmitSellerReport = async (input: { reasonCode: string; description: string }) => {
    if (!listing) return
    if (!currentUser) {
      navigate('/?auth=login')
      return
    }

    setSellerReportSubmitting(true)
    setSellerReportError('')
    setSellerReportSuccess('')
    try {
      await submitUserReport({
        userId: listing.seller.id,
        reasonCode: input.reasonCode,
        description: input.description || undefined,
      })
      setSellerReportSuccess('Seller report submitted successfully. Our moderation team will review it.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit seller report.'
      setSellerReportError(message)
    } finally {
      setSellerReportSubmitting(false)
    }
  }

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
    rating: sellerSummary?.stats.avgRating ?? listing.seller.rating,
    totalReviews: sellerSummary?.stats.totalReviews ?? listing.seller.totalReviews ?? 0,
    memberSince: sellerStats.memberSince,
    verified: listing.seller.verified,
    location: `${listing.location.area}, ${listing.location.city}`,
    responseRate: listing.seller.responseRate,
    responseTime: '0h',
    totalListings: sellerStats.activeListings,
    soldCount: sellerSummary?.stats.sellerSoldCount ?? 0,
    rentedCount: sellerSummary?.stats.sellerRentedCount ?? 0,
    profileUrl: `/user/${listing.seller.id}`,
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

  const normalizedConditionValue = String(listing.condition || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const conditionAliases: Record<string, keyof typeof CONDITION_DESCRIPTIONS> = {
    new: 'new',
    brand_new: 'new',
    like_new: 'like_new',
    likenew: 'like_new',
    excellent: 'new',
    good: 'good',
    fair: 'fair',
    poor: 'poor',
    needs_work: 'poor',
    needswork: 'poor',
  }
  const resolvedConditionKey = conditionAliases[normalizedConditionValue] || 'good'
  const conditionInfo = CONDITION_DESCRIPTIONS[resolvedConditionKey]
  const conditionIssues = (listing.specifications.__condition_issues || '')
    .split('\n')
    .map((issueId) => issueId.trim())
    .filter((issueId) => issueId.length > 0)
  const conditionIssueLabels = conditionIssues
    .map((issueId) => CONDITION_ISSUES_OPTIONS.find((issue) => issue.id === issueId)?.label || issueId)
  const conditionNote = (listing.specifications.__condition_note || '').trim()
  const showConditionInfo = isConditionInfoHovered || isConditionInfoPinned
  
  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'specs', label: 'Specifications' },
    { id: 'reviews', label: `Reviews (${sellerSummary?.stats.totalReviews ?? listing.seller.totalReviews ?? 0})` },
    { id: 'shipping', label: 'Delivery & Returns' },
  ]

  const rentAvailable = listing.availability.availableForRent
  const saleAvailable = listing.availability.availableForSale
  const hasStockForRent = listing.type !== 'buy' ? rentAvailable > 0 : true
  const hasStockForSale = listing.type !== 'rent' ? saleAvailable > 0 : true
  const isCurrentlyAvailable = hasStockForRent || hasStockForSale

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

                  <div className="space-y-2 pt-4">
                    <div className="relative inline-flex max-w-full items-center gap-2 text-sm text-gray-700">
                      <span className="font-medium text-gray-900">Condition:</span>
                      <span className="font-semibold text-gray-900">{conditionInfo?.name || listing.condition}</span>
                      <button
                        type="button"
                        onMouseEnter={() => setIsConditionInfoHovered(true)}
                        onMouseLeave={() => setIsConditionInfoHovered(false)}
                        onClick={() => setIsConditionInfoPinned((prev) => !prev)}
                        aria-label="Condition help"
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-black bg-white text-sm font-black text-black leading-none shadow-sm transition hover:bg-gray-50"
                      >
                        ?
                      </button>

                      {showConditionInfo ? (
                        <div className="absolute left-full top-1/2 z-20 ml-3 w-80 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
                          <p className="text-sm leading-6 text-gray-700">
                            {conditionInfo.fullDescription}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {conditionIssueLabels.length > 0 ? (
                      <div className="text-sm text-gray-700">
                        <span className="font-medium text-gray-900">Specific Issues:</span>{' '}
                        <span className="font-semibold text-gray-900">{conditionIssueLabels.join(', ')}</span>
                      </div>
                    ) : null}

                    {conditionNote ? (
                      <div className="text-sm text-gray-700">
                        <span className="font-medium text-gray-900">Note:</span>{' '}
                        <span className="font-semibold text-gray-900">{conditionNote}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    type="button"
                    disabled={isOwnListing || isSaving}
                    onClick={handleSaveToggle}
                    className={`p-3 rounded-lg ${isSaved ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
                  </button>
                  <button className="p-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
                    <Share2 size={20} />
                  </button>
                  <button
                    type="button"
                    disabled={isOwnListing}
                    onClick={() => {
                      if (!currentUser) {
                        navigate('/?auth=login')
                        return
                      }
                      setReportError('')
                      setReportSuccess('')
                      setReportOpen(true)
                    }}
                    className="p-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Report
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
                          PKR {listing.price.buy?.toLocaleString()}
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            disabled={!hasStockForSale}
                            onClick={() => navigate(`/order/${listing.id}?intent=buy`)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-base hover:shadow-lg transition-shadow disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Buy Now
                          </button>
                          {listing.type === 'both' ? (
                            <button
                              type="button"
                              disabled={!hasStockForRent}
                              onClick={() => navigate(`/order/${listing.id}?intent=rent`)}
                              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-bold text-base hover:shadow-lg transition-shadow disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Rent Now
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-4 flex items-start gap-3 text-sm text-gray-600">
                          <Shield size={20} className="text-primary-600 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">Protected by RentVerse Escrow</p>
                            <p className="mt-1">Your payment is held securely until you confirm item delivery</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    
                    {listing.type === 'rent' || listing.type === 'both' ? (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Rental Rates</div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">
                              PKR {listing.price.rent?.daily?.toLocaleString()}
                            </div>
                            <div className="text-sm text-blue-600">per day</div>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">
                              PKR {listing.price.rent?.weekly?.toLocaleString()}
                            </div>
                            <div className="text-sm text-blue-600">per week</div>
                            {(() => {
                              const daily = Number.parseFloat(String(listing.price.rent?.daily || 0));
                              const weekly = Number.parseFloat(String(listing.price.rent?.weekly || 0));
                              if (daily > 0 && weekly > 0) {
                                const expectedWeekly = daily * 7;
                                const discountPercent = Math.round(((expectedWeekly - weekly) / expectedWeekly) * 100);
                                if (discountPercent > 0) {
                                  return (
                                    <div className="text-xs text-green-700 font-semibold mt-1">
                                      Save {discountPercent}%
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">
                              PKR {listing.price.rent?.monthly?.toLocaleString()}
                            </div>
                            <div className="text-sm text-blue-600">per month</div>
                            {(() => {
                              const daily = Number.parseFloat(String(listing.price.rent?.daily || 0));
                              const monthly = Number.parseFloat(String(listing.price.rent?.monthly || 0));
                              if (daily > 0 && monthly > 0) {
                                const expectedMonthly = daily * 30;
                                const discountPercent = Math.round(((expectedMonthly - monthly) / expectedMonthly) * 100);
                                if (discountPercent > 0) {
                                  return (
                                    <div className="text-xs text-green-700 font-semibold mt-1">
                                      Save {discountPercent}%
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                        {listing.type === 'rent' ? (
                          <button
                            type="button"
                            disabled={!hasStockForRent}
                            onClick={() => navigate(`/order/${listing.id}?intent=rent`)}
                            className="mt-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-bold text-base hover:shadow-lg transition-shadow disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Rent Now
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-2">
                      <div className={`w-3 h-3 rounded-full ${isCurrentlyAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm text-gray-600">{isCurrentlyAvailable ? 'Available Now' : 'Out of Stock'}</span>
                    </div>
                    {(listing.type === 'rent' || listing.type === 'both') && (
                      <div className="text-sm text-gray-600">Rent available: {rentAvailable}</div>
                    )}
                    {(listing.type === 'buy' || listing.type === 'both') && (
                      <div className="text-sm text-gray-600">Sale available: {saleAvailable}</div>
                    )}
                    <div className="text-sm text-gray-500">Security Deposit</div>
                    <div className="text-lg font-semibold text-gray-900">
                      PKR {listing.price.securityDeposit?.toLocaleString()}
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
                        <div className="text-4xl font-bold">{(sellerSummary?.stats.avgRating ?? listing.seller.rating ?? 0).toFixed(1)}</div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={20}
                              className={
                                i < Math.round(sellerSummary?.stats.avgRating ?? listing.seller.rating ?? 0)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }
                            />
                          ))}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Based on {sellerSummary?.stats.totalReviews ?? listing.seller.totalReviews ?? 0} reviews
                        </div>
                      </div>
                      <Link className="btn-primary" to={`/user/${listing.seller.id}`}>
                        View all reviews
                      </Link>
                    </div>

                    {currentUser && !isOwnListing && (
                      <div className="mb-6 rounded-xl border border-gray-200 p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Write a review</h4>

                        {eligibleOrderIds.length === 0 ? (
                          <p className="text-sm text-gray-600">
                            You can submit a review after an approved transaction with this seller.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                              <select
                                value={reviewOrderId}
                                onChange={(event) => setReviewOrderId(event.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                              >
                                {eligibleOrderIds.map((orderId) => (
                                  <option key={orderId} value={orderId}>{orderId}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                              <select
                                value={reviewRating}
                                onChange={(event) => setReviewRating(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                              >
                                <option value={5}>5 stars</option>
                                <option value={4}>4 stars</option>
                                <option value={3}>3 stars</option>
                                <option value={2}>2 stars</option>
                                <option value={1}>1 star</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                              <input
                                value={reviewTitle}
                                onChange={(event) => setReviewTitle(event.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                placeholder="Short summary"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                              <textarea
                                value={reviewComment}
                                onChange={(event) => setReviewComment(event.target.value)}
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                placeholder="Share your experience"
                              />
                            </div>
                            {reviewError ? <p className="text-sm text-red-600">{reviewError}</p> : null}
                            {reviewSuccess ? <p className="text-sm text-green-600">{reviewSuccess}</p> : null}
                            <button
                              type="button"
                              onClick={() => {
                                void handleReviewSubmit()
                              }}
                              disabled={isSubmittingReview}
                              className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-4">
                      {sellerReviews.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
                          No reviews available yet.
                        </div>
                      ) : (
                        sellerReviews.map((review) => (
                          <article key={review.id} className="rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, index) => (
                                    <Star
                                      key={index}
                                      size={16}
                                      className={index < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                                    />
                                  ))}
                                </div>
                                <h4 className="mt-1 font-semibold text-gray-900">{review.title || 'Review'}</h4>
                              </div>
                              <div className="text-xs text-gray-500 text-right">
                                <div>{new Date(review.createdAt).toLocaleDateString()}</div>
                                <div className="capitalize">{review.transactionType}</div>
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-700">{review.comment || 'No written feedback.'}</p>
                            <p className="mt-2 text-xs text-gray-500">By {review.reviewerName} on {review.listingTitle}</p>
                          </article>
                        ))
                      )}
                    </div>
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
            <SellerInfo
              seller={sellerForDisplay}
              onMessageSeller={() => {
                void openListingChat({ listingId: listing.id, sellerId: listing.seller.id })
              }}
              onReportSeller={() => {
                if (!currentUser) {
                  navigate('/?auth=login')
                  return
                }
                if (isOwnListing) {
                  return
                }
                setSellerReportError('')
                setSellerReportSuccess('')
                setSellerReportOpen(true)
              }}
              isMessageLoading={isStartingChat}
              disableMessageButton={isOwnListing}
            />
            {/* Rental Calculator */}
            {listing.type === 'rent' || listing.type === 'both' ? (
              <RentalCalculator listing={rentalListingForCalculator} />
            ) : null}
            
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

      <ReportModal
        open={reportOpen}
        targetType="listing"
        targetLabel={listing.title}
        isSubmitting={reportSubmitting}
        error={reportError}
        success={reportSuccess}
        onClose={() => {
          setReportOpen(false)
          setReportError('')
          setReportSuccess('')
        }}
        onSubmit={handleSubmitListingReport}
      />

      <ReportModal
        open={sellerReportOpen}
        targetType="user"
        targetLabel={listing.seller.name}
        isSubmitting={sellerReportSubmitting}
        error={sellerReportError}
        success={sellerReportSuccess}
        onClose={() => {
          setSellerReportOpen(false)
          setSellerReportError('')
          setSellerReportSuccess('')
        }}
        onSubmit={handleSubmitSellerReport}
      />
    </div>
  )
}

export default ListingDetail
