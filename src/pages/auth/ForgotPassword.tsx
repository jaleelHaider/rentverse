import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to send reset email';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white p-3 rounded-xl">
              <div className="w-8 h-8"></div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              RentVerse
            </h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {success ? 'Check Your Email' : 'Reset Password'}
          </h2>
          <p className="text-gray-600 mt-2">
            {success 
              ? 'We sent you a password reset link' 
              : 'Enter your email to reset your password'
            }
          </p>
        </div>

        {/* Form Card */}
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

          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              
              <p className="text-gray-700 mb-6">
                We've sent a password reset link to:
                <br />
                <strong className="font-semibold">{email}</strong>
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">📧 Next Steps:</h4>
                <ul className="text-sm text-blue-800 space-y-1 text-left">
                  <li>• Check your email inbox</li>
                  <li>• Click the password reset link</li>
                  <li>• Create a new password</li>
                  <li>• Then log in with your new password</li>
                </ul>
              </div>
              
              <button
                onClick={() => navigate('/login')}
                className="w-full btn-primary py-3 mb-3"
              >
                Back to Login
              </button>
              
              <button
                onClick={() => setSuccess(false)}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Try Another Email
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="input-field pl-10"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Enter the email address you used to register
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3 text-lg"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-primary-600 hover:text-primary-700"
                >
                  <ArrowLeft size={20} />
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;