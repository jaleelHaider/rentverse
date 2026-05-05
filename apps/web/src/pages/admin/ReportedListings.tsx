import React, { useEffect, useState } from 'react';
import {
  applyAdminListingReportAction,
  getAdminReportedListingDetail,
  getAdminReportedListings,
} from '@/api/endpoints/admin';
import type { AdminReportedListingBlock, AdminReportedListingDetailResponse } from '@rentverse/shared';

const statusFilters: Array<'' | 'open' | 'investigating' | 'actioned' | 'dismissed'> = ['', 'open', 'investigating', 'actioned', 'dismissed'];

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const ReportedListings: React.FC = () => {
  const [rows, setRows] = useState<AdminReportedListingBlock[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<AdminReportedListingDetailResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<'' | 'open' | 'investigating' | 'actioned' | 'dismissed'>('');
  const [actionNote, setActionNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);

  const loadQueue = async () => {
    const payload = await getAdminReportedListings(statusFilter || undefined);
    setRows(payload || []);
    if (!selectedId && payload[0]?.targetId) {
      setSelectedId(payload[0].targetId);
    }
  };

  const loadDetail = async (listingId: string) => {
    const payload = await getAdminReportedListingDetail(listingId);
    setDetail(payload);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError('');
      setSuccess('');
      try {
        const payload = await getAdminReportedListings(statusFilter || undefined);
        if (!active) return;
        setRows(payload || []);
        const preferredId = selectedId || payload[0]?.targetId || '';
        setSelectedId(preferredId);
        if (preferredId) {
          const detailPayload = await getAdminReportedListingDetail(preferredId);
          if (!active) return;
          setDetail(detailPayload);
        } else {
          setDetail(null);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load reported listings');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [statusFilter, selectedId]);

  const onSelect = async (listingId: string) => {
    setSelectedId(listingId);
    setError('');
    try {
      await loadDetail(listingId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listing report details');
    }
  };

  const onAction = async (
    actionType: 'pause_listing' | 'activate_listing' | 'delete_listing' | 'dismiss_reports' | 'mark_investigating'
  ) => {
    if (!selectedId) return;
    if (actionType === 'delete_listing' && !window.confirm('Delete this listing permanently?')) {
      return;
    }

    setIsActioning(true);
    setError('');
    setSuccess('');

    try {
      await applyAdminListingReportAction(selectedId, {
        actionType,
        note: actionNote.trim() || undefined,
      });
      await loadQueue();
      await loadDetail(selectedId);
      setSuccess('Moderation action applied.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply moderation action');
    } finally {
      setIsActioning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Reported Listings</h1>
        <p className="text-sm text-slate-600">Review grouped listing reports, inspect reporter feedback, and take moderation action.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Filter by status</label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as '' | 'open' | 'investigating' | 'actioned' | 'dismissed')}
          className="mt-2 block rounded border border-slate-300 px-2 py-1 text-sm"
        >
          {statusFilters.map((item) => (
            <option key={item || 'all'} value={item}>{item || 'all'}</option>
          ))}
        </select>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div> : null}
      {isLoading ? <div className="text-sm text-slate-600">Loading...</div> : null}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-lg border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">Reported Listing Blocks</div>
          <div className="max-h-[580px] overflow-y-auto">
            {rows.map((item) => (
              <button
                key={item.targetId}
                type="button"
                onClick={() => {
                  void onSelect(item.targetId);
                }}
                className={`w-full border-b border-slate-100 p-3 text-left hover:bg-slate-50 ${selectedId === item.targetId ? 'bg-amber-50' : ''}`}
              >
                <p className="text-sm font-semibold text-slate-900">{item.listing?.title || 'Deleted listing'}</p>
                <p className="mt-0.5 text-xs text-slate-600">Reports: {item.totalReports} • Reporters: {item.uniqueReporterCount}</p>
                <p className="mt-0.5 text-xs text-slate-500">Open: {item.openReports} • Investigating: {item.investigatingReports}</p>
                <p className="mt-0.5 text-xs text-slate-500">Latest: {formatDate(item.latestReportAt)}</p>
              </button>
            ))}
            {!isLoading && rows.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No reported listings found.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          {!detail ? (
            <p className="text-sm text-slate-500">Select a listing block to inspect reports and actions.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-base font-semibold text-slate-900">{detail.listing?.title || 'Deleted listing'}</h3>
                <p className="text-xs text-slate-600">Status: {detail.listing?.status || 'deleted'} • Type: {detail.listing?.listingType || 'N/A'} • Category: {detail.listing?.category || 'N/A'}</p>
                <p className="mt-0.5 text-xs text-slate-600">Owner: {detail.listing?.ownerName || 'N/A'} ({detail.listing?.ownerEmail || 'N/A'})</p>
                {detail.listing?.link ? (
                  <a href={detail.listing.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-blue-700 underline hover:text-blue-900">
                    Open listing page
                  </a>
                ) : null}
              </div>

              <div className="grid gap-2 rounded-lg border border-slate-200 p-3 text-xs text-slate-700 sm:grid-cols-3">
                <p><span className="font-semibold">Total:</span> {detail.stats.totalReports}</p>
                <p><span className="font-semibold">Unique reporters:</span> {detail.stats.uniqueReporterCount}</p>
                <p><span className="font-semibold">Open:</span> {detail.stats.openReports}</p>
                <p><span className="font-semibold">Investigating:</span> {detail.stats.investigatingReports}</p>
                <p><span className="font-semibold">Actioned:</span> {detail.stats.actionedReports}</p>
                <p><span className="font-semibold">Dismissed:</span> {detail.stats.dismissedReports}</p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-700">Counter Steps</p>
                <textarea
                  value={actionNote}
                  onChange={(event) => setActionNote(event.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  placeholder="Internal moderation note (optional)"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('mark_investigating'); }} className="rounded border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60">Mark Investigating</button>
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('pause_listing'); }} className="rounded border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60">Pause Listing</button>
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('activate_listing'); }} className="rounded border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">Activate Listing</button>
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('dismiss_reports'); }} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Dismiss Reports</button>
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('delete_listing'); }} className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Delete Listing</button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-700">Reporter Statements ({detail.reports.length})</p>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {detail.reports.map((report) => (
                    <div key={report.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{report.reporterName} ({report.reporterEmail || 'No email'})</p>
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-[11px] uppercase">{report.status}</span>
                      </div>
                      <p className="mt-1"><span className="font-semibold">Reason:</span> {report.reasonCode}</p>
                      {report.description ? <p className="mt-1">{report.description}</p> : null}
                      <p className="mt-1 text-[11px] text-slate-500">Submitted: {formatDate(report.createdAt)}</p>
                    </div>
                  ))}
                  {detail.reports.length === 0 ? <p className="text-xs text-slate-500">No reporter statements available.</p> : null}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-700">Moderation Actions ({detail.actions.length})</p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {detail.actions.map((action) => (
                    <div key={action.id} className="rounded border border-slate-200 bg-white p-2 text-xs text-slate-700">
                      <p className="font-semibold">{action.actionType}</p>
                      {action.actionNote ? <p className="mt-1">{action.actionNote}</p> : null}
                      <p className="mt-1 text-[11px] text-slate-500">By {action.createdByName || action.createdByAdminUserId} • {formatDate(action.createdAt)}</p>
                    </div>
                  ))}
                  {detail.actions.length === 0 ? <p className="text-xs text-slate-500">No moderation actions recorded yet.</p> : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportedListings;

