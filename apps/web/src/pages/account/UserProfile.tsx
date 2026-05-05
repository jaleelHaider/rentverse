import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Star, ShieldCheck, Search, Filter, Package, ShoppingBag, CalendarDays, MessageCircle, Flag } from 'lucide-react';
import {
  fetchUserProfileListings,
  fetchUserProfileReviews,
  fetchUserProfileSummary,
  type ProfileListingCard,
  type UserReview,
} from '@/api/endpoints/profiles';
import { useChatNavigation } from '@/hooks/useChatNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { submitUserReport } from '@/api/endpoints/reports';
import ReportModal from '@/components/ui/ReportModal';

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
};

const RatingStars: React.FC<{ value: number; size?: number }> = ({ value, size = 16 }) => {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          size={size}
          className={index <= Math.round(value) ? 'text-amber-400 fill-current' : 'text-gray-300'}
        />
      ))}
    </div>
  );
};

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { openListingChat, isStartingChat } = useChatNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchUserProfileSummary>> | null>(null);
  const [listings, setListings] = useState<ProfileListingCard[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [transactionType, setTransactionType] = useState<'all' | 'sold' | 'rented'>('all');
  const [targetRole, setTargetRole] = useState<'all' | 'seller' | 'renter'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadBase = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryPayload, listingPayload] = await Promise.all([
          fetchUserProfileSummary(userId),
          fetchUserProfileListings(userId, 'active'),
        ]);
        setSummary(summaryPayload);
        setListings(listingPayload.listings || []);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load user profile.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadBase();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetchUserProfileReviews(userId, {
          page: 1,
          limit: 20,
          search,
          sort,
          rating,
          transactionType,
          targetRole,
        });
        setReviews(response.reviews || []);
        setTotalReviews(response.pagination.total || 0);
      } catch {
        setReviews([]);
        setTotalReviews(0);
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [userId, search, sort, rating, transactionType, targetRole]);

  const positiveReviewText = useMemo(() => {
    if (!summary) {
      return '0% positive reviews';
    }
    return `${summary.stats.positivePercentage}% positive reviews`;
  }, [summary]);

  const contactListingId = listings[0]?.id || '';
  const isOwnProfile = Boolean(currentUser && userId && currentUser.id === userId);

  const handleSubmitUserReport = async (input: { reasonCode: string; description: string }) => {
    if (!userId) return;
    if (!currentUser) return;

    setReportSubmitting(true);
    setReportError('');
    setReportSuccess('');
    try {
      await submitUserReport({
        userId,
        reasonCode: input.reasonCode,
        description: input.description || undefined,
      });
      setReportSuccess('Report submitted successfully. Our moderation team will review it.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit user report.';
      setReportError(message);
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="container-custom py-12">
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-600">
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (!userId || !summary || error) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="container-custom py-12">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            {error || 'Profile not found.'}
          </div>
        </div>
      </div>
    );
  }

  const memberSinceYear = new Date(summary.profile.memberSince).getFullYear();
  const breakdown = summary.stats.ratingBreakdown;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 via-stone-50 to-white">
      <div className="container-custom py-8 space-y-8">
        <section className="rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-blue-900 via-sky-800 to-cyan-700 p-8 text-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                  {summary.profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold">{summary.profile.name}</h1>
                    {summary.profile.kycVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                        <ShieldCheck className="h-4 w-4" />
                        KYC Verified
                      </span>
                    ) : null}
                    {summary.profile.verifiedSeller ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                        <ShieldCheck className="h-4 w-4" />
                        RentVerse Verified Seller
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sky-100">{summary.profile.city || 'Location not set'} • Member since {memberSinceYear || 'N/A'}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-sm text-sky-100">Seller rating</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-3xl font-bold">{summary.stats.avgRating.toFixed(1)}</span>
                  <RatingStars value={summary.stats.avgRating} />
                </div>
                <div className="text-sm text-sky-100">{summary.stats.totalReviews} total reviews • {positiveReviewText}</div>
              </div>
            </div>

            <div className="mt-0.5">
              <div className="text-lg md:text-xl font-extrabold leading-tight text-sky-100">About</div>
              <p className="mt-1 text-sm text-white/95">
                {summary.profile.description?.trim() || 'No profile description added yet.'}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (contactListingId) {
                    void openListingChat({ listingId: contactListingId, sellerId: summary.profile.id });
                  }
                }}
                disabled={isOwnProfile || !contactListingId || isStartingChat}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageCircle className="h-4 w-4" />
                {isOwnProfile ? 'Your profile' : isStartingChat ? 'Opening chat...' : 'Contact seller'}
              </button>
              {!contactListingId && !isOwnProfile ? (
                <span className="text-sm text-sky-100">This seller has no active listings to start a chat from.</span>
              ) : null}
              {!isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      navigate('/?auth=login');
                      return;
                    }
                    setReportError('');
                    setReportSuccess('');
                    setReportOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/25"
                >
                  <Flag className="h-4 w-4" />
                  Report user
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-4">
            <div className="rounded-xl border border-stone-200 p-4">
              <div className="text-xs uppercase tracking-wide text-stone-500">Sold items</div>
              <div className="mt-1 text-3xl font-bold text-stone-900">{summary.stats.sellerSoldCount}</div>
            </div>
            <div className="rounded-xl border border-stone-200 p-4">
              <div className="text-xs uppercase tracking-wide text-stone-500">Rented items</div>
              <div className="mt-1 text-3xl font-bold text-stone-900">{summary.stats.sellerRentedCount}</div>
            </div>
            <div className="rounded-xl border border-stone-200 p-4">
              <div className="text-xs uppercase tracking-wide text-stone-500">Active listings</div>
              <div className="mt-1 text-3xl font-bold text-stone-900">{summary.stats.activeListings}</div>
            </div>
            <div className="rounded-xl border border-stone-200 p-4">
              <div className="text-xs uppercase tracking-wide text-stone-500">All transactions</div>
              <div className="mt-1 text-3xl font-bold text-stone-900">{summary.stats.totalTransactions}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-bold text-stone-900">Rating breakdown</h2>
            <p className="text-sm text-stone-500">Based on seller and renter reviews.</p>
            <div className="mt-4 space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = breakdown[star] || 0;
                const width = summary.stats.totalReviews ? (count / summary.stats.totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <div className="w-12 text-sm text-stone-700">{star} star</div>
                    <div className="h-2 flex-1 rounded-full bg-stone-200">
                      <div className="h-2 rounded-full bg-amber-400" style={{ width: `${width}%` }} />
                    </div>
                    <div className="w-8 text-right text-sm text-stone-600">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">Active listings</h2>
              <div className="text-sm text-stone-500">{listings.length} active</div>
            </div>

            {listings.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
                No active listings right now.
              </div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {listings.map((listing) => (
                  <Link
                    key={listing.id}
                    to={`/listing/${listing.id}`}
                    className="group rounded-xl border border-stone-200 p-3 hover:border-sky-500 hover:shadow-sm"
                  >
                    <div className="aspect-video overflow-hidden rounded-lg bg-stone-100">
                      {listing.imageUrl ? (
                        <img src={listing.imageUrl} alt={listing.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-stone-400">No image</div>
                      )}
                    </div>
                    <div className="mt-3 line-clamp-2 font-semibold text-stone-900">{listing.title}</div>
                    <div className="mt-1 text-sm text-stone-500">
                      {listing.location.area || listing.location.city}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-stone-700">
                        {listing.listingType === 'sell' ? 'Buy' : listing.listingType === 'rent' ? 'Rent' : 'Rent/Buy'}
                      </span>
                      <span className="font-semibold text-stone-900">
                        {listing.price.buy ? `PKR ${listing.price.buy.toLocaleString()}` : `PKR ${(listing.price.rentDaily || 0).toLocaleString()}/day`}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">All reviews</h2>
              <p className="text-sm text-stone-500">Search and filter by stars, transaction type, and role.</p>
            </div>
            <div className="text-sm text-stone-600">{totalReviews} results</div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <label className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search review text, reviewer, product"
                className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:outline-none"
              />
            </label>

            <select
              value={String(rating)}
              onChange={(event) => setRating(Number(event.target.value) as 0 | 1 | 2 | 3 | 4 | 5)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            >
              <option value="0">All stars</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>

            <select
              value={transactionType}
              onChange={(event) => setTransactionType(event.target.value as 'all' | 'sold' | 'rented')}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            >
              <option value="all">All transactions</option>
              <option value="sold">Sold items only</option>
              <option value="rented">Rented items only</option>
            </select>

            <select
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value as 'all' | 'seller' | 'renter')}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            >
              <option value="all">All roles</option>
              <option value="seller">Seller reviews</option>
              <option value="renter">Renter reviews</option>
            </select>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Filter className="h-4 w-4 text-stone-500" />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as 'newest' | 'oldest' | 'highest' | 'lowest')}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest rating</option>
              <option value="lowest">Lowest rating</option>
            </select>
          </div>

          <div className="mt-6 space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
                No reviews match your filters.
              </div>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-stone-200 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <RatingStars value={review.rating} />
                        <span className="text-sm font-semibold text-stone-800">{review.rating.toFixed(1)}</span>
                      </div>
                      <h3 className="mt-1 text-base font-semibold text-stone-900">{review.title || 'Review'}</h3>
                      <p className="mt-2 text-sm text-stone-700 whitespace-pre-line">{review.comment || 'No written feedback.'}</p>
                    </div>
                    <div className="text-sm text-stone-500 md:text-right">
                      <div>{formatDate(review.createdAt)}</div>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-700">
                        {review.transactionType === 'sold' ? <ShoppingBag size={12} /> : <Package size={12} />}
                        {review.transactionType}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-xs text-sky-700">
                        <CalendarDays size={12} />
                        {review.reviewTargetRole}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-stone-200 pt-3 text-xs text-stone-500">
                    By {review.reviewerName} • Product: {review.listingTitle}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <ReportModal
        open={reportOpen}
        targetType="user"
        targetLabel={summary.profile.name}
        isSubmitting={reportSubmitting}
        error={reportError}
        success={reportSuccess}
        onClose={() => {
          setReportOpen(false);
          setReportError('');
          setReportSuccess('');
        }}
        onSubmit={handleSubmitUserReport}
      />
    </div>
  );
};

export default UserProfile;

