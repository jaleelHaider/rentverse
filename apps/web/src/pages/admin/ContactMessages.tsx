import React, { useEffect, useMemo, useState } from 'react';
import { getAdminContactMessages, updateAdminContactMessageStatus } from '@/api/endpoints/admin';

type ContactStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  source_page: string;
  status: ContactStatus;
  admin_notes: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

const statusOptions: Array<{ value: ContactStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const prettySubject = (subject: string): string => {
  const map: Record<string, string> = {
    general: 'General Inquiry',
    technical: 'Technical Support',
    billing: 'Billing & Payments',
    safety: 'Safety & Trust',
    business: 'Business Partnership',
    media: 'Media & Press',
  };
  return map[subject] || subject;
};

const ContactMessages: React.FC = () => {
  const [rows, setRows] = useState<ContactMessageRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<ContactStatus>('new');
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    try {
      setIsLoading(true);
      setError('');
      const payload = await getAdminContactMessages({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      setRows(payload as unknown as ContactMessageRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact messages');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        acc[row.status] += 1;
        return acc;
      },
      { total: 0, new: 0, in_progress: 0, resolved: 0, closed: 0 } as Record<'total' | ContactStatus, number>
    );
  }, [rows]);

  const beginEdit = (row: ContactMessageRow) => {
    setEditingId(row.id);
    setNotesDraft(row.admin_notes || '');
    setStatusDraft(row.status);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      setIsSaving(true);
      const updated = (await updateAdminContactMessageStatus(editingId, {
        status: statusDraft,
        adminNotes: notesDraft,
      })) as unknown as ContactMessageRow;

      setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setEditingId(null);
      setNotesDraft('');
      setStatusDraft('new');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact message');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Contact Messages</h1>
        <p className="mt-1 text-sm text-slate-200">View and manage submissions from the public Contact page.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase text-slate-500">New</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.new}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase text-slate-500">In Progress</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.in_progress}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase text-slate-500">Resolved</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.resolved}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs uppercase text-slate-500">Closed</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.closed}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700" htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="flex w-full gap-2 md:w-auto">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, or message"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm md:w-80"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Search
          </button>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading contact messages...</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const isEditing = editingId === row.id;
            return (
              <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{new Date(row.created_at).toLocaleString()}</p>
                    <h2 className="text-lg font-semibold text-slate-900">{row.name}</h2>
                    <p className="text-sm text-slate-700">{row.email}{row.phone ? ` | ${row.phone}` : ''}</p>
                    <p className="mt-1 text-sm text-slate-700">
                      <span className="font-medium">Department:</span> {prettySubject(row.subject)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
                      {row.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => beginEdit(row)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Manage
                    </button>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{row.message}</p>

                {isEditing ? (
                  <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">Status</label>
                      <select
                        value={statusDraft}
                        onChange={(event) => setStatusDraft(event.target.value as ContactStatus)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">Admin Notes</label>
                      <textarea
                        rows={4}
                        value={notesDraft}
                        onChange={(event) => setNotesDraft(event.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                        placeholder="Internal notes for this inquiry"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-white"
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEdit()}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : row.admin_notes ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Admin Notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{row.admin_notes}</p>
                  </div>
                ) : null}
              </div>
            );
          })}

          {rows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No contact messages found for current filters.</div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ContactMessages;

