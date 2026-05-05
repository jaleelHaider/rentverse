import React, { useEffect, useState } from 'react';
import { getAdminAudit } from '@/api/endpoints/admin';

const AuditLogs: React.FC = () => {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void getAdminAudit()
      .then((payload) => setRows(payload))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load audit logs'));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit Logs</h1>
      <p className="text-sm text-slate-600">Immutable record of admin actions, AI overrides, and worker operations.</p>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr><th className="p-2">Time</th><th className="p-2">Actor</th><th className="p-2">Action</th><th className="p-2">Entity</th><th className="p-2">Metadata</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)} className="border-t border-slate-100 align-top">
                <td className="p-2">{String(row.created_at || '').replace('T', ' ').slice(0, 19)}</td>
                <td className="p-2">{String(row.actor_role || '-')} ({String(row.actor_user_id || '-').slice(0, 8)}...)</td>
                <td className="p-2">{String(row.action || '-')}</td>
                <td className="p-2">{String(row.entity_type || '-')} {String(row.entity_id || '')}</td>
                <td className="p-2"><pre className="whitespace-pre-wrap text-xs text-slate-700">{JSON.stringify(row.metadata || {}, null, 2)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogs;

