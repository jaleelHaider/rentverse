import React, { useEffect, useState } from 'react';
import { getAdminKyc, recheckAdminKycAi, reviewAdminKyc } from '@/api/endpoints/admin';

const KycReview: React.FC = () => {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [error, setError] = useState('');

  const load = async () => {
    const payload = await getAdminKyc(statusFilter || undefined);
    setRows(payload);
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const payload = await getAdminKyc(statusFilter || undefined);
        if (!active) return;
        setRows(payload);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load KYC records');
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [statusFilter]);

  const onReview = async (userId: string, status: 'pending' | 'verified' | 'rejected') => {
    const reason = status === 'rejected'
      ? (window.prompt('Enter rejection reason (required):') || '').trim()
      : (window.prompt('Review note (optional):') || '').trim();

    if (status === 'rejected' && !reason) {
      setError('Rejection reason is required.');
      return;
    }

    try {
      await reviewAdminKyc(userId, { status, reviewMessage: reason, overrideAi: true, overrideReason: reason || undefined });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review KYC');
    }
  };

  const onRecheck = async (userId: string) => {
    try {
      await recheckAdminKycAi(userId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rerun AI check');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">KYC Verification</h1>
          <p className="text-sm text-slate-600">Review AI verdicts, inspect ID images, and apply manual override with full audit trail.</p>
        </div>
        <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={String(row.userId)} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{String((row.profile as Record<string, unknown> | null)?.email || row.userId)}</p>
                <p className="text-xs text-slate-600">
                  Status: {String(row.status || '-')} | AI: {String(row.analysisVerdict || '-')} ({Math.round(Number(row.analysisScore || 0) * 100)}%)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" onClick={() => void onRecheck(String(row.userId))}>Re-run AI Scan</button>
                <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50" onClick={() => void onReview(String(row.userId), 'verified')}>Accept</button>
                <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50" onClick={() => void onReview(String(row.userId), 'rejected')}>Reject with Reason</button>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-600">
              AI confidence: <span className="font-semibold text-slate-900">{Math.round(Number(row.analysisScore || 0) * 100)}%</span>
            </div>
            {row.reviewMessage ? (
              <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Reviewer note: {String(row.reviewMessage)}
              </div>
            ) : null}
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <a href={String(row.frontImageUrl || '#')} target="_blank" rel="noreferrer" className="rounded border border-slate-200 p-2 text-xs text-blue-700 hover:bg-slate-50">
                View front image
              </a>
              <a href={String(row.backImageUrl || '#')} target="_blank" rel="noreferrer" className="rounded border border-slate-200 p-2 text-xs text-blue-700 hover:bg-slate-50">
                View back image
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KycReview;

