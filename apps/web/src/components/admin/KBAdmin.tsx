import React, { useState } from 'react';
import { triggerReseed } from '@/api/ai/admin';

export const KBAdmin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleReseed = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await triggerReseed();
      setMessage(res?.message || 'Seeding triggered');
    } catch (err: any) {
      setMessage(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow-sm">
      <h3 className="text-lg font-medium mb-2">Knowledge Base Admin</h3>
      <p className="text-sm text-muted mb-4">Trigger embedding reseed or manage KB entries.</p>
      <button
        className="px-3 py-2 bg-blue-600 text-white rounded"
        onClick={handleReseed}
        disabled={loading}
      >
        {loading ? 'Seeding...' : 'Run RAG Seeder'}
      </button>
      {message ? <div className="mt-3 text-sm">{message}</div> : null}
    </div>
  );
};

export default KBAdmin;
