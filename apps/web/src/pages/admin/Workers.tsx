import React, { useEffect, useState } from 'react';
import { createAdminWorker, getAdminWorkers, updateAdminWorker } from '@/api/endpoints/admin';

const roles = ['admin', 'manager', 'moderator', 'kyc_reviewer', 'finance', 'support'];

const Workers: React.FC = () => {
  const [workers, setWorkers] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'support' });

  const load = async () => {
    const payload = await getAdminWorkers();
    setWorkers(payload);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const payload = await getAdminWorkers();
        if (!active) return;
        setWorkers(payload);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load workers');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await createAdminWorker(form);
      setForm({ email: '', password: '', fullName: '', role: 'support' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create worker');
    }
  };

  const changeStatus = async (userId: string, status: string) => {
    try {
      await updateAdminWorker(userId, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update worker');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Worker Accounts</h1>
      <p className="text-sm text-slate-600">Create and manage internal admin accounts with controlled role hierarchy.</p>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-5">
        <input className="rounded border border-slate-300 px-2 py-2" placeholder="Full name" value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} required />
        <input className="rounded border border-slate-300 px-2 py-2" placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} type="email" required />
        <input className="rounded border border-slate-300 px-2 py-2" placeholder="Temporary password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} required />
        <select className="rounded border border-slate-300 px-2 py-2" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        <button className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800" type="submit">Create Worker</button>
      </form>

      {isLoading ? <div className="text-sm text-slate-600">Loading workers...</div> : null}

      <div className="overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Role</th><th className="p-2">Status</th><th className="p-2">Action</th></tr>
          </thead>
          <tbody>
            {workers.map((row) => (
              <tr key={String(row.userId)} className="border-t border-slate-100">
                <td className="p-2">{String(row.fullName || '-')}</td>
                <td className="p-2">{String(row.email || '-')}</td>
                <td className="p-2">{String(row.role || '-')}</td>
                <td className="p-2">{String(row.status || '-')}</td>
                <td className="p-2">
                  <button
                    className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    onClick={() => void changeStatus(String(row.userId), String(row.status) === 'active' ? 'suspended' : 'active')}
                  >
                    {String(row.status) === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Workers;

