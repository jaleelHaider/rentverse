import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, FileText, Loader2, MapPin, ShieldCheck, TriangleAlert } from 'lucide-react'
import { fetchMarketplaceListingById } from '@/api/endpoints/listing'
import { createMarketplaceOrder } from '@/api/endpoints/orders'
import type { Listing } from '@/types'
import OrderModeSelector, { type OrderMode } from '@/components/order/OrderModeSelector'
import PaymentMethodSelector, { type PaymentMethod } from '@/components/order/PaymentMethodSelector'
import EscrowInfoCard from '@/components/order/EscrowInfoCard'
import { useAuth } from '@/contexts/AuthContext'

const SERVICE_FEE_RATE = 0.02

type DurationUnit = 'day' | 'week' | 'month'

const Order: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()

  const [listing, setListing] = useState<Listing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedMode, setSelectedMode] = useState<OrderMode>('rent')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('escrow_card')
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('day')
  const [rentalDurationCount, setRentalDurationCount] = useState(1)
  const [orderQuantity, setOrderQuantity] = useState(1)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [city, setCity] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')

  const [acceptPlatformTerms, setAcceptPlatformTerms] = useState(false)
  const [acceptEscrowTerms, setAcceptEscrowTerms] = useState(false)
  const [acceptSellerTerms, setAcceptSellerTerms] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load listing.'
        setLoadError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadListing()
  }, [id])

  const availableModes = useMemo<OrderMode[]>(() => {
    if (!listing) {
      return ['rent']
    }

    if (listing.type === 'both') {
      const modes: OrderMode[] = []
      if ((listing.availability.availableForRent || 0) > 0) {
        modes.push('rent')
      }
      if ((listing.availability.availableForSale || 0) > 0) {
        modes.push('buy')
      }
      return modes.length > 0 ? modes : ['rent', 'buy']
    }

    if (listing.type === 'buy') {
      return ['buy']
    }

    return ['rent']
  }, [listing])

  const modeIsLocked = availableModes.length === 1

  useEffect(() => {
    if (!listing) {
      return
    }

    const requestedIntent = searchParams.get('intent')
    if (listing.type === 'both') {
      if ((requestedIntent === 'buy' || requestedIntent === 'rent') && availableModes.includes(requestedIntent)) {
        setSelectedMode(requestedIntent)
      } else if (availableModes.length === 1) {
        setSelectedMode(availableModes[0])
      } else {
        setSelectedMode('rent')
      }
      return
    }

    setSelectedMode(listing.type === 'buy' ? 'buy' : 'rent')
  }, [listing, searchParams, availableModes])

  const sellerTerms = listing?.sellerTerms || []
  const availableQuantity =
    selectedMode === 'buy'
      ? listing?.availability.availableForSale || 0
      : listing?.availability.availableForRent || 0

  useEffect(() => {
    if (availableQuantity <= 0) {
      setOrderQuantity(1)
      return
    }

    setOrderQuantity((prev) => Math.min(Math.max(1, prev), availableQuantity))
  }, [availableQuantity])

  const buyPrice = listing?.price.buy || 0
  const rentRateByUnit = useMemo(() => {
    if (!listing?.price.rent) {
      return 0
    }

    if (durationUnit === 'week') {
      return listing.price.rent.weekly
    }

    if (durationUnit === 'month') {
      return listing.price.rent.monthly
    }

    return listing.price.rent.daily
  }, [listing, durationUnit])

  const rentSubtotal = useMemo(() => {
    return selectedMode === 'rent' ? rentRateByUnit * rentalDurationCount : 0
  }, [selectedMode, rentRateByUnit, rentalDurationCount])

  const itemAmount = (selectedMode === 'buy' ? buyPrice : rentSubtotal) * orderQuantity
  const securityDeposit = selectedMode === 'rent' ? listing?.price.securityDeposit || 0 : 0
  const serviceFee = Math.round(itemAmount * SERVICE_FEE_RATE)
  const totalDueNow = itemAmount + securityDeposit + serviceFee

  const canSubmit =
    fullName.trim().length > 1 &&
    phone.trim().length > 5 &&
    deliveryAddress.trim().length > 6 &&
    city.trim().length > 1 &&
    orderQuantity > 0 &&
    orderQuantity <= availableQuantity &&
    paymentConfirmed &&
    acceptPlatformTerms &&
    acceptEscrowTerms &&
    (selectedMode !== 'rent' || sellerTerms.length === 0 || acceptSellerTerms)

  const handlePlaceOrder = async () => {
    setSubmitError(null)

    if (!canSubmit) {
      setSubmitError('Please complete all required details and accept terms before proceeding.')
      return
    }

    if (!listing) {
      setSubmitError('Listing is unavailable. Please reload and try again.')
      return
    }

    if (!currentUser) {
      setSubmitError('You must be logged in to continue.')
      return
    }

    setIsSubmitting(true)

    try {
      await createMarketplaceOrder({
        listingId: listing.id,
        buyerId: currentUser.id,
        mode: selectedMode,
        quantity: orderQuantity,
        durationUnit: selectedMode === 'rent' ? durationUnit : null,
        durationCount: selectedMode === 'rent' ? rentalDurationCount : null,
        unitPrice: selectedMode === 'buy' ? buyPrice : rentRateByUnit,
        itemAmount,
        securityDeposit,
        platformFee: serviceFee,
        totalDue: totalDueNow,
        paymentMethod,
        paymentConfirmed,
        fullName: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        deliveryAddress: deliveryAddress.trim(),
        specialInstructions: specialInstructions.trim(),
      })

      navigate('/my-bookings')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create order request.'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container-custom py-14">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
            <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
            Preparing secure checkout...
          </div>
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container-custom py-14">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Order page unavailable</h1>
            <p className="mb-5 text-gray-600">{loadError || 'This listing could not be loaded.'}</p>
            <Link to="/browse" className="btn-primary">Back to marketplace</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,_#d1fae5_0%,_#f8fafc_30%,_#f8fafc_100%)]">
      <div className="container-custom py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/browse" className="hover:text-primary-600">Browse</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to={`/listing/${listing.id}`} className="hover:text-primary-600">{listing.title}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-gray-900">Order</span>
        </div>

        <div className="mb-6 rounded-3xl border border-teal-100 bg-white/90 p-6 shadow-sm backdrop-blur">
          <h1 className="text-3xl font-bold text-gray-900">Secure Order Checkout</h1>
          <p className="mt-2 text-gray-600">
            Review listing details, choose booking or buying mode, and complete payment through protected escrow.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <OrderModeSelector
              availableModes={availableModes}
              selectedMode={selectedMode}
              onSelect={setSelectedMode}
              isLocked={modeIsLocked}
            />

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Listing Snapshot</h2>
              <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                <img
                  src={listing.images[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'}
                  alt={listing.title}
                  className="h-32 w-full rounded-xl object-cover"
                />
                <div>
                  <p className="text-lg font-semibold text-gray-900">{listing.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{listing.description}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" /> {listing.location.area}, {listing.location.city}
                  </p>
                </div>
              </div>
            </div>

            {selectedMode === 'rent' ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Booking Details</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Rental Unit</label>
                    <select
                      value={durationUnit}
                      onChange={(event) => setDurationUnit(event.target.value as DurationUnit)}
                      className="input-field"
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Duration Count</label>
                    <input
                      type="number"
                      min={1}
                      value={rentalDurationCount}
                      onChange={(event) => setRentalDurationCount(Math.max(1, Number.parseInt(event.target.value || '1', 10)))}
                      className="input-field"
                    />
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  Selected rate: PKR {rentRateByUnit.toLocaleString()} per {durationUnit}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Units</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">How many units do you want?</label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, availableQuantity)}
                    value={orderQuantity}
                    onChange={(event) => {
                      const nextQuantity = Math.max(1, Number.parseInt(event.target.value || '1', 10))
                      setOrderQuantity(nextQuantity)
                    }}
                    className="input-field"
                  />
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                  <p>Currently available: <span className="font-semibold">{availableQuantity}</span></p>
                  {orderQuantity > availableQuantity ? (
                    <p className="mt-2 text-red-600">Requested quantity exceeds available inventory.</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Contact and Delivery</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Full Name</label>
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Phone Number</label>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">City</label>
                  <input value={city} onChange={(event) => setCity(event.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Special Instructions</label>
                  <input
                    value={specialInstructions}
                    onChange={(event) => setSpecialInstructions(event.target.value)}
                    className="input-field"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">Delivery / Handover Address</label>
                <textarea
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  rows={3}
                  className="input-field"
                />
              </div>
            </div>

            <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Payment Verification</h2>
              <p className="mb-4 text-sm text-gray-600">
                This is a temporary manual step. Use the button below to confirm payment before placing the request.
              </p>
              <button
                type="button"
                onClick={() => setPaymentConfirmed((prev) => !prev)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  paymentConfirmed
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                }`}
              >
                Payment Confirmed
              </button>
            </div>

            {selectedMode === 'rent' && sellerTerms.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="mb-3 text-lg font-semibold text-amber-900">Owner Conditions</h2>
                <ul className="mb-4 space-y-2 text-sm text-amber-900">
                  {sellerTerms.map((term, index) => (
                    <li key={`${term}-${index}`} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-700" />
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
                <label className="inline-flex items-start gap-2 text-sm text-amber-900">
                  <input
                    type="checkbox"
                    checked={acceptSellerTerms}
                    onChange={(event) => setAcceptSellerTerms(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  I have read and accept all owner-defined conditions for this listing.
                </label>
              </div>
            ) : null}

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Required Confirmations</h2>
              <div className="space-y-3 text-sm text-gray-700">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={acceptPlatformTerms}
                    onChange={(event) => setAcceptPlatformTerms(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  I accept RentVerse terms and store policies, including cancellation and refund rules.
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={acceptEscrowTerms}
                    onChange={(event) => setAcceptEscrowTerms(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  I understand that payment is processed through escrow and released based on confirmation flow.
                </label>
              </div>
            </div>

            {submitError ? (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                {submitError}
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h2>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Mode</span>
                  <span className="font-medium capitalize">{selectedMode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Units</span>
                  <span className="font-medium">{orderQuantity}</span>
                </div>
                {selectedMode === 'rent' ? (
                  <div className="flex items-center justify-between">
                    <span>Duration</span>
                    <span className="font-medium">{rentalDurationCount} {durationUnit}(s)</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span>Item amount</span>
                  <span className="font-medium">PKR {itemAmount.toLocaleString()}</span>
                </div>
                {selectedMode === 'rent' ? (
                  <div className="flex items-center justify-between">
                    <span>Security deposit</span>
                    <span className="font-medium">PKR {securityDeposit.toLocaleString()}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span>Platform fee (2%)</span>
                  <span className="font-medium">PKR {serviceFee.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
                  <div className="flex items-center justify-between">
                    <span>Total due now</span>
                    <span>PKR {totalDueNow.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!canSubmit || isSubmitting}
                onClick={() => {
                  void handlePlaceOrder()
                }}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 py-3 font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Processing...' : selectedMode === 'buy' ? 'Buy Securely' : 'Book Securely'}
              </button>

              <p className="mt-3 text-xs text-gray-500">By continuing, you agree to secure transaction verification and policy enforcement.</p>
              {!paymentConfirmed ? (
                <p className="mt-2 text-xs text-amber-700">Payment must be confirmed before you can continue.</p>
              ) : null}
            </div>

            <EscrowInfoCard />

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-gray-900">
                <FileText className="h-4 w-4" />
                What Happens Next
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-teal-600" />
                  <span>Seller receives your request with payment proof.</span>
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-teal-600" />
                  <span>Handover is confirmed through in-app verification.</span>
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-teal-600" />
                  <span>Escrow releases funds only after successful completion.</span>
                </li>
              </ul>
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                <TriangleAlert className="mt-0.5 h-4 w-4" />
                Never transfer money outside RentVerse for this order.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Order
