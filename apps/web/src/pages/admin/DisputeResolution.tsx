import React, { useEffect, useMemo, useState } from 'react'
import {
	assignAdminDispute,
	getAdminUserHistory,
	getAdminDisputeDetail,
	getAdminDisputes,
	issueAdminDisputeVerdict,
	postAdminDisputeMessage,
} from '@/api/endpoints/admin'
import type { AdminUserHistoryResponse } from '@rentverse/shared'
import type {
	MarketplaceDisputePriority,
	MarketplaceDisputeVerdict,
	MarketplaceOrderDispute,
	MarketplaceOrderDisputeDetailResponse,
	MarketplaceOrderDisputeStatus,
} from '@rentverse/shared'

const statusOptions: Array<Exclude<MarketplaceOrderDisputeStatus, 'none'>> = [
	'open',
	'under_review',
	'awaiting_parties',
	'resolved',
	'closed',
]

const priorityOptions: MarketplaceDisputePriority[] = ['low', 'medium', 'high', 'urgent']

const verdictOptions: MarketplaceDisputeVerdict[] = [
	'buyer_favor',
	'seller_favor',
	'partial_refund',
	'full_refund',
	'replacement',
	'warning',
	'no_action',
	'other',
]

const formatDate = (iso: string) => new Date(iso).toLocaleString()

const renderEvidence = (items: Array<{ url?: string; signedUrl?: string | null; name?: string; note?: string }>) => {
	if (!Array.isArray(items) || items.length === 0) {
		return null
	}

	return (
		<div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2">
			<p className="text-[11px] font-semibold uppercase text-slate-600">Evidence</p>
			{items.map((item, index) => {
				const href = item.signedUrl || item.url
				const label = item.name || item.note || `Attachment ${index + 1}`
				return href ? (
					<a
						key={`${href}-${index}`}
						href={href}
						target="_blank"
						rel="noreferrer"
						className="block text-xs text-blue-700 underline hover:text-blue-900"
					>
						{label}
					</a>
				) : (
					<p key={`${label}-${index}`} className="text-xs text-slate-600">
						{label}
					</p>
				)
			})}
		</div>
	)
}

const DisputeResolution: React.FC = () => {
	const [queue, setQueue] = useState<MarketplaceOrderDispute[]>([])
	const [selectedDisputeId, setSelectedDisputeId] = useState<string>('')
	const [detail, setDetail] = useState<MarketplaceOrderDisputeDetailResponse | null>(null)
	const [statusFilter, setStatusFilter] = useState<'' | Exclude<MarketplaceOrderDisputeStatus, 'none'>>('')
	const [priorityFilter, setPriorityFilter] = useState<'' | MarketplaceDisputePriority>('')
	const [messageDraft, setMessageDraft] = useState('')
	const [internalNote, setInternalNote] = useState(false)
	const [verdict, setVerdict] = useState<MarketplaceDisputeVerdict>('other')
	const [resolutionSummary, setResolutionSummary] = useState('')
	const [actionStatus, setActionStatus] = useState<'resolved' | 'closed' | 'awaiting_parties' | 'under_review'>(
		'resolved'
	)
	const [isLoading, setIsLoading] = useState(true)
	const [isActioning, setIsActioning] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')
	const [historyUserId, setHistoryUserId] = useState('')
	const [historyUserLabel, setHistoryUserLabel] = useState('')
	const [historyData, setHistoryData] = useState<AdminUserHistoryResponse | null>(null)
	const [historyLoading, setHistoryLoading] = useState(false)
	const [historyError, setHistoryError] = useState('')

	const selected = useMemo(
		() => queue.find((item) => item.id === selectedDisputeId) || null,
		[queue, selectedDisputeId]
	)

	const loadQueue = async () => {
		const disputes = await getAdminDisputes({
			status: statusFilter || undefined,
			priority: priorityFilter || undefined,
			limit: 200,
		})
		setQueue(disputes)
		if (!selectedDisputeId && disputes[0]) {
			setSelectedDisputeId(disputes[0].id)
		}
	}

	const loadDetail = async (disputeId: string) => {
		const payload = await getAdminDisputeDetail(disputeId)
		setDetail(payload)
	}

	useEffect(() => {
		let active = true

		const load = async () => {
			setIsLoading(true)
			setError('')
			try {
				const disputes = await getAdminDisputes({
					status: statusFilter || undefined,
					priority: priorityFilter || undefined,
					limit: 200,
				})
				if (!active) return
				setQueue(disputes)
				const preferredId = selectedDisputeId || disputes[0]?.id || ''
				setSelectedDisputeId(preferredId)
				if (preferredId) {
					const payload = await getAdminDisputeDetail(preferredId)
					if (!active) return
					setDetail(payload)
					setResolutionSummary(payload.dispute.resolutionSummary || '')
					setVerdict(payload.dispute.resolutionVerdict || 'other')
				} else {
					setDetail(null)
					setResolutionSummary('')
				}
			} catch (err) {
				if (!active) return
				setError(err instanceof Error ? err.message : 'Failed to load disputes')
			} finally {
				if (active) setIsLoading(false)
			}
		}

		void load()
		return () => {
			active = false
		}
	}, [priorityFilter, selectedDisputeId, statusFilter])

	const onSelectDispute = async (disputeId: string) => {
		setSelectedDisputeId(disputeId)
		setIsActioning(true)
		setError('')
		try {
			const payload = await getAdminDisputeDetail(disputeId)
			setDetail(payload)
			setResolutionSummary(payload.dispute.resolutionSummary || '')
			setVerdict(payload.dispute.resolutionVerdict || 'other')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load dispute detail')
		} finally {
			setIsActioning(false)
		}
	}

	const onAssignToMe = async () => {
		if (!selected) return

		setIsActioning(true)
		setError('')
		setSuccess('')
		try {
			await assignAdminDispute(selected.id)
			await loadQueue()
			await loadDetail(selected.id)
			setSuccess('Dispute assigned to you.')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to assign dispute')
		} finally {
			setIsActioning(false)
		}
	}

	const onPostMessage = async () => {
		if (!selected || messageDraft.trim().length < 3) {
			setError('Message must be at least 3 characters.')
			return
		}

		setIsActioning(true)
		setError('')
		setSuccess('')
		try {
			await postAdminDisputeMessage(selected.id, {
				body: messageDraft.trim(),
				isInternalNote: internalNote,
			})
			setMessageDraft('')
			await loadDetail(selected.id)
			await loadQueue()
			setSuccess(internalNote ? 'Internal note added.' : 'Admin message posted.')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to post message')
		} finally {
			setIsActioning(false)
		}
	}

	const onApplyVerdict = async () => {
		if (!selected) return

		setIsActioning(true)
		setError('')
		setSuccess('')

		try {
			await issueAdminDisputeVerdict(selected.id, {
				status: actionStatus,
				verdict: actionStatus === 'resolved' ? verdict : undefined,
				summary: resolutionSummary,
			})
			await loadQueue()
			await loadDetail(selected.id)
			setSuccess('Dispute decision updated.')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update verdict')
		} finally {
			setIsActioning(false)
		}
	}

	const onViewUserHistory = async (userId: string, label: string) => {
		setHistoryUserId(userId)
		setHistoryUserLabel(label)
		setHistoryData(null)
		setHistoryError('')
		setHistoryLoading(true)

		try {
			const payload = await getAdminUserHistory(userId)
			setHistoryData(payload)
		} catch (err) {
			setHistoryError(err instanceof Error ? err.message : 'Failed to load user history')
		} finally {
			setHistoryLoading(false)
		}
	}

	const closeHistoryModal = () => {
		setHistoryUserId('')
		setHistoryUserLabel('')
		setHistoryData(null)
		setHistoryError('')
		setHistoryLoading(false)
	}

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-2xl font-semibold">Conflict Resolution</h1>
				<p className="text-sm text-slate-600">
					Review participant conflicts, coordinate evidence, and issue documented admin verdicts.
				</p>
			</div>

			<div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
				<select
					value={statusFilter}
					onChange={(event) => setStatusFilter(event.target.value as '' | Exclude<MarketplaceOrderDisputeStatus, 'none'>)}
					className="rounded border border-slate-300 px-2 py-1 text-sm"
				>
					<option value="">All statuses</option>
					{statusOptions.map((status) => (
						<option key={status} value={status}>
							{status}
						</option>
					))}
				</select>
				<select
					value={priorityFilter}
					onChange={(event) => setPriorityFilter(event.target.value as '' | MarketplaceDisputePriority)}
					className="rounded border border-slate-300 px-2 py-1 text-sm"
				>
					<option value="">All priorities</option>
					{priorityOptions.map((priority) => (
						<option key={priority} value={priority}>
							{priority}
						</option>
					))}
				</select>
			</div>

			{error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
			{success ? (
				<div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>
			) : null}
			{isLoading ? <div className="text-sm text-slate-600">Loading disputes...</div> : null}

			<div className="grid gap-4 lg:grid-cols-[360px_1fr]">
				<div className="rounded-lg border border-slate-200">
					<div className="border-b border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">Queue</div>
					<div className="max-h-[520px] overflow-y-auto">
						{queue.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => {
									void onSelectDispute(item.id)
								}}
								className={`w-full border-b border-slate-100 p-3 text-left hover:bg-slate-50 ${
									selectedDisputeId === item.id ? 'bg-amber-50' : ''
								}`}
							>
								<p className="text-sm font-semibold text-slate-900">{item.title}</p>
								<p className="text-xs text-slate-600">Order: {item.orderId.slice(0, 8)}... • {item.status}</p>
								<p className="mt-1 text-xs text-slate-500">Priority: {item.priority} • {formatDate(item.createdAt)}</p>
							</button>
						))}
						{!isLoading && queue.length === 0 ? (
							<p className="p-4 text-sm text-slate-500">No disputes found for the selected filters.</p>
						) : null}
					</div>
				</div>

				<div className="rounded-lg border border-slate-200 p-4">
					{!detail ? (
						<p className="text-sm text-slate-500">Select a dispute from the queue to review details.</p>
					) : (
						<div className="space-y-4">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<h2 className="text-lg font-semibold text-slate-900">{detail.dispute.title}</h2>
									<p className="text-sm text-slate-600">{detail.dispute.description}</p>
									<p className="mt-1 text-xs text-slate-500">
										Reason: {detail.dispute.reasonCode} • Status: {detail.dispute.status} • Priority: {detail.dispute.priority}
									</p>
									{detail.dispute.sla ? (
										<p className="mt-1 text-xs text-amber-700">
											SLA: first response by {formatDate(detail.dispute.sla.firstResponseDueAt)} • resolution by {formatDate(detail.dispute.sla.resolutionDueAt)}
										</p>
									) : null}
									{renderEvidence(detail.dispute.evidence || [])}
								</div>
								<button
									type="button"
									disabled={isActioning}
									onClick={() => {
										void onAssignToMe()
									}}
									className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
								>
									Assign To Me
								</button>
							</div>

							<div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
								<div className="space-y-2 rounded border border-slate-200 bg-white p-3">
									<div className="flex items-center justify-between gap-2">
										<h3 className="text-sm font-semibold text-slate-900">Buyer</h3>
										{detail.dispute.buyer ? (
											<button
												type="button"
												onClick={() => {
													void onViewUserHistory(detail.dispute.buyer!.userId, detail.dispute.buyer!.name || 'Buyer')
												}}
												className="rounded border border-blue-300 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
											>
												View History
											</button>
										) : null}
									</div>
									{detail.dispute.buyer ? (
										<div className="space-y-1 text-xs text-slate-700">
											<p><span className="font-semibold">Name:</span> {detail.dispute.buyer.name}</p>
											<p><span className="font-semibold">Email:</span> {detail.dispute.buyer.email}</p>
											<p><span className="font-semibold">Phone:</span> {detail.dispute.buyer.phone || "N/A"}</p>
											<p><span className="font-semibold">City:</span> {detail.dispute.buyer.city || "N/A"}</p>
											<p><span className="font-semibold">KYC Status:</span> <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
												detail.dispute.buyer.kycStatus === 'verified' ? 'bg-green-100 text-green-700' :
												detail.dispute.buyer.kycStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
												detail.dispute.buyer.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' :
												'bg-gray-100 text-gray-700'
											}`}>{String(detail.dispute.buyer.kycStatus).replace(/_/g, ' ')}</span></p>
										</div>
									) : (
										<p className="text-xs text-slate-500">No buyer information available</p>
									)}
								</div>

								<div className="space-y-2 rounded border border-slate-200 bg-white p-3">
									<div className="flex items-center justify-between gap-2">
										<h3 className="text-sm font-semibold text-slate-900">Seller</h3>
										{detail.dispute.seller ? (
											<button
												type="button"
												onClick={() => {
													void onViewUserHistory(detail.dispute.seller!.userId, detail.dispute.seller!.name || 'Seller')
												}}
												className="rounded border border-blue-300 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
											>
												View History
											</button>
										) : null}
									</div>
									{detail.dispute.seller ? (
										<div className="space-y-1 text-xs text-slate-700">
											<p><span className="font-semibold">Name:</span> {detail.dispute.seller.name}</p>
											<p><span className="font-semibold">Email:</span> {detail.dispute.seller.email}</p>
											<p><span className="font-semibold">Phone:</span> {detail.dispute.seller.phone || "N/A"}</p>
											<p><span className="font-semibold">City:</span> {detail.dispute.seller.city || "N/A"}</p>
											<p><span className="font-semibold">KYC Status:</span> <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
												detail.dispute.seller.kycStatus === 'verified' ? 'bg-green-100 text-green-700' :
												detail.dispute.seller.kycStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
												detail.dispute.seller.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' :
												'bg-gray-100 text-gray-700'
											}`}>{String(detail.dispute.seller.kycStatus).replace(/_/g, ' ')}</span></p>
										</div>
									) : (
										<p className="text-xs text-slate-500">No seller information available</p>
									)}
								</div>
							</div>

							<div className="max-h-56 space-y-2 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-3">
								{detail.messages.map((message) => (
									<div key={message.id} className="rounded border border-slate-200 bg-white p-2 text-xs">
										<p className="font-semibold uppercase text-slate-500">{message.authorType}</p>
										<p className="mt-1 text-slate-800">{message.body}</p>
										{renderEvidence(message.attachments || [])}
										<p className="mt-1 text-[11px] text-slate-400">{formatDate(message.createdAt)}</p>
										{message.isInternalNote ? <p className="mt-1 text-[11px] text-amber-700">Internal note</p> : null}
									</div>
								))}
							</div>

							<div className="space-y-2 rounded border border-slate-200 p-3">
								<p className="text-xs font-semibold text-slate-700">Add Admin Message</p>
								<textarea
									value={messageDraft}
									onChange={(event) => setMessageDraft(event.target.value)}
									rows={3}
									className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
									placeholder="Write update, ask for evidence, or provide decision notes"
								/>
								<label className="inline-flex items-center gap-2 text-xs text-slate-600">
									<input
										type="checkbox"
										checked={internalNote}
										onChange={(event) => setInternalNote(event.target.checked)}
									/>
									Save as internal note (hidden from buyer/seller)
								</label>
								<button
									type="button"
									disabled={isActioning}
									onClick={() => {
										void onPostMessage()
									}}
									className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
								>
									Post Message
								</button>
							</div>

							<div className="space-y-2 rounded border border-slate-200 p-3">
								<p className="text-xs font-semibold text-slate-700">Issue Verdict / Status Update</p>
								<div className="grid gap-2 sm:grid-cols-2">
									<select
										value={actionStatus}
										onChange={(event) =>
											setActionStatus(
												event.target.value as 'resolved' | 'closed' | 'awaiting_parties' | 'under_review'
											)
										}
										className="rounded border border-slate-300 px-2 py-1 text-sm"
									>
										<option value="resolved">resolved</option>
										<option value="under_review">under_review</option>
										<option value="awaiting_parties">awaiting_parties</option>
										<option value="closed">closed</option>
									</select>
									<select
										value={verdict}
										onChange={(event) => setVerdict(event.target.value as MarketplaceDisputeVerdict)}
										className="rounded border border-slate-300 px-2 py-1 text-sm"
										disabled={actionStatus !== 'resolved'}
									>
										{verdictOptions.map((value) => (
											<option key={value} value={value}>
												{value}
											</option>
										))}
									</select>
								</div>
								<textarea
									value={resolutionSummary}
									onChange={(event) => setResolutionSummary(event.target.value)}
									rows={3}
									className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
									placeholder="Resolution summary (also shared in dispute thread)"
								/>
								<button
									type="button"
									disabled={isActioning}
									onClick={() => {
										void onApplyVerdict()
									}}
									className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
								>
									Apply Decision
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			{historyUserId ? (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
					<div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl">
						<div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
							<div>
								<h3 className="text-base font-semibold text-slate-900">User History: {historyUserLabel}</h3>
								<p className="text-xs text-slate-500">Complete profile, listings, order history, and completed orders.</p>
							</div>
							<button
								type="button"
								onClick={closeHistoryModal}
								className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
							>
								Close
							</button>
						</div>
						<div className="max-h-[calc(90vh-64px)] overflow-y-auto p-4">
							{historyLoading ? <p className="text-sm text-slate-600">Loading user history...</p> : null}
							{historyError ? <p className="text-sm text-red-600">{historyError}</p> : null}
							{historyData ? (
								<div className="space-y-4">
									<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
										<h4 className="mb-2 text-sm font-semibold text-slate-800">Profile Details</h4>
										<div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
											<p><span className="font-semibold">Name:</span> {historyData.profile.name}</p>
											<p><span className="font-semibold">Email:</span> {historyData.profile.email || 'N/A'}</p>
											<p><span className="font-semibold">Phone:</span> {historyData.profile.phone || 'N/A'}</p>
											<p><span className="font-semibold">City:</span> {historyData.profile.city || 'N/A'}</p>
											<p><span className="font-semibold">KYC:</span> {historyData.profile.kycStatus}</p>
											<p><span className="font-semibold">Profile Completed:</span> {historyData.profile.profileCompleted ? 'Yes' : 'No'}</p>
											<p><span className="font-semibold">Created:</span> {formatDate(historyData.profile.createdAt)}</p>
											<p><span className="font-semibold">Updated:</span> {formatDate(historyData.profile.updatedAt)}</p>
											<p><span className="font-semibold">Last Login:</span> {historyData.profile.lastLogin ? formatDate(historyData.profile.lastLogin) : 'N/A'}</p>
										</div>
									</div>

									<div className="rounded-lg border border-slate-200 p-4">
										<h4 className="mb-2 text-sm font-semibold text-slate-800">Listings ({historyData.listings.length})</h4>
										<div className="space-y-2">
											{historyData.listings.length === 0 ? (
												<p className="text-xs text-slate-500">No listings found for this user.</p>
											) : (
												historyData.listings.map((listing) => (
													<div key={listing.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
														<p className="font-semibold text-slate-800">{listing.title}</p>
														<p className="mt-0.5 text-slate-600">Type: {listing.listingType} • Status: {listing.status}</p>
														<p className="mt-0.5 text-slate-600">Buy: {listing.buyPrice ?? 'N/A'} • Day: {listing.rentDailyPrice ?? 'N/A'} • Week: {listing.rentWeeklyPrice ?? 'N/A'} • Month: {listing.rentMonthlyPrice ?? 'N/A'}</p>
														<p className="mt-0.5 text-slate-600">Created: {formatDate(listing.createdAt)}</p>
														{listing.link ? (
															<a href={listing.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-blue-700 underline hover:text-blue-900">
																Open listing
															</a>
														) : null}
													</div>
												))
											)}
										</div>
									</div>

									<div className="grid gap-4 lg:grid-cols-2">
										<div className="rounded-lg border border-slate-200 p-4">
											<h4 className="mb-2 text-sm font-semibold text-slate-800">Order Summary</h4>
											<div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
												<p><span className="font-semibold">Total:</span> {historyData.orders.summary.total}</p>
												<p><span className="font-semibold">As Buyer:</span> {historyData.orders.summary.asBuyer}</p>
												<p><span className="font-semibold">As Seller:</span> {historyData.orders.summary.asSeller}</p>
												<p><span className="font-semibold">Completed:</span> {historyData.orders.summary.completed}</p>
												<p><span className="font-semibold">Rejected:</span> {historyData.orders.summary.rejected}</p>
												<p><span className="font-semibold">Cancelled:</span> {historyData.orders.summary.cancelled}</p>
											</div>
										</div>

										<div className="rounded-lg border border-slate-200 p-4">
											<h4 className="mb-2 text-sm font-semibold text-slate-800">Completed Orders ({historyData.orders.completed.length})</h4>
											<div className="max-h-56 space-y-2 overflow-y-auto">
												{historyData.orders.completed.length === 0 ? (
													<p className="text-xs text-slate-500">No completed orders.</p>
												) : (
													historyData.orders.completed.map((order) => (
														<div key={order.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
															<p className="font-semibold text-slate-800">{order.listingTitle}</p>
															<p className="mt-0.5 text-slate-600">Order: {order.id.slice(0, 8)}... • Mode: {order.mode} • Role: {order.role}</p>
															<p className="mt-0.5 text-slate-600">Total: {order.totalDue} • Completed: {order.completedAt ? formatDate(order.completedAt) : 'N/A'}</p>
															{order.listingLink ? (
																<a href={order.listingLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-blue-700 underline hover:text-blue-900">
																	Open listing
																</a>
															) : null}
														</div>
													))
												)}
											</div>
										</div>
									</div>

									<div className="rounded-lg border border-slate-200 p-4">
										<h4 className="mb-2 text-sm font-semibold text-slate-800">All Orders ({historyData.orders.all.length})</h4>
										<div className="max-h-72 space-y-2 overflow-y-auto">
											{historyData.orders.all.length === 0 ? (
												<p className="text-xs text-slate-500">No order history available.</p>
											) : (
												historyData.orders.all.map((order) => (
													<div key={order.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
														<div className="flex flex-wrap items-start justify-between gap-2">
															<p className="font-semibold text-slate-800">{order.listingTitle}</p>
															<p className="rounded bg-slate-200 px-2 py-0.5 text-[11px] uppercase text-slate-700">{order.status}</p>
														</div>
														<p className="mt-0.5 text-slate-600">Order: {order.id.slice(0, 8)}... • Role: {order.role} • Mode: {order.mode}</p>
														<p className="mt-0.5 text-slate-600">Total: {order.totalDue} • Created: {formatDate(order.createdAt)}</p>
														{order.counterparty ? (
															<p className="mt-0.5 text-slate-600">Counterparty: {order.counterparty.name} ({order.counterparty.email || 'No email'})</p>
														) : null}
														{order.listingLink ? (
															<a href={order.listingLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-blue-700 underline hover:text-blue-900">
																Open listing
															</a>
														) : null}
													</div>
												))
											)}
										</div>
									</div>
								</div>
							) : null}
						</div>
					</div>
				</div>
			) : null}
		</div>
	)
}

export default DisputeResolution

