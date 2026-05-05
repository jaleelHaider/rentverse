import React, { useEffect, useState } from 'react';
import {
  applyAdminUserReportAction,
  getAdminReportedUserDetail,
  getAdminReportedUsers,
} from '@/api/endpoints/admin';
import type { AdminReportedUserBlock, AdminReportedUserDetailResponse } from '@rentverse/shared';

const statusFilters: Array<'' | 'open' | 'investigating' | 'actioned' | 'dismissed'> = ['', 'open', 'investigating', 'actioned', 'dismissed'];

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const ReportedUsers: React.FC = () => {
  const [rows, setRows] = useState<AdminReportedUserBlock[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<AdminReportedUserDetailResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<'' | 'open' | 'investigating' | 'actioned' | 'dismissed'>('');
  const [actionNote, setActionNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);

  const loadQueue = async () => {
    const payload = await getAdminReportedUsers(statusFilter || undefined);
    setRows(payload || []);
    if (!selectedId && payload[0]?.targetId) {
      setSelectedId(payload[0].targetId);
    }
  };

  const loadDetail = async (userId: string) => {
    const payload = await getAdminReportedUserDetail(userId);
    setDetail(payload);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError('');
      setSuccess('');
      try {
        const payload = await getAdminReportedUsers(statusFilter || undefined);
        if (!active) return;
        setRows(payload || []);
        const preferredId = selectedId || payload[0]?.targetId || '';
        setSelectedId(preferredId);
        if (preferredId) {
          const detailPayload = await getAdminReportedUserDetail(preferredId);
          if (!active) return;
          setDetail(detailPayload);
        } else {
          setDetail(null);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load reported users');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [statusFilter, selectedId]);

  const onSelect = async (userId: string) => {
    setSelectedId(userId);
    setError('');
    try {
      await loadDetail(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user report details');
    }
  };

  const onAction = async (
    actionType:
      | 'warn_user'
      | 'restrict_listing_activity'
      | 'restrict_messaging'
      | 'restrict_order_activity'
      | 'restrict_all_activity'
      | 'suspend_user'
      | 'clear_user_restrictions'
      | 'dismiss_reports'
      | 'mark_investigating'
  ) => {
    if (!selectedId) return;

    setIsActioning(true);
    setError('');
    setSuccess('');

    try {
      await applyAdminUserReportAction(selectedId, {
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
        <h1 className="text-2xl font-semibold">Reported Users</h1>
        <p className="text-sm text-slate-600">Review grouped user reports, inspect allegations, and apply account-level moderation actions.</p>
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
          <div className="border-b border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">Reported User Blocks</div>
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
                <p className="text-sm font-semibold text-slate-900">{item.user?.name || 'Unknown user'}</p>
                <p className="mt-0.5 text-xs text-slate-600">{item.user?.email || 'No email'} • Moderation: {item.user?.moderationStatus || 'N/A'}</p>
                <p className="mt-0.5 text-xs text-slate-600">Reports: {item.totalReports} • Reporters: {item.uniqueReporterCount}</p>
                <p className="mt-0.5 text-xs text-slate-500">Open: {item.openReports} • Investigating: {item.investigatingReports}</p>
                <p className="mt-0.5 text-xs text-slate-500">Latest: {formatDate(item.latestReportAt)}</p>
              </button>
            ))}
            {!isLoading && rows.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No reported users found.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          {!detail ? (
            <p className="text-sm text-slate-500">Select a user block to inspect reports and actions.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-base font-semibold text-slate-900">{detail.user?.name || 'Unknown user'}</h3>
                <p className="text-xs text-slate-600">Email: {detail.user?.email || 'N/A'} • Phone: {detail.user?.phone || 'N/A'} • City: {detail.user?.city || 'N/A'}</p>
                <p className="mt-0.5 text-xs text-slate-600">KYC: {detail.user?.kycStatus || 'N/A'} • Moderation: {detail.user?.moderationStatus || 'N/A'}</p>
                <p className="mt-0.5 text-xs text-slate-600">Moderated at: {formatDate(detail.user?.moderatedAt)} • Note: {detail.user?.moderationNote || 'N/A'}</p>
                {detail.user?.profileLink ? (
                  <a href={detail.user.profileLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-blue-700 underline hover:text-blue-900">
                    Open public profile
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
                  placeholder="Admin note for user notification (clear reason and next steps)"
                />
                <p className="mt-1 text-[11px] text-slate-500">This note is sent to the user in a moderation notification.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('mark_investigating'); }} className="rounded border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60">Mark Investigating</button>
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('warn_user'); }} className="rounded border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60">Warn User</button>
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('restrict_listing_activity'); }} className="rounded border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60">Restrict Listings</button>
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('restrict_messaging'); }} className="rounded border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60">Restrict Messaging</button>
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('restrict_order_activity'); }} className="rounded border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60">Restrict Orders</button>
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('restrict_all_activity'); }} className="rounded border border-orange-400 px-3 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-100 disabled:opacity-60">Restrict All Activities</button>
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('suspend_user'); }} className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Suspend User</button>
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('clear_user_restrictions'); }} className="rounded border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">Clear Restrictions</button>
                  <button type="button" disabled={isActioning} onClick={() => { void onAction('dismiss_reports'); }} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Dismiss Reports</button>
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

export default ReportedUsers;

