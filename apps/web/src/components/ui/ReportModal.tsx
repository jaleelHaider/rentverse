import React, { useMemo, useState } from 'react';
import { AlertTriangle, Flag, ShieldAlert, X } from 'lucide-react';

interface ReportModalProps {
  open: boolean;
  targetType: 'listing' | 'user';
  targetLabel: string;
  isSubmitting: boolean;
  error: string;
  success: string;
  onClose: () => void;
  onSubmit: (input: { reasonCode: string; description: string }) => Promise<void>;
}

const LISTING_REASONS = [
  { value: 'fake_listing', label: 'Fake listing' },
  { value: 'misleading_description', label: 'Misleading description' },
  { value: 'prohibited_item', label: 'Prohibited item' },
  { value: 'spam_or_scam', label: 'Spam or scam' },
  { value: 'copyright_or_stolen_content', label: 'Copyright or stolen content' },
  { value: 'wrong_category', label: 'Wrong category' },
  { value: 'offensive_content', label: 'Offensive content' },
  { value: 'other', label: 'Other' },
];

const USER_REASONS = [
  { value: 'fraud_or_scam', label: 'Fraud or scam' },
  { value: 'abusive_behavior', label: 'Abusive behavior' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'fake_identity', label: 'Fake identity' },
  { value: 'payment_issue', label: 'Payment issue' },
  { value: 'spam_behavior', label: 'Spam behavior' },
  { value: 'other', label: 'Other' },
];

const ReportModal: React.FC<ReportModalProps> = ({
  open,
  targetType,
  targetLabel,
  isSubmitting,
  error,
  success,
  onClose,
  onSubmit,
}) => {
  const [reasonCode, setReasonCode] = useState(targetType === 'listing' ? 'fake_listing' : 'fraud_or_scam');
  const [description, setDescription] = useState('');

  const reasons = useMemo(() => (targetType === 'listing' ? LISTING_REASONS : USER_REASONS), [targetType]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Safety Center</p>
              <h3 className="mt-1 text-xl font-bold">Report {targetType === 'listing' ? 'Listing' : 'User'}</h3>
              <p className="mt-1 text-sm text-white/90">Help us review this {targetType} for policy violations.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/30 p-1.5 text-white hover:bg-white/20"
              aria-label="Close report dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Target</p>
            <p className="mt-0.5 break-words">{targetLabel}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800">Reason</label>
            <select
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
            >
              {reasons.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800">Details</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              placeholder="Explain what happened and why this should be reviewed..."
            />
            <p className="mt-1 text-xs text-slate-500">{description.length}/2000 characters</p>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
          ) : null}
          {success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{success}</div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              {targetType === 'listing' ? <Flag className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              <span>False reporting can lead to account action.</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  void onSubmit({ reasonCode, description: description.trim() });
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <AlertTriangle className="h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;

