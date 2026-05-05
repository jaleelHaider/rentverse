import React, { useEffect, useState } from 'react';
import { getAdminFraudDetections, reviewAdminFraudDetection } from '@/api/endpoints/admin';
import type { AdminFraudActivity, AdminFraudStats } from '@rentverse/shared';

const AIDetectedFrauds: React.FC = () => {
  const [activities, setActivities] = useState<AdminFraudActivity[]>([]);
  const [stats, setStats] = useState<AdminFraudStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    status: 'unreviewed' as const,
    entityType: '' as const,
    riskLevel: '' as const,
    page: 1,
    pageSize: 20,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState({ adminNotes: '', action: 'none' as const });

  useEffect(() => {
    loadFrauds();
  }, [filters]);

  const loadFrauds = async () => {
    setIsLoading(true);
    setError('');
    try {
      const payload = await getAdminFraudDetections({
        status: filters.status || undefined,
        entityType: filters.entityType || undefined,
        riskLevel: filters.riskLevel || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      });
      setActivities(payload.activities || []);
      setStats(payload.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fraud detections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (activity: AdminFraudActivity) => {
    if (!reviewingId) return;

    try {
      await reviewAdminFraudDetection(reviewingId, {
        status: 'reviewed',
        adminNotes: reviewData.adminNotes,
        action: reviewData.action !== 'none' ? reviewData.action : undefined,
      });

      setReviewingId(null);
      setReviewData({ adminNotes: '', action: 'none' });
      await loadFrauds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review fraud');
    }
  };

  const getRiskColor = (score: number): string => {
    if (score >= 80) return 'bg-red-100 text-red-900 border-red-300';
    if (score >= 60) return 'bg-orange-100 text-orange-900 border-orange-300';
    if (score >= 40) return 'bg-yellow-100 text-yellow-900 border-yellow-300';
    return 'bg-blue-100 text-blue-900 border-blue-300';
  };

  const getRiskLabel = (score: number): string => {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  };

  if (isLoading) {
    return <div className="text-sm text-slate-600">Loading fraud detections...</div>;
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-5 py-6 text-white shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI Detected Frauds</h1>
        <p className="mt-1 text-sm text-slate-200">Monitor and manage suspicious activities detected by AI.</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Critical Risk</p>
            <p className="mt-2 text-3xl font-semibold text-red-600">{stats.critical_risk}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">High Risk</p>
            <p className="mt-2 text-3xl font-semibold text-orange-600">{stats.high_risk}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Medium Risk</p>
            <p className="mt-2 text-3xl font-semibold text-yellow-600">{stats.medium_risk}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Low Risk</p>
            <p className="mt-2 text-3xl font-semibold text-blue-600">{stats.low_risk}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Unreviewed</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.unreviewed_count}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Users Flagged</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.users_flagged}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any, page: 1 })}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="unreviewed">Unreviewed</option>
              <option value="reviewed">Reviewed</option>
              <option value="flagged">Flagged</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Entity Type</label>
            <select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value as any, page: 1 })}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="listing">Listing</option>
              <option value="user">User</option>
              <option value="order">Order</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Risk Level</label>
            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value as any, page: 1 })}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All Levels</option>
              <option value="critical">Critical (80+)</option>
              <option value="high">High (60-79)</option>
              <option value="medium">Medium (40-59)</option>
              <option value="low">Low (&lt;40)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Page Size</label>
            <select
              value={filters.pageSize}
              onChange={(e) => setFilters({ ...filters, pageSize: Number(e.target.value) as any })}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-slate-600">No fraud detections found.</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`rounded-xl border-2 p-4 transition-all ${getRiskColor(activity.riskScore)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="inline-block rounded-full bg-red-200 px-3 py-1 text-sm font-semibold">
                      {getRiskLabel(activity.riskScore)}
                    </span>
                    <span className="text-xs font-medium">Risk Score: {activity.riskScore.toFixed(0)}</span>
                    <span className="text-xs font-medium">{activity.entityType.toUpperCase()}</span>
                  </div>

                  <h3 className="mt-3 font-semibold">{activity.entityTitle || activity.entityId}</h3>

                  <div className="mt-2 flex flex-wrap gap-4 text-xs">
                    <div>
                      <p className="font-medium">User:</p>
                      <p>
                        {activity.userName} ({activity.userEmail})
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Detected:</p>
                      <p>{new Date(activity.detectedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium">Status:</p>
                      <p className="capitalize">{activity.status}</p>
                    </div>
                  </div>

                  {activity.mainFlag && (
                    <div className="mt-3 rounded-lg bg-white/40 p-3">
                      <p className="font-semibold text-sm">{activity.mainFlag.title}</p>
                      <p className="text-xs mt-1">{activity.mainFlag.explanation}</p>
                      <p className="text-xs font-medium mt-2">Why suspicious: {activity.mainFlag.why_suspicious}</p>
                      <p className="text-xs mt-1">Recommendation: {activity.mainFlag.recommended_action}</p>
                    </div>
                  )}

                  {activity.flagCount > 1 && (
                    <p className="mt-2 text-xs font-medium">+{activity.flagCount - 1} more fraud indicators</p>
                  )}

                  <p className="mt-3 text-xs italic">{activity.summary}</p>
                </div>

                <button
                  onClick={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
                  className="flex-shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-medium shadow hover:bg-slate-100"
                >
                  {expandedId === activity.id ? 'Hide' : 'Review'}
                </button>
              </div>

              {expandedId === activity.id && (
                <div className="mt-4 space-y-4 border-t border-white/40 pt-4">
                  {reviewingId === activity.id ? (
                    <div className="space-y-3 rounded-lg bg-white/40 p-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Action</label>
                        <select
                          value={reviewData.action}
                          onChange={(e) =>
                            setReviewData({ ...reviewData, action: e.target.value as any })
                          }
                          className="w-full rounded border border-white/40 px-3 py-2 text-sm"
                        >
                          <option value="none">No Action</option>
                          <option value="suspend_user">Suspend User</option>
                          <option value="remove_listing">Remove Listing</option>
                          <option value="mark_suspicious">Mark User Suspicious</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Admin Notes</label>
                        <textarea
                          value={reviewData.adminNotes}
                          onChange={(e) =>
                            setReviewData({ ...reviewData, adminNotes: e.target.value })
                          }
                          placeholder="Document your decision..."
                          className="w-full rounded border border-white/40 px-3 py-2 text-sm"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReview(activity)}
                          className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        >
                          Submit Review
                        </button>
                        <button
                          onClick={() => {
                            setReviewingId(null);
                            setReviewData({ adminNotes: '', action: 'none' });
                          }}
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReviewingId(activity.id)}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Start Review
                    </button>
                  )}

                  {activity.adminNotes && (
                    <div className="rounded-lg bg-white/40 p-3">
                      <p className="text-xs font-medium">Previous Notes:</p>
                      <p className="text-xs mt-1">{activity.adminNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {activities.length > 0 && (
        <div className="flex justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <button
            onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
            disabled={filters.page === 1}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="flex items-center text-sm font-medium">Page {filters.page}</span>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={activities.length < filters.pageSize}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AIDetectedFrauds;

