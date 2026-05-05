import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearAdminToken } from '@/api/endpoints/admin';
import type { AdminAccount } from '@rentverse/shared';

interface AdminLayoutProps {
  admin: AdminAccount | null;
  children: React.ReactNode;
}

const navItems = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/verified-sellers', label: 'Verified Sellers' },
  { to: '/admin/reported-users', label: 'Reported Users' },
  { to: '/admin/fraud-detections', label: 'AI Detected Frauds' },
  { to: '/admin/search-analytics', label: 'Search Analytics' },
  { to: '/admin/workers', label: 'Workers' },
  { to: '/admin/listings', label: 'Listings' },
  { to: '/admin/reported-listings', label: 'Reported Listings' },
  { to: '/admin/orders', label: 'Disputes' },
  { to: '/admin/contact-messages', label: 'Contact Messages' },
  { to: '/admin/kyc', label: 'KYC' },
  { to: '/admin/audit', label: 'Audit' },
  { to: '/admin/kb', label: 'Knowledge Base' },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ admin, children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminToken();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin-shell min-h-screen text-slate-100 lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen grid-cols-1 gap-3 px-2 py-3 sm:px-3 lg:h-screen lg:min-h-0 lg:grid-cols-[260px_1fr] lg:px-4 lg:py-4">
        <aside className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-900/65 shadow-xl backdrop-blur-md">
          <div className="shrink-0 p-4 pb-3">
            <div className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">RentVerse Admin</p>
              <p className="mt-1 text-sm font-semibold text-white">{admin?.fullName || admin?.email || 'Admin'}</p>
              <p className="text-xs text-slate-300">Role: {admin?.role || '-'}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-24">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg border border-white/20 bg-slate-900/95 px-3 py-2 text-sm text-slate-100 shadow-lg hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/20 bg-white text-slate-900 shadow-xl">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

