import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLoginStart, adminVerifyMfa, getAdminMe } from '@/api/endpoints/admin';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const payload = await adminLoginStart(email, password);
      if (!payload.mfaRequired && payload.token) {
        await getAdminMe();
        navigate('/admin', { replace: true });
        return;
      }

      if (!payload.preAuthToken) {
        setError('MFA session was not created. Please try again.');
        return;
      }

      setPreAuthToken(payload.preAuthToken);
      setMfaSetupRequired(Boolean(payload.mfaSetupRequired));
      setQrDataUrl(payload.mfa?.qrDataUrl || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!preAuthToken) return;

    setIsLoading(true);
    setError('');

    try {
      await adminVerifyMfa(preAuthToken, otp);
      await getAdminMe();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-600">Hidden access for authorized RentVerse staff only.</p>

        {!preAuthToken ? (
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm text-slate-700">Email</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-700">Password</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                required
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isLoading ? 'Signing in...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyMfa} className="mt-6 space-y-4">
            {mfaSetupRequired && qrDataUrl ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-800">First-time setup: scan this QR in Google Authenticator.</p>
                <img src={qrDataUrl} alt="MFA QR" className="mx-auto mt-3 h-44 w-44" />
              </div>
            ) : null}

            <label className="block">
              <span className="text-sm text-slate-700">6-digit MFA code</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                required
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isLoading ? 'Verifying...' : 'Verify & Enter Admin'}
            </button>
          </form>
        )}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
};

export default AdminLogin;

