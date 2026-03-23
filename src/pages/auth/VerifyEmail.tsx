import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Mail, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  ArrowLeft,
  Home,
  List,
  BarChart,
  PartyPopper,
  Shield,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const VerifyEmail: React.FC = () => {
  const { currentUser, resendVerification, logout, refreshAuthUser, isEmailVerified } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as
    | { from?: string | { pathname?: string } }
    | null;
  
  // Get the redirect path from location state or default to dashboard
  const fromState = locationState?.from;
  const from =
    typeof fromState === 'string'
      ? fromState
      : fromState?.pathname || '/dashboard';

  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const handleResendVerification = async () => {
    try {
      setIsSending(true);
      setError('');
      await resendVerification();
      setIsSent(true);
      setTimeout(() => setIsSent(false), 3000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to send verification email'));
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      setIsChecking(true);
      setError('');

      const verified = await refreshAuthUser();

      if (verified) {
        setVerificationSuccess(true);
        
        // Start countdown for automatic redirect
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              navigate(from, { replace: true });
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Clear timer on component unmount
        return () => clearInterval(timer);
      } else {
        setError('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch {
      setError('Failed to check verification status');
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleGoToHome = () => {
    navigate('/');
  };

  const handleCreateListing = () => {
    navigate('/create-listing');
  };

  // Auto-check verification status when component mounts
  useEffect(() => {
    if (isEmailVerified) {
      setVerificationSuccess(true);
      navigate(from, { replace: true });
    }
  }, [isEmailVerified, navigate, from]);

  if (verificationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white p-3 rounded-xl">
                <PartyPopper size={32} />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                RentVerse
              </h1>
            </div>
          </div>

          {/* Success Card */}
          <div className="card p-8 text-center">
            {/* Animated Checkmark */}
            <div className="relative mx-auto mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto animate-scale-in">
                <CheckCircle size={48} className="text-white" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-20"></div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Email Verified Successfully!
            </h2>
            
            <p className="text-gray-600 mb-8">
              Congratulations! Your email has been verified and your account is now fully activated.
              You'll be redirected to your dashboard in <span className="font-bold text-primary-600">{countdown}</span> seconds.
            </p>

            {/* Next Steps */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-4 justify-center">
                <Sparkles size={20} className="text-emerald-600" />
                <h3 className="font-semibold text-emerald-900">Ready to Get Started?</h3>
                <Sparkles size={20} className="text-emerald-600" />
              </div>
              <p className="text-emerald-800 text-sm mb-6">
                Explore all the features now available to you as a verified member of RentVerse.
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={handleGoToDashboard}
                  className="w-full flex items-center justify-center gap-3 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <BarChart size={20} />
                  Go to Dashboard
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Recommended</span>
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleGoToHome}
                    className="flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Home size={18} />
                    Browse Listings
                  </button>
                  <button
                    onClick={handleCreateListing}
                    className="flex items-center justify-center gap-2 py-3 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50"
                  >
                    <List size={18} />
                    List Item
                  </button>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-primary-600">✓</div>
                <div className="text-xs text-gray-600">Verified Profile</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-primary-600">🔒</div>
                <div className="text-xs text-gray-600">Full Access</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-primary-600">⭐</div>
                <div className="text-xs text-gray-600">Premium Member</div>
              </div>
            </div>

            {/* Cancel Redirect */}
            <button
              onClick={() => navigate(from, { replace: true })}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Go to dashboard now (don't wait)
            </button>
          </div>

          {/* Support */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <Link to="/contact" className="text-primary-600 hover:text-primary-700">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white p-3 rounded-xl">
              <Mail size={32} />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              RentVerse
            </h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
          <p className="text-gray-600 mt-2">
            Please verify your email to access your account
          </p>
        </div>

        {/* Content Card */}
        <div className="card p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5" size={20} />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {isSent && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="text-green-500 mt-0.5" size={20} />
              <div>
                <p className="text-green-800 font-medium">Email Sent!</p>
                <p className="text-green-700 text-sm">
                  Verification email has been sent to {currentUser?.email}
                </p>
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={40} className="text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Check Your Inbox
            </h3>
            <p className="text-gray-600">
              We've sent a verification link to:
            </p>
            <p className="font-medium text-gray-900 mt-1 break-all">
              {currentUser?.email}
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">📧 Important Instructions:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>1. Check your email inbox (and spam folder)</li>
                    <li>2. Click the verification link in the email</li>
                    <li>3. Return here and click "I've Verified" below</li>
                    <li>4. Your account will be activated immediately</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleCheckVerification}
                disabled={isChecking}
                className="w-full btn-primary py-3"
              >
                {isChecking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} className="mr-2" />
                    I've Verified My Email
                  </>
                )}
              </button>

              <button
                onClick={handleResendVerification}
                disabled={isSending}
                className="w-full py-3 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw size={20} />
                    Resend Verification Email
                  </>
                )}
              </button>

              <button
                onClick={handleLogout}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={20} />
                Back to Login
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={handleResendVerification}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                click here to resend
              </button>
            </p>
          </div>
        </div>

        {/* Support */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need help?{' '}
            <Link to="/contact" className="text-primary-600 hover:text-primary-700">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;