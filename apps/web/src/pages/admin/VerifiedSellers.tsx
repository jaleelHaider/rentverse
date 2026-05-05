import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Search, ShieldCheck, SortAsc, Star, UserCheck, UsersRound } from 'lucide-react';
import {
  getAdminVerifiedSellerCandidates,
  getAdminVerifiedSellerDetail,
  getAdminVerifiedSellers,
  updateAdminVerifiedSellerStatus,
} from '@/api/endpoints/admin';
import type {
  AdminVerifiedSellerDetailResponse,
  AdminVerifiedSellerProfile,
  AdminVerifiedSellerSummary,
} from '@rentverse/shared';

const tabs: Array<'candidate' | 'verified'> = ['candidate', 'verified'];
const sortOptions = [
  { value: 'orders_desc', label: 'Most orders' },
  { value: 'rating_desc', label: 'Best rating' },
  { value: 'reviews_desc', label: 'Most reviews' },
  { value: 'positive_desc', label: 'Best positive reviews' },
  { value: 'recent_desc', label: 'Most recent activity' },
  { value: 'orders_asc', label: 'Fewest orders' },
  { value: 'rating_asc', label: 'Lowest rating' },
  { value: 'reviews_asc', label: 'Fewest reviews' },
  { value: 'positive_asc', label: 'Lowest positive reviews' },
  { value: 'recent_asc', label: 'Oldest activity' },
] as const;

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const formatRating = (value: number) => value.toFixed(2);

const metricCard = (label: string, value: string | number) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
  </div>
);

const profileSummaryLine = (profile: AdminVerifiedSellerProfile) => {
  return [profile.city || 'No city', profile.kycStatus || 'unverified', profile.profileCompleted ? 'Profile complete' : 'Profile incomplete']
    .filter(Boolean)
    .join(' • ');
};

const SellerRow: React.FC<{
  item: AdminVerifiedSellerSummary;
  active: boolean;
  onSelect: (userId: string) => void;
}> = ({ item, active, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.profile.id)}
      className={`w-full rounded-2xl border p-4 text-left transition ${active ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {item.profile.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.profile.name}</p>
              <p className="text-xs text-slate-500">{item.profile.email}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600">{profileSummaryLine(item.profile)}</p>
        </div>
        <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
          {item.profile.verifiedSeller ? 'Verified seller' : 'Candidate'}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Orders</div>
          <div className="mt-1 font-semibold text-slate-900">{item.stats.totalOrders}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Reviews</div>
          <div className="mt-1 font-semibold text-slate-900">{item.stats.totalReviews}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Rating</div>
          <div className="mt-1 font-semibold text-slate-900">{formatRating(item.stats.avgRating)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Positive</div>
          <div className="mt-1 font-semibold text-slate-900">{formatPercent(item.stats.positivePercentage)}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>Active listings: {item.stats.activeListings}</span>
        <span>Last activity: {formatDate(item.stats.latestActivityAt)}</span>
      </div>

      <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <UsersRound className="h-4 w-4 text-slate-500" />
        View complete details
      </div>
    </button>
  );
};

const VerifiedSellers: React.FC = () => {
  const [tab, setTab] = useState<'candidate' | 'verified'>('candidate');
  const [sort, setSort] = useState('orders_desc');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<AdminVerifiedSellerSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<AdminVerifiedSellerDetailResponse | null>(null);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadList = async (nextTab: 'candidate' | 'verified', nextSort: string, nextSearch: string) => {
    const payload = nextTab === 'candidate'
      ? await getAdminVerifiedSellerCandidates({ sort: nextSort, search: nextSearch || undefined })
      : await getAdminVerifiedSellers({ sort: nextSort, search: nextSearch || undefined });
    setRows(payload || []);
    const preferredId = selectedId && payload.some((item) => item.profile.id === selectedId) ? selectedId : payload[0]?.profile.id || '';
    setSelectedId(preferredId);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError('');
      setSuccess('');
      try {
        const payload = tab === 'candidate'
          ? await getAdminVerifiedSellerCandidates({ sort, search: search || undefined })
          : await getAdminVerifiedSellers({ sort, search: search || undefined });
        if (!active) return;
        setRows(payload || []);
        const preferredId = selectedId && payload.some((item) => item.profile.id === selectedId) ? selectedId : payload[0]?.profile.id || '';
        setSelectedId(preferredId);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load verified sellers');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [tab, sort, search]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!selectedId) {
        setDetail(null);
        return;
      }

      setIsDetailLoading(true);
      try {
        const payload = await getAdminVerifiedSellerDetail(selectedId);
        if (!active) return;
        setDetail(payload);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load seller details');
      } finally {
        if (active) setIsDetailLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [selectedId]);

  const selectedProfile = useMemo(() => detail?.profile || null, [detail]);
  const selectedStats = detail?.stats || null;

  const handleSelect = (userId: string) => {
    setSelectedId(userId);
    setError('');
    setSuccess('');
  };

  const handleReload = async () => {
    await loadList(tab, sort, search);
    if (selectedId) {
      const detailPayload = await getAdminVerifiedSellerDetail(selectedId);
      setDetail(detailPayload);
    }
  };

  const handleStatusChange = async (verified: boolean) => {
    if (!selectedId) return;
    if (!detail) return;
    if (verified && !window.confirm('Mark this user as a verified seller?')) return;
    if (!verified && !window.confirm('Remove verified seller status from this user?')) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateAdminVerifiedSellerStatus(selectedId, { verified, note: note.trim() || undefined });
      await handleReload();
      setSuccess(verified ? 'Verified seller status granted.' : 'Verified seller status removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update verified seller status');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Verified Sellers</h1>
        <p className="text-sm text-slate-600">Review candidates, inspect complete seller history, and approve or remove RentVerse verified seller status.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === item ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            {item === 'candidate' ? 'Candidate' : 'Verified Sellers'}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px] lg:grid-cols-[1fr_260px]">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone, city, or KYC"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>

        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <SortAsc className="h-4 w-4 text-slate-400" />
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="w-full bg-transparent text-sm outline-none">
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div> : null}
      {isLoading ? <div className="text-sm text-slate-600">Loading verified sellers...</div> : null}

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-3">
          {rows.map((item) => (
            <SellerRow key={item.profile.id} item={item} active={selectedId === item.profile.id} onSelect={handleSelect} />
          ))}
          {!isLoading && rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No sellers found for this view.
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selectedProfile || !selectedStats ? (
            <p className="text-sm text-slate-500">Select a seller card to inspect full details.</p>
          ) : isDetailLoading ? (
            <p className="text-sm text-slate-500">Loading seller details...</p>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl bg-slate-950 p-5 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <ShieldCheck className="h-4 w-4 text-amber-300" />
                      {selectedProfile.verifiedSeller ? 'Verified seller' : 'Candidate'}
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold">{selectedProfile.name}</h2>
                    <p className="mt-1 text-sm text-slate-300">{selectedProfile.email} • {selectedProfile.phone || 'No phone'} • {selectedProfile.city || 'No city'}</p>
                  </div>
                  {selectedProfile.verifiedSeller ? (
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">Verified seller active</span>
                  ) : (
                    <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300">Eligible candidate</span>
                  )}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {metricCard('Orders', selectedStats.totalOrders)}
                  {metricCard('Reviews', selectedStats.totalReviews)}
                  {metricCard('Average rating', formatRating(selectedStats.avgRating))}
                  {metricCard('Positive reviews', formatPercent(selectedStats.positivePercentage))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metricCard('Completed orders', selectedStats.completedOrders)}
                {metricCard('Seller sales', selectedStats.sellerSoldCount)}
                {metricCard('Seller rentals', selectedStats.sellerRentedCount)}
                {metricCard('Active listings', selectedStats.activeListings)}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Decision note</p>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="Optional note for the user and audit trail"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isSaving || selectedProfile.verifiedSeller}
                    onClick={() => void handleStatusChange(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <UserCheck className="h-4 w-4" />
                    Mark verified
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || !selectedProfile.verifiedSeller}
                    onClick={() => void handleStatusChange(false)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Remove verified status
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Profile snapshot</h3>
                    <span className="text-xs text-slate-500">Updated {formatDate(selectedProfile.updatedAt)}</span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p><span className="font-semibold">KYC:</span> {selectedProfile.kycStatus}</p>
                    <p><span className="font-semibold">Profile complete:</span> {selectedProfile.profileCompleted ? 'Yes' : 'No'}</p>
                    <p><span className="font-semibold">Moderation:</span> {selectedProfile.moderationStatus}</p>
                    <p><span className="font-semibold">Member since:</span> {formatDate(selectedProfile.createdAt)}</p>
                    <p><span className="font-semibold">Last login:</span> {formatDate(selectedProfile.lastLogin)}</p>
                    <p><span className="font-semibold">Verified seller since:</span> {formatDate(selectedProfile.verifiedSellerAt)}</p>
                    <p><span className="font-semibold">Verified seller note:</span> {selectedProfile.verifiedSellerNote || 'None'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Trend summary</h3>
                    <Star className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p><span className="font-semibold">Buyer purchases:</span> {selectedStats.buyerPurchasedCount}</p>
                    <p><span className="font-semibold">Buyer rentals:</span> {selectedStats.buyerRentedCount}</p>
                    <p><span className="font-semibold">Latest order:</span> {formatDate(selectedStats.latestOrderAt)}</p>
                    <p><span className="font-semibold">Latest review:</span> {formatDate(selectedStats.latestReviewAt)}</p>
                    <p><span className="font-semibold">Latest listing:</span> {formatDate(selectedStats.latestListingAt)}</p>
                    <p><span className="font-semibold">Latest activity:</span> {formatDate(selectedStats.latestActivityAt)}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">Listings</h3>
                    <span className="text-xs text-slate-500">{detail?.listings.length || 0} items</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {detail?.listings.map((listing) => (
                      <a key={listing.id} href={listing.link} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100">
                        <div>
                          <p className="font-medium text-slate-900">{listing.title}</p>
                          <p className="text-xs text-slate-500">{listing.listingType} • {listing.status}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-slate-400" />
                      </a>
                    ))}
                    {detail?.listings.length === 0 ? <p className="text-sm text-slate-500">No listings found.</p> : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">Reviews</h3>
                    <span className="text-xs text-slate-500">{detail?.reviews.length || 0} reviews</span>
                  </div>
                  <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1">
                    {detail?.reviews.map((review) => (
                      <div key={review.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{review.reviewerName}</p>
                          <span className="text-xs text-slate-500">{review.rating}/5</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{review.listingTitle} • {review.reviewTargetRole} • {review.transactionType}</p>
                        {review.title ? <p className="mt-2 font-medium text-slate-800">{review.title}</p> : null}
                        {review.comment ? <p className="mt-1 text-slate-600">{review.comment}</p> : null}
                        <p className="mt-2 text-xs text-slate-500">{formatDate(review.createdAt)}</p>
                      </div>
                    ))}
                    {detail?.reviews.length === 0 ? <p className="text-sm text-slate-500">No public reviews found.</p> : null}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">Recent orders</h3>
                  <span className="text-xs text-slate-500">{detail?.orders.length || 0} orders</span>
                </div>
                <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1">
                  {detail?.orders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{order.listingTitle}</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">{order.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{order.role} • {order.mode} • {formatDate(order.createdAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">Counterparty: {order.counterparty?.name || 'N/A'} ({order.counterparty?.email || 'N/A'})</p>
                    </div>
                  ))}
                  {detail?.orders.length === 0 ? <p className="text-sm text-slate-500">No orders found.</p> : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifiedSellers;

