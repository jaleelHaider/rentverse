import React, { useEffect, useState } from 'react';
import { deleteAdminListing, getAdminListings, updateAdminListing } from '@/api/endpoints/admin';

const statuses = ['draft', 'active', 'paused', 'archived', 'pending', 'sold', 'rented'];

const Listings: React.FC = () => {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  const load = async () => setRows(await getAdminListings());

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const payload = await getAdminListings();
        if (!active) return;
        setRows(payload);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load listings');
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  const onStatus = async (id: string, status: string) => {
    try {
      await updateAdminListing(id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update listing');
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this listing permanently?')) return;
    try {
      await deleteAdminListing(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete listing');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Listing Moderation</h1>
      <p className="text-sm text-slate-600">Moderate listing visibility and remove policy-violating content.</p>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr><th className="p-2">Title</th><th className="p-2">Owner</th><th className="p-2">Type</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)} className="border-t border-slate-100">
                <td className="p-2">{String(row.title || '-')}</td>
                <td className="p-2">{String(row.owner_name || row.owner_email || '-')}</td>
                <td className="p-2">{String(row.listing_type || '-')}</td>
                <td className="p-2">
                  <select className="rounded border border-slate-300 px-2 py-1" value={String(row.status || 'active')} onChange={(e) => void onStatus(String(row.id), e.target.value)}>
                    {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50" onClick={() => void onDelete(String(row.id))}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Listings;

