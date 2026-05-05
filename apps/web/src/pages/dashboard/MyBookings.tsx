import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock3, MessageSquare, Search, XCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  approveMarketplaceOrder,
  cancelMarketplaceOrder,
  createOrderDispute,
  fetchOrderDisputeDetail,
  fetchOrderDisputes,
  fetchMarketplaceOrdersForUser,
  postOrderDisputeMessage,
  rejectMarketplaceOrder,
  requestHandoverOtp,
  uploadOrderDisputeEvidence,
  requestReturnOtp,
  verifyHandoverOtp,
  verifyReturnOtp,
} from '@/api/endpoints/orders'
import type {
  MarketplaceDisputeEvidenceItem,
  MarketplaceDisputeReasonCode,
  MarketplaceOrder,
  MarketplaceOrderDispute,
  MarketplaceOrderDisputeDetailResponse,
} from '@rentverse/shared'

type BookingView = 'incoming' | 'outgoing'
type StatusFilter =
  | 'all'
  | 'pending_seller_approval'
  | 'approved'
  | 'handover_otp_pending'
  | 'in_use'
  | 'return_otp_pending'
  | 'completed'
  | 'rejected'
  | 'cancelled'

const statusLabel: Record<MarketplaceOrder['status'], string> = {
  pending_seller_approval: 'Pending Approval',
  approved: 'Approved',
  handover_otp_pending: 'Handover OTP Pending',
  in_use: 'In Use',
  return_otp_pending: 'Return OTP Pending',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

const statusClass: Record<MarketplaceOrder['status'], string> = {
  pending_seller_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  handover_otp_pending: 'bg-blue-100 text-blue-800',
  in_use: 'bg-cyan-100 text-cyan-800',
  return_otp_pending: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
}

const formatDate = (iso: string) => new Date(iso).toLocaleString()

const disputeStatusLabel: Record<Exclude<MarketplaceOrder['disputeStatus'], 'none'>, string> = {
  open: 'Open',
  under_review: 'Under Review',
  awaiting_parties: 'Awaiting Parties',
  resolved: 'Resolved',
  closed: 'Closed',
}

const disputeReasonLabel: Record<MarketplaceDisputeReasonCode, string> = {
  item_not_received: 'Item Not Received',
  item_not_as_described: 'Item Not As Described',
  damaged_item: 'Damaged Item',
  late_delivery_or_return: 'Late Delivery / Return',
  payment_or_refund_issue: 'Payment / Refund Issue',
  fraud_or_safety_concern: 'Fraud / Safety Concern',
  other: 'Other',
}

const ACTIVE_DISPUTE_STATUSES = ['open', 'under_review', 'awaiting_parties']

type SectionName = 'dispute-form' | 'dispute-thread' | 'order-actions' | 'otp'
type SectionFeedback = { error?: string; success?: string }

const buildSectionKey = (orderId: string, section: SectionName) => `${orderId}:${section}`

const fileToBase64 = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

const MyBookings: React.FC = () => {
  const { currentUser } = useAuth()
  const [bookingView, setBookingView] = useState<BookingView>('incoming')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actioningOrderId, setActioningOrderId] = useState<string | null>(null)
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({})
  const [generatedOtps, setGeneratedOtps] = useState<
    Record<string, { otp: string; expiresAt: string; stage: 'handover' | 'return' }>
  >({})
  const [errorText, setErrorText] = useState<string | null>(null)
  const [successText, setSuccessText] = useState<string | null>(null)
  const [disputesByOrder, setDisputesByOrder] = useState<Record<string, MarketplaceOrderDispute[]>>({})
  const [disputeDetailById, setDisputeDetailById] = useState<Record<string, MarketplaceOrderDisputeDetailResponse>>({})
  const [openDisputePanelByOrder, setOpenDisputePanelByOrder] = useState<Record<string, boolean>>({})
  const [selectedDisputeByOrder, setSelectedDisputeByOrder] = useState<Record<string, string>>({})
  const [disputeDraftByOrder, setDisputeDraftByOrder] = useState<
    Record<
      string,
      {
        title: string
        description: string
        reasonCode: MarketplaceDisputeReasonCode
        requestedResolution: string
      }
    >
  >({})
  const [replyDraftByDispute, setReplyDraftByDispute] = useState<Record<string, string>>({})
  const [draftEvidenceFilesByOrder, setDraftEvidenceFilesByOrder] = useState<Record<string, File[]>>({})
  const [replyEvidenceFilesByDispute, setReplyEvidenceFilesByDispute] = useState<Record<string, File[]>>({})
  const [sectionFeedbackByKey, setSectionFeedbackByKey] = useState<Record<string, SectionFeedback>>({})

  const renderEvidence = (items: MarketplaceDisputeEvidenceItem[]) => {
    if (!items.length) {
      return null
    }

    return (
      <div className="mt-2 space-y-1 rounded border border-orange-200 bg-orange-50 p-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-800">Evidence</p>
        {items.map((item, index) => {
          const href = item.signedUrl || item.url
          const label = item.name || item.note || `Attachment ${index + 1}`
          return href ? (
            <a
              key={`${href}-${index}`}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="block text-xs font-medium text-orange-700 underline hover:text-orange-900"
            >
              {label}
            </a>
          ) : (
            <p key={`${label}-${index}`} className="text-xs text-orange-700">
              {label}
            </p>
          )
        })}
      </div>
    )
  }

  useEffect(() => {
    const run = async () => {
      if (!currentUser) {
        setOrders([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorText(null)
      setSuccessText(null)

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

  const updateOrderInState = (updated: MarketplaceOrder) => {
    setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  const setActionStart = (orderId: string) => {
    setActioningOrderId(orderId)
  }

  const setActionEnd = () => {
    setActioningOrderId(null)
  }

  const clearSectionFeedback = (orderId: string, section: SectionName) => {
    const key = buildSectionKey(orderId, section)
    setSectionFeedbackByKey((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const setSectionError = (orderId: string, section: SectionName, message: string) => {
    const key = buildSectionKey(orderId, section)
    setSectionFeedbackByKey((prev) => ({
      ...prev,
      [key]: { error: message },
    }))
  }

  const setSectionSuccess = (orderId: string, section: SectionName, message: string) => {
    const key = buildSectionKey(orderId, section)
    setSectionFeedbackByKey((prev) => ({
      ...prev,
      [key]: { success: message },
    }))
  }

  const handleApprove = async (order: MarketplaceOrder) => {
    if (!currentUser) {
      return
    }

    setActionStart(order.id)
    clearSectionFeedback(order.id, 'order-actions')

    try {
      const updated = await approveMarketplaceOrder(order.id, currentUser.id)
      updateOrderInState(updated)
      setSectionSuccess(order.id, 'order-actions', 'Order approved successfully.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve request.'
      setSectionError(order.id, 'order-actions', message)
    } finally {
      setActionEnd()
    }
  }

  const handleReject = async (order: MarketplaceOrder) => {
    if (!currentUser) {
      return
    }

    setActionStart(order.id)
    clearSectionFeedback(order.id, 'order-actions')

    try {
      const updated = await rejectMarketplaceOrder(order.id, currentUser.id)
      updateOrderInState(updated)
      setSectionSuccess(order.id, 'order-actions', 'Order rejected successfully.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject request.'
      setSectionError(order.id, 'order-actions', message)
    } finally {
      setActionEnd()
    }
  }

  const handleCancel = async (order: MarketplaceOrder) => {
    setActionStart(order.id)
    clearSectionFeedback(order.id, 'order-actions')

    try {
      const updated = await cancelMarketplaceOrder(order.id)
      updateOrderInState(updated)
      setSectionSuccess(order.id, 'order-actions', 'Order cancelled.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel order.'
      setSectionError(order.id, 'order-actions', message)
    } finally {
      setActionEnd()
    }
  }

  const handleRequestHandoverOtp = async (order: MarketplaceOrder) => {
    setActionStart(order.id)
    clearSectionFeedback(order.id, 'otp')

    try {
      const response = await requestHandoverOtp(order.id)
      updateOrderInState(response.order)
      setGeneratedOtps((prev) => ({
        ...prev,
        [order.id]: {
          otp: response.otp,
          expiresAt: response.expiresAt,
          stage: 'handover',
        },
      }))
      setSectionSuccess(order.id, 'otp', 'Handover OTP generated. Share it with the counterpart for verification.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate handover OTP.'
      setSectionError(order.id, 'otp', message)
    } finally {
      setActionEnd()
    }
  }

  const handleVerifyHandoverOtp = async (order: MarketplaceOrder) => {
    const otp = (otpInputs[order.id] || '').trim()
    clearSectionFeedback(order.id, 'otp')

    if (!/^\d{6}$/.test(otp)) {
      setSectionError(order.id, 'otp', 'Please enter a valid 6-digit OTP.')
      return
    }

    setActionStart(order.id)

    try {
      const updated = await verifyHandoverOtp(order.id, otp)
      updateOrderInState(updated)
      setOtpInputs((prev) => ({ ...prev, [order.id]: '' }))
      setGeneratedOtps((prev) => {
        const next = { ...prev }
        delete next[order.id]
        return next
      })
      setSectionSuccess(order.id, 'otp', 'Handover OTP verified successfully.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify handover OTP.'
      setSectionError(order.id, 'otp', message)
    } finally {
      setActionEnd()
    }
  }

  const handleRequestReturnOtp = async (order: MarketplaceOrder) => {
    setActionStart(order.id)
    clearSectionFeedback(order.id, 'otp')

    try {
      const response = await requestReturnOtp(order.id)
      updateOrderInState(response.order)
      setGeneratedOtps((prev) => ({
        ...prev,
        [order.id]: {
          otp: response.otp,
          expiresAt: response.expiresAt,
          stage: 'return',
        },
      }))
      setSectionSuccess(order.id, 'otp', 'Return OTP generated. Share it with the counterpart for verification.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate return OTP.'
      setSectionError(order.id, 'otp', message)
    } finally {
      setActionEnd()
    }
  }

  const handleVerifyReturnOtp = async (order: MarketplaceOrder) => {
    const otp = (otpInputs[order.id] || '').trim()
    clearSectionFeedback(order.id, 'otp')

    if (!/^\d{6}$/.test(otp)) {
      setSectionError(order.id, 'otp', 'Please enter a valid 6-digit OTP.')
      return
    }

    setActionStart(order.id)

    try {
      const updated = await verifyReturnOtp(order.id, otp)
      updateOrderInState(updated)
      setOtpInputs((prev) => ({ ...prev, [order.id]: '' }))
      setGeneratedOtps((prev) => {
        const next = { ...prev }
        delete next[order.id]
        return next
      })
      setSectionSuccess(order.id, 'otp', 'Return OTP verified successfully. Rental completed.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify return OTP.'
      setSectionError(order.id, 'otp', message)
    } finally {
      setActionEnd()
    }
  }

  const loadOrderDisputes = async (orderId: string) => {
    const disputes = await fetchOrderDisputes(orderId)
    setDisputesByOrder((prev) => ({ ...prev, [orderId]: disputes }))
    return disputes
  }

  const toggleDisputePanel = async (orderId: string) => {
    const nextOpen = !openDisputePanelByOrder[orderId]
    setOpenDisputePanelByOrder((prev) => ({ ...prev, [orderId]: nextOpen }))

    if (!nextOpen) {
      return
    }

    setActionStart(orderId)
    clearSectionFeedback(orderId, 'dispute-thread')
    try {
      const disputes = await loadOrderDisputes(orderId)
      if (disputes.length > 0) {
        setSelectedDisputeByOrder((prev) => ({
          ...prev,
          [orderId]: prev[orderId] || disputes[0].id,
        }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load order disputes.'
      setSectionError(orderId, 'dispute-thread', message)
    } finally {
      setActionEnd()
    }
  }

  const handleCreateDispute = async (order: MarketplaceOrder) => {
    const draft = disputeDraftByOrder[order.id] || {
      title: '',
      description: '',
      reasonCode: 'other' as MarketplaceDisputeReasonCode,
      requestedResolution: '',
    }

    setActionStart(order.id)
    clearSectionFeedback(order.id, 'dispute-form')
    try {
      const selectedFiles = draftEvidenceFilesByOrder[order.id] || []
      const uploadedEvidence =
        selectedFiles.length > 0
          ? await uploadOrderDisputeEvidence(
              order.id,
              await Promise.all(
                selectedFiles.map(async (file) => ({
                  name: file.name,
                  type: file.type || 'application/octet-stream',
                  base64: await fileToBase64(file),
                }))
              )
            )
          : []

      const response = await createOrderDispute(order.id, {
        title: draft.title,
        description: draft.description,
        reasonCode: draft.reasonCode,
        requestedResolution: draft.requestedResolution,
        priority: 'medium',
        evidence: uploadedEvidence,
      })

      setSectionSuccess(order.id, 'dispute-form', 'Conflict filed successfully. Our support team has been notified.')

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                disputeStatus: 'open',
                latestDisputeId: response.dispute.id,
              }
            : item
        )
      )

      const disputes = await loadOrderDisputes(order.id)
      setSelectedDisputeByOrder((prev) => ({ ...prev, [order.id]: response.dispute.id }))
      setDisputeDetailById((prev) => ({
        ...prev,
        [response.dispute.id]: {
          dispute: response.dispute,
          messages: [response.initialMessage],
        },
      }))

      setDisputeDraftByOrder((prev) => ({
        ...prev,
        [order.id]: {
          title: '',
          description: '',
          reasonCode: 'other',
          requestedResolution: '',
        },
      }))
      setDraftEvidenceFilesByOrder((prev) => ({
        ...prev,
        [order.id]: [],
      }))

      if (disputes.length === 0) {
        await loadOrderDisputes(order.id)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to file conflict.'
      setSectionError(order.id, 'dispute-form', message)
    } finally {
      setActionEnd()
    }
  }

  const handleSelectDispute = async (orderId: string, disputeId: string) => {
    setSelectedDisputeByOrder((prev) => ({ ...prev, [orderId]: disputeId }))
    if (disputeDetailById[disputeId]) {
      return
    }

    setActionStart(orderId)
    clearSectionFeedback(orderId, 'dispute-thread')
    try {
      const detail = await fetchOrderDisputeDetail(orderId, disputeId)
      setDisputeDetailById((prev) => ({ ...prev, [disputeId]: detail }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load conflict conversation.'
      setSectionError(orderId, 'dispute-thread', message)
    } finally {
      setActionEnd()
    }
  }

  const handleReplyToDispute = async (orderId: string, disputeId: string) => {
    const text = String(replyDraftByDispute[disputeId] || '').trim()
    const files = replyEvidenceFilesByDispute[disputeId] || []
    clearSectionFeedback(orderId, 'dispute-thread')
    if (text.length < 3 && files.length === 0) {
      setSectionError(orderId, 'dispute-thread', 'Write at least 3 characters or attach evidence before sending.')
      return
    }

    setActionStart(orderId)
    try {
      const uploadedAttachments =
        files.length > 0
          ? await uploadOrderDisputeEvidence(
              orderId,
              await Promise.all(
                files.map(async (file) => ({
                  name: file.name,
                  type: file.type || 'application/octet-stream',
                  base64: await fileToBase64(file),
                }))
              )
            )
          : []

      const message = await postOrderDisputeMessage(orderId, disputeId, text, uploadedAttachments)
      setReplyDraftByDispute((prev) => ({ ...prev, [disputeId]: '' }))
      setReplyEvidenceFilesByDispute((prev) => ({ ...prev, [disputeId]: [] }))
      setDisputeDetailById((prev) => {
        const existing = prev[disputeId]
        if (!existing) return prev

        return {
          ...prev,
          [disputeId]: {
            ...existing,
            messages: [...existing.messages, message],
          },
        }
      })
      setSectionSuccess(orderId, 'dispute-thread', 'Conflict message sent.')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to send dispute message.'
      setSectionError(orderId, 'dispute-thread', msg)
    } finally {
      setActionEnd()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom py-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600">Track requests, approvals, handover, return, and completion in one place.</p>
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
              <option value="handover_otp_pending">Handover OTP Pending</option>
              <option value="in_use">In Use</option>
              <option value="return_otp_pending">Return OTP Pending</option>
              <option value="completed">Completed</option>
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

        {successText ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{successText}</div>
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
            const isSeller = currentUser?.id === order.sellerId
            const isBuyer = currentUser?.id === order.buyerId
            const showSellerDecisionActions =
              isIncoming && isSeller && order.status === 'pending_seller_approval'

            const canCancel = (isBuyer || isSeller) && order.status === 'pending_seller_approval'

            const canRequestHandoverOtp =
              (isBuyer || isSeller) && ['approved', 'handover_otp_pending'].includes(order.status)

            const canVerifyHandoverOtp =
              (isBuyer || isSeller) && order.status === 'handover_otp_pending'

            const canRequestReturnOtp =
              order.mode === 'rent' &&
              (isBuyer || isSeller) &&
              ['in_use', 'return_otp_pending'].includes(order.status)

            const canVerifyReturnOtp =
              order.mode === 'rent' && (isBuyer || isSeller) && order.status === 'return_otp_pending'

            const otpPreview = generatedOtps[order.id]
            const disputePanelOpen = Boolean(openDisputePanelByOrder[order.id])
            const orderDisputes = disputesByOrder[order.id] || []
            const selectedDisputeId = selectedDisputeByOrder[order.id] || orderDisputes[0]?.id || ''
            const selectedDisputeDetail = selectedDisputeId ? disputeDetailById[selectedDisputeId] : undefined
            const activeDisputeExists =
              order.disputeStatus !== 'none' &&
              ACTIVE_DISPUTE_STATUSES.includes(order.disputeStatus)
            const draft = disputeDraftByOrder[order.id] || {
              title: '',
              description: '',
              reasonCode: 'other' as MarketplaceDisputeReasonCode,
              requestedResolution: '',
            }
            const disputeFormFeedback = sectionFeedbackByKey[buildSectionKey(order.id, 'dispute-form')]
            const disputeThreadFeedback = sectionFeedbackByKey[buildSectionKey(order.id, 'dispute-thread')]
            const orderActionsFeedback = sectionFeedbackByKey[buildSectionKey(order.id, 'order-actions')]
            const otpFeedback = sectionFeedbackByKey[buildSectionKey(order.id, 'otp')]

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

                    {order.handoverVerifiedAt ? (
                      <p className="text-xs text-teal-700">Handover verified: {formatDate(order.handoverVerifiedAt)}</p>
                    ) : null}

                    {order.returnVerifiedAt ? (
                      <p className="text-xs text-indigo-700">Return verified: {formatDate(order.returnVerifiedAt)}</p>
                    ) : null}

                    {order.completedAt ? (
                      <p className="text-xs text-emerald-700">Completed at: {formatDate(order.completedAt)}</p>
                    ) : null}

                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="inline-flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-700" />
                          <h3 className="text-base font-semibold text-orange-900">Conflict Center</h3>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 items-center">
                        <button
                          type="button"
                          disabled={actioningOrderId === order.id}
                          onClick={() => {
                            void toggleDisputePanel(order.id)
                          }}
                          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                            disputePanelOpen
                              ? 'bg-orange-600 text-white hover:bg-orange-700'
                              : 'bg-white border border-orange-300 text-orange-700 hover:bg-orange-100'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {disputePanelOpen ? '▼ View Disputes' : '▶ View Disputes'}
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-600">Status:</span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            order.disputeStatus === 'none'
                              ? 'bg-gray-100 text-gray-700'
                              : order.disputeStatus === 'resolved' || order.disputeStatus === 'closed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {order.disputeStatus === 'none'
                              ? 'No conflict'
                              : disputeStatusLabel[order.disputeStatus]}
                          </span>
                        </div>
                      </div>

                      {disputePanelOpen ? (
                        <div className="mt-3 space-y-3">
                          {orderDisputes.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {orderDisputes.map((dispute) => (
                                <button
                                  key={dispute.id}
                                  type="button"
                                  onClick={() => {
                                    void handleSelectDispute(order.id, dispute.id)
                                  }}
                                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                                    selectedDisputeId === dispute.id
                                      ? 'bg-orange-600 text-white'
                                      : 'border border-orange-300 bg-white text-orange-800 hover:bg-orange-100'
                                  }`}
                                >
                                  {disputeReasonLabel[dispute.reasonCode]} • {disputeStatusLabel[dispute.status]}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-orange-700">No conflicts filed yet for this order.</p>
                          )}

                          {selectedDisputeDetail ? (
                            <div className="rounded-md border border-orange-200 bg-white p-4 mt-4">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-sm font-semibold text-orange-900">{selectedDisputeDetail.dispute.title}</p>
                                  <p className="mt-1 text-xs text-orange-700">
                                    {selectedDisputeDetail.dispute.description}
                                  </p>
                                  {renderEvidence(selectedDisputeDetail.dispute.evidence || [])}
                                </div>
                                
                                {selectedDisputeDetail.dispute.resolutionSummary ? (
                                  <div className="rounded bg-green-50 border border-green-200 p-3">
                                    <p className="text-xs font-semibold text-green-900">Admin Verdict:</p>
                                    <p className="mt-1 text-xs text-green-700">{selectedDisputeDetail.dispute.resolutionSummary}</p>
                                  </div>
                                ) : null}

                                <div className="border-t border-orange-100 pt-3">
                                  <p className="text-xs font-semibold text-gray-700 mb-2">Conversation:</p>
                                  <div className="max-h-48 space-y-2 overflow-y-auto rounded border border-orange-100 bg-orange-50 p-3 flex flex-col">
                                    {selectedDisputeDetail.messages.map((message) => (
                                      <div key={message.id} className="rounded bg-white p-2.5 text-xs text-gray-700">
                                        <div className="flex justify-between items-start">
                                          <p className="font-semibold uppercase text-gray-600 text-[11px]">{message.authorType}</p>
                                          <p className="text-[11px] text-gray-400">{formatDate(message.createdAt)}</p>
                                        </div>
                                        <p className="mt-1.5">{message.body}</p>
                                        {renderEvidence(message.attachments || [])}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {selectedDisputeDetail.dispute.status !== 'closed' && selectedDisputeDetail.dispute.status !== 'resolved' ? (
                                  <div className="border-t border-orange-100 pt-3">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Add Reply:</p>
                                    <div className="flex flex-col gap-2">
                                      <input
                                        value={replyDraftByDispute[selectedDisputeDetail.dispute.id] || ''}
                                        onChange={(event) =>
                                          setReplyDraftByDispute((prev) => ({
                                            ...prev,
                                            [selectedDisputeDetail.dispute.id]: event.target.value,
                                          }))
                                        }
                                        className="rounded-md border border-orange-200 px-3 py-2 text-sm"
                                        placeholder="Type your reply..."
                                      />
                                      <div className="flex flex-wrap items-center gap-2">
                                        <input
                                          type="file"
                                          multiple
                                          onChange={(event) => {
                                            const files = Array.from(event.target.files || [])
                                            setReplyEvidenceFilesByDispute((prev) => ({
                                              ...prev,
                                              [selectedDisputeDetail.dispute.id]: files,
                                            }))
                                          }}
                                          className="rounded-md border border-orange-200 px-2 py-1 text-xs"
                                        />
                                        <button
                                          type="button"
                                          disabled={actioningOrderId === order.id}
                                          onClick={() => {
                                            void handleReplyToDispute(order.id, selectedDisputeDetail.dispute.id)
                                          }}
                                          className="inline-flex items-center gap-1 rounded-md bg-orange-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          <MessageSquare className="h-3.5 w-3.5" />
                                          Send Reply
                                        </button>
                                      </div>
                                      {(replyEvidenceFilesByDispute[selectedDisputeDetail.dispute.id] || []).length > 0 ? (
                                        <p className="text-xs text-orange-700">
                                          {(replyEvidenceFilesByDispute[selectedDisputeDetail.dispute.id] || []).length} attachment(s) selected.
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : null}
                                
                                {disputeThreadFeedback?.error ? (
                                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{disputeThreadFeedback.error}</p>
                                ) : null}
                                {disputeThreadFeedback?.success ? (
                                  <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">{disputeThreadFeedback.success}</p>
                                ) : null}
                              </div>
                            </div>
                          ) : null}

                          {!selectedDisputeDetail && (disputeThreadFeedback?.error || disputeThreadFeedback?.success) ? (
                            <div>
                              {disputeThreadFeedback.error ? (
                                <p className="text-xs text-red-600">{disputeThreadFeedback.error}</p>
                              ) : null}
                              {disputeThreadFeedback.success ? (
                                <p className="text-xs text-green-700">{disputeThreadFeedback.success}</p>
                              ) : null}
                            </div>
                          ) : null}

                          {!activeDisputeExists ? (
                            <div className="mt-4 grid gap-2 rounded-md border border-orange-300 bg-white p-4">
                              <p className="text-sm font-semibold text-orange-900">📋 File a New Conflict</p>
                              <input
                                value={draft.title}
                                onChange={(event) =>
                                  setDisputeDraftByOrder((prev) => ({
                                    ...prev,
                                    [order.id]: {
                                      ...draft,
                                      title: event.target.value,
                                    },
                                  }))
                                }
                                className="rounded-md border border-orange-300 px-2 py-1 text-sm"
                                placeholder="Short title of the issue"
                              />
                              <select
                                value={draft.reasonCode}
                                onChange={(event) =>
                                  setDisputeDraftByOrder((prev) => ({
                                    ...prev,
                                    [order.id]: {
                                      ...draft,
                                      reasonCode: event.target.value as MarketplaceDisputeReasonCode,
                                    },
                                  }))
                                }
                                className="rounded-md border border-orange-300 px-2 py-1 text-sm"
                              >
                                {Object.entries(disputeReasonLabel).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                              <textarea
                                value={draft.description}
                                onChange={(event) =>
                                  setDisputeDraftByOrder((prev) => ({
                                    ...prev,
                                    [order.id]: {
                                      ...draft,
                                      description: event.target.value,
                                    },
                                  }))
                                }
                                className="rounded-md border border-orange-300 px-2 py-1 text-sm"
                                rows={3}
                                placeholder="Describe what happened in detail"
                              />
                              <input
                                value={draft.requestedResolution}
                                onChange={(event) =>
                                  setDisputeDraftByOrder((prev) => ({
                                    ...prev,
                                    [order.id]: {
                                      ...draft,
                                      requestedResolution: event.target.value,
                                    },
                                  }))
                                }
                                className="rounded-md border border-orange-300 px-2 py-1 text-sm"
                                placeholder="How would you like this resolved? (optional)"
                              />
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Attach Evidence (photos, documents, etc.)</label>
                                <input
                                  type="file"
                                  multiple
                                  onChange={(event) => {
                                    const files = Array.from(event.target.files || [])
                                    setDraftEvidenceFilesByOrder((prev) => ({
                                      ...prev,
                                      [order.id]: files,
                                    }))
                                  }}
                                  className="rounded-md border border-orange-300 px-2 py-1 text-xs"
                                />
                              </div>
                              {(draftEvidenceFilesByOrder[order.id] || []).length > 0 ? (
                                <p className="text-xs text-orange-700 bg-orange-100 rounded p-2">
                                  ✓ {(draftEvidenceFilesByOrder[order.id] || []).length} file(s) ready to upload
                                </p>
                              ) : null}
                              <button
                                type="button"
                                disabled={actioningOrderId === order.id}
                                onClick={() => {
                                  void handleCreateDispute(order)
                                }}
                                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Submit Conflict
                              </button>
                              {disputeFormFeedback?.error ? (
                                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{disputeFormFeedback.error}</p>
                              ) : null}
                              {disputeFormFeedback?.success ? (
                                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">{disputeFormFeedback.success}</p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {otpPreview ? (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                        <p className="font-semibold">
                          {otpPreview.stage === 'handover' ? 'Handover OTP' : 'Return OTP'}: {otpPreview.otp}
                        </p>
                        <p>Expires: {formatDate(otpPreview.expiresAt)}</p>
                      </div>
                    ) : null}

                    {showSellerDecisionActions ? (
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
                    ) : null}

                    {(canRequestHandoverOtp || canVerifyHandoverOtp || canRequestReturnOtp || canVerifyReturnOtp || canCancel) ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex flex-wrap gap-2">
                          {canRequestHandoverOtp ? (
                            <button
                              type="button"
                              disabled={actioningOrderId === order.id}
                              onClick={() => {
                                void handleRequestHandoverOtp(order)
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Request Handover OTP
                            </button>
                          ) : null}

                          {canRequestReturnOtp ? (
                            <button
                              type="button"
                              disabled={actioningOrderId === order.id}
                              onClick={() => {
                                void handleRequestReturnOtp(order)
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Request Return OTP
                            </button>
                          ) : null}

                          {canCancel ? (
                            <button
                              type="button"
                              disabled={actioningOrderId === order.id}
                              onClick={() => {
                                void handleCancel(order)
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancel Order
                            </button>
                          ) : null}
                        </div>

                        {(canVerifyHandoverOtp || canVerifyReturnOtp) ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              value={otpInputs[order.id] || ''}
                              onChange={(event) => {
                                const sanitized = event.target.value.replace(/\D/g, '').slice(0, 6)
                                setOtpInputs((prev) => ({
                                  ...prev,
                                  [order.id]: sanitized,
                                }))
                              }}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              placeholder="Enter 6-digit OTP"
                            />

                            {canVerifyHandoverOtp ? (
                              <button
                                type="button"
                                disabled={actioningOrderId === order.id}
                                onClick={() => {
                                  void handleVerifyHandoverOtp(order)
                                }}
                                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Verify Handover OTP
                              </button>
                            ) : null}

                            {canVerifyReturnOtp ? (
                              <button
                                type="button"
                                disabled={actioningOrderId === order.id}
                                onClick={() => {
                                  void handleVerifyReturnOtp(order)
                                }}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Verify Return OTP
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        {otpFeedback?.error ? (
                          <p className="text-xs text-red-600">{otpFeedback.error}</p>
                        ) : null}
                        {otpFeedback?.success ? (
                          <p className="text-xs text-green-700">{otpFeedback.success}</p>
                        ) : null}
                      </div>
                    ) : null}

                    {orderActionsFeedback?.error ? (
                      <p className="text-xs text-red-600">{orderActionsFeedback.error}</p>
                    ) : null}
                    {orderActionsFeedback?.success ? (
                      <p className="text-xs text-green-700">{orderActionsFeedback.success}</p>
                    ) : null}

                    {!showSellerDecisionActions &&
                    !canRequestHandoverOtp &&
                    !canVerifyHandoverOtp &&
                    !canRequestReturnOtp &&
                    !canVerifyReturnOtp &&
                    !canCancel ? (
                      <div className="inline-flex items-center gap-2 text-xs text-gray-500">
                        <Clock3 className="h-4 w-4" />
                        {order.status === 'pending_seller_approval'
                          ? 'Waiting for seller decision.'
                          : `Last updated ${formatDate(order.updatedAt)}`}
                      </div>
                    ) : null}
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

