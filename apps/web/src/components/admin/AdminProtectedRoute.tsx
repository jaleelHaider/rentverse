import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { clearAdminToken, getAdminMe } from '@/api/endpoints/admin';
import type { AdminAccount } from '@rentverse/shared';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  onResolved?: (admin: AdminAccount) => void;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children, onResolved }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const payload = await getAdminMe();
        if (!active) return;
        setAdmin(payload.admin);
        setErrorMessage('');
        onResolved?.(payload.admin);
      } catch (error) {
        clearAdminToken();
        if (!active) return;
        setAdmin(null);
        setErrorMessage(error instanceof Error ? error.message : 'Admin session validation failed');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [onResolved]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  if (!admin) {
    if (errorMessage) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Admin session failed</h2>
            <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
            <div className="mt-4">
              <a
                href="/admin/login"
                className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Back to admin login
              </a>
            </div>
          </div>
        </div>
      );
    }

    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;

