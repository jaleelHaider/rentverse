import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock3, Search, XCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  approveMarketplaceOrder,
  fetchMarketplaceOrdersForUser,
  rejectMarketplaceOrder,
} from '@/api/endpoints/orders'
import type { MarketplaceOrder } from '@/types/order.types'

type BookingView = 'incoming' | 'outgoing'
type StatusFilter = 'all' | 'pending_seller_approval' | 'approved' | 'rejected' | 'cancelled'

const statusLabel: Record<MarketplaceOrder['status'], string> = {
  pending_seller_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

const statusClass: Record<MarketplaceOrder['status'], string> = {
  pending_seller_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
}

const formatDate = (iso: string) => new Date(iso).toLocaleString()

const MyBookings: React.FC = () => {
  const { currentUser } = useAuth()
  const [bookingView, setBookingView] = useState<BookingView>('incoming')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actioningOrderId, setActioningOrderId] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!currentUser) {
        setOrders([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorText(null)

      try {
        const data = await fetchMarketplaceOrdersForUser(currentUser.id)
        setOrders(data)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load booking requests.'
        setErrorText(message)
      } finally {
        setIsLoading(false)
      }
    }

    void run()
  }, [currentUser])

  const visibleOrders = useMemo(() => {
    if (!currentUser) {
      return []
    }

    return orders
      .filter((order) => {
        if (bookingView === 'incoming') {
          return order.sellerId === currentUser.id
        }
        return order.buyerId === currentUser.id
      })
      .filter((order) => {
        if (statusFilter === 'all') {
          return true
        }
        return order.status === statusFilter
      })
      .filter((order) => {
        const text = `${order.listingTitle} ${order.fullName} ${order.city}`.toLowerCase()
        return text.includes(searchQuery.trim().toLowerCase())
      })
  }, [bookingView, currentUser, orders, searchQuery, statusFilter])

  const pendingIncomingCount = useMemo(() => {
    if (!currentUser) {
      return 0
    }
    return orders.filter(
      (order) => order.sellerId === currentUser.id && order.status === 'pending_seller_approval'
    ).length
  }, [currentUser, orders])

  const approvedOutgoingCount = useMemo(() => {
    if (!currentUser) {
      return 0
    }
    return orders.filter((order) => order.buyerId === currentUser.id && order.status === 'approved').length
  }, [currentUser, orders])

  const handleApprove = async (order: MarketplaceOrder) => {
    if (!currentUser) {
      return
    }

    setActioningOrderId(order.id)
    setErrorText(null)

    try {
      const updated = await approveMarketplaceOrder(order.id, currentUser.id)
      setOrders((prev) => prev.map((item) => (item.id === order.id ? updated : item)))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve request.'
      setErrorText(message)
    } finally {
      setActioningOrderId(null)
    }
  }

  const handleReject = async (order: MarketplaceOrder) => {
    if (!currentUser) {
      return
    }

    setActioningOrderId(order.id)
    setErrorText(null)

    try {
      const updated = await rejectMarketplaceOrder(order.id, currentUser.id)
      setOrders((prev) => prev.map((item) => (item.id === order.id ? updated : item)))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject request.'
      setErrorText(message)
    } finally {
      setActioningOrderId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600">Track requests, approvals, and fulfillment progress in one place.</p>
        </div>
      </div>

      <div className="container-custom py-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-700">Pending on your listings</p>
            <p className="text-2xl font-bold text-amber-900">{pendingIncomingCount}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">Approved requests you placed</p>
            <p className="text-2xl font-bold text-green-900">{approvedOutgoingCount}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBookingView('incoming')}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                bookingView === 'incoming'
                  ? 'bg-primary-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Requests On My Listings
            </button>
            <button
              type="button"
              onClick={() => setBookingView('outgoing')}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                bookingView === 'outgoing'
                  ? 'bg-primary-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              My Requests
            </button>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="ml-auto rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending_seller_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="input-field pl-9"
              placeholder="Search by listing, customer name, or city"
            />
          </div>
        </div>

        {errorText ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorText}</div>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">Loading booking requests...</div>
        ) : null}

        {!isLoading && visibleOrders.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-lg font-semibold text-gray-900">No requests found</p>
            <p className="mt-2 text-sm text-gray-600">
              {bookingView === 'incoming'
                ? 'No buyer/renter requests for your listings match this filter.'
                : 'You have not placed any matching requests yet.'}
            </p>
            {bookingView === 'outgoing' ? (
              <Link to="/browse" className="btn-primary mt-4 inline-flex">Browse Listings</Link>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-4">
          {visibleOrders.map((order) => {
            const isIncoming = bookingView === 'incoming'
            const showSellerActions =
              isIncoming && order.status === 'pending_seller_approval' && currentUser?.id === order.sellerId

            return (
              <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                  <img
                    src={order.listingImageUrl}
                    alt={order.listingTitle}
                    className="h-28 w-full rounded-lg object-cover"
                  />

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link to={`/listing/${order.listingId}`} className="text-lg font-semibold text-gray-900 hover:text-primary-600">
                          {order.listingTitle}
                        </Link>
                        <p className="text-sm text-gray-600">
                          {order.mode === 'buy' ? 'Buy request' : 'Rental request'}  {order.quantity} unit(s)
                          {order.mode === 'rent' && order.durationCount && order.durationUnit
                            ? `  ${order.durationCount} ${order.durationUnit}(s)`
                            : ''}
                        </p>
                      </div>

                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[order.status]}`}>
                        {statusLabel[order.status]}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                      <p><span className="font-medium">Requested by:</span> {order.fullName}</p>
                      <p><span className="font-medium">City:</span> {order.city}</p>
                      <p><span className="font-medium">Contact:</span> {order.phone}</p>
                      <p><span className="font-medium">Payment:</span> {order.paymentConfirmed ? 'Confirmed' : 'Pending'}</p>
                    </div>

                    <div className="grid gap-2 rounded-lg bg-gray-50 p-3 text-sm md:grid-cols-3">
                      <p><span className="font-medium">Item:</span> PKR {order.itemAmount.toLocaleString()}</p>
                      <p><span className="font-medium">Deposit:</span> PKR {order.securityDeposit.toLocaleString()}</p>
                      <p><span className="font-medium">Total:</span> PKR {order.totalDue.toLocaleString()}</p>
                    </div>

                    <p className="text-xs text-gray-500">Created: {formatDate(order.createdAt)}</p>

                    {showSellerActions ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          disabled={actioningOrderId === order.id}
                          onClick={() => {
                            void handleApprove(order)
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actioningOrderId === order.id}
                          onClick={() => {
                            void handleReject(order)
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-xs text-gray-500">
                        <Clock3 className="h-4 w-4" />
                        {order.status === 'pending_seller_approval'
                          ? 'Waiting for seller decision.'
                          : `Last updated ${formatDate(order.updatedAt)}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MyBookings
