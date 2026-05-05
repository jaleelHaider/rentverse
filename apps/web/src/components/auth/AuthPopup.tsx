import React, { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  AlertCircle,
  Apple,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  RefreshCw,
  Shield,
  Smartphone,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface RegisterFormData {
  name: string
  email: string
  phone: string
  city: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
}

type AuthPanel = 'choose' | 'signup' | 'login' | 'forgot' | 'verify'

interface AuthPopupProps {
  initialPanel?: AuthPanel
  onClose: () => void
}

const AuthPopup: React.FC<AuthPopupProps> = ({ initialPanel = 'choose', onClose }) => {
  const [authPanel, setAuthPanel] = useState<AuthPanel>(initialPanel)
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    phone: '',
    city: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  })
  const [loginFormData, setLoginFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [isResetLoading, setIsResetLoading] = useState(false)
  const [isResendLoading, setIsResendLoading] = useState(false)
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<null | 'google' | 'facebook' | 'apple'>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [passwordResetSent, setPasswordResetSent] = useState(false)
  const [verificationResent, setVerificationResent] = useState(false)

  const { currentUser, register, login, resetPassword, resendVerificationToEmail, socialLogin } = useAuth()
  const location = useLocation()

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search)
    params.delete('auth')
    const search = params.toString()
    return `${location.pathname}${search ? `?${search}` : ''}`
  }, [location.pathname, location.search])

  const cities = [
    'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
    'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad',
  ]

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Full name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\+92\d{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please use Pakistani format: +92XXXXXXXXXX'
    }
    if (!formData.city) newErrors.city = 'City is required'
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})

    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        city: formData.city,
      })

      setRegisteredEmail(formData.email)
      setAuthPanel('verify')
    } catch (error: unknown) {
      setErrors({ submit: getErrorMessage(error, 'Registration failed. Please try again.') })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!loginFormData.email.trim() || !loginFormData.password) {
      setErrors({ loginSubmit: 'Email and password are required' })
      return
    }

    setIsLoginLoading(true)
    setErrors({})

    try {
      await login(loginFormData.email, loginFormData.password)
      onClose()
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Login failed. Please try again.')
      if (/verify your email|email.*verify|email.*confirmed/i.test(message)) {
        setRegisteredEmail(loginFormData.email.trim())
        setAuthPanel('verify')
        setErrors({})
        return
      }
      setErrors({ loginSubmit: message })
    } finally {
      setIsLoginLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleSocialAuth = async (provider: 'google' | 'facebook' | 'apple') => {
    setErrors({})
    setSocialLoadingProvider(provider)

    try {
      await socialLogin(provider, nextPath)
    } catch (error: unknown) {
      setErrors({ submit: getErrorMessage(error, `Unable to continue with ${provider}. Please try again.`) })
      setSocialLoadingProvider(null)
    }
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!forgotEmail.trim()) {
      setErrors({ forgotSubmit: 'Email is required' })
      return
    }

    setIsResetLoading(true)
    setErrors({})

    try {
      await resetPassword(forgotEmail.trim())
      setPasswordResetSent(true)
    } catch (error: unknown) {
      setErrors({ forgotSubmit: getErrorMessage(error, 'Failed to send reset email. Please try again.') })
    } finally {
      setIsResetLoading(false)
    }
  }

  const handleResendVerification = async () => {
    const email = (registeredEmail || currentUser?.email || '').trim()

    if (!email) {
      setErrors({ verifySubmit: 'No email available for verification.' })
      return
    }

    setIsResendLoading(true)
    setErrors({})

    try {
      await resendVerificationToEmail(email)
      setVerificationResent(true)
    } catch (error: unknown) {
      setErrors({ verifySubmit: getErrorMessage(error, 'Failed to resend verification email.') })
    } finally {
      setIsResendLoading(false)
    }
  }

  const passwordStrength = (): { score: number; label: string; color: string } => {
    if (!formData.password) {
      return { score: 0, label: 'Very Weak', color: 'bg-red-500' }
    }

    let score = 0
    if (formData.password.length >= 8) score++
    if (/[A-Z]/.test(formData.password)) score++
    if (/[0-9]/.test(formData.password)) score++
    if (/[^A-Za-z0-9]/.test(formData.password)) score++

    const strengths = [
      { score: 0, label: 'Very Weak', color: 'bg-red-500' },
      { score: 1, label: 'Weak', color: 'bg-orange-500' },
      { score: 2, label: 'Fair', color: 'bg-yellow-500' },
      { score: 3, label: 'Good', color: 'bg-blue-500' },
      { score: 4, label: 'Strong', color: 'bg-green-500' },
    ]

    return strengths[score]
  }

  const strength = passwordStrength()

  return (
    <div className="relative w-full rounded-3xl border border-white/60 bg-white shadow-2xl overflow-hidden">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-md p-1 text-gray-500 hover:bg-gray-100"
        aria-label="Close auth popup"
      >
        <X size={18} />
      </button>

      <div className="p-5 sm:p-5.5">
        {(authPanel === 'choose' || authPanel === 'signup' || authPanel === 'login') && (
          <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/50 to-blue-50 p-4">
            <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => void handleSocialAuth('google')}
              disabled={socialLoadingProvider !== null}
              data-testid="google-login-btn-signup-form"
              className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-[14px] font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>{socialLoadingProvider === 'google' ? 'Redirecting...' : 'Continue with Google'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSocialAuth('facebook')}
              disabled={socialLoadingProvider !== null}
              className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-[14px] font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>{socialLoadingProvider === 'facebook' ? 'Redirecting...' : 'Continue with Facebook'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSocialAuth('apple')}
              disabled={socialLoadingProvider !== null}
              className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-[14px] font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Apple size={16} />
              <span>{socialLoadingProvider === 'apple' ? 'Redirecting...' : 'Continue with Apple'}</span>
            </button>
            </div>

            <div className="my-4 flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-200 to-transparent" />
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">or</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-200 to-transparent" />
            </div>

            <p className="text-center text-sm font-medium text-gray-700">
              <button
                type="button"
                onClick={() => {
                  setErrors({})
                  setAuthPanel('signup')
                }}
                className="text-primary-600 hover:text-primary-700 underline underline-offset-2"
              >
                Sign up
              </button>
              {' '}or{' '}
              <button
                type="button"
                onClick={() => {
                  setErrors({})
                  setAuthPanel('login')
                }}
                className="text-primary-600 hover:text-primary-700 underline underline-offset-2"
              >
                log in
              </button>
              {' '}with email
            </p>
          </div>
        )}

        {errors.submit && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5" size={20} />
            <div>
              <p className="text-red-800 font-medium">Authentication Failed</p>
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          </div>
        )}

        {errors.loginSubmit && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5" size={20} />
            <div>
              <p className="text-red-800 font-medium">Login Failed</p>
              <p className="text-red-700 text-sm">{errors.loginSubmit}</p>
            </div>
          </div>
        )}

        {errors.forgotSubmit && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5" size={20} />
            <div>
              <p className="text-red-800 font-medium">Reset Failed</p>
              <p className="text-red-700 text-sm">{errors.forgotSubmit}</p>
            </div>
          </div>
        )}

        {errors.verifySubmit && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5" size={20} />
            <div>
              <p className="text-red-800 font-medium">Verification Error</p>
              <p className="text-red-700 text-sm">{errors.verifySubmit}</p>
            </div>
          </div>
        )}

        {authPanel === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="mt-5 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`input-field pl-10 ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Smartphone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`input-field pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                    placeholder="+92 300 1234567"
                  />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={`input-field pl-10 ${errors.city ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select your city</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>

                {formData.password && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Password strength:</span>
                      <span className={`font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${strength.color}`} style={{ width: `${(strength.score + 1) * 20}%` }} />
                    </div>
                  </div>
                )}
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`input-field pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="agreeToTerms"
                id="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
                I agree to the <Link to="/terms" className="text-primary-600 hover:text-primary-700 font-medium">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-primary-600 hover:text-primary-700 font-medium">Privacy Policy</Link>.
              </label>
            </div>
            {errors.agreeToTerms && <p className="text-sm text-red-600">{errors.agreeToTerms}</p>}

            <button type="submit" disabled={isLoading} className="w-full btn-primary py-2.5 text-base">
              {isLoading ? 'Creating Account...' : <>Create Free Account <ArrowRight size={18} className="inline ml-1" /></>}
            </button>
          </form>
        )}

        {authPanel === 'login' && (
          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={loginFormData.email}
                  onChange={(e) => setLoginFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="input-field pl-10"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginFormData.password}
                  onChange={(e) => setLoginFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showLoginPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
              <div className="mt-2 text-right">
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:text-primary-700"
                  onClick={() => {
                    setErrors({})
                    setForgotEmail(loginFormData.email)
                    setAuthPanel('forgot')
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoginLoading} className="w-full btn-primary py-2.5 text-base">
              {isLoginLoading ? 'Signing in...' : 'Log In'}
            </button>
          </form>
        )}

        {authPanel === 'forgot' && (
          <div className="mt-5">
            {passwordResetSent ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle size={24} className="text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Reset Email Sent</h3>
                <p className="text-sm text-gray-600">
                  We sent a password reset link to <span className="font-medium text-gray-900">{forgotEmail}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordResetSent(false)
                    setErrors({})
                    setAuthPanel('login')
                  }}
                  className="w-full btn-primary py-2.5 text-base"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="text-center mb-1">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
                    <Mail size={24} className="text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Forgot Password?</h3>
                  <p className="mt-1 text-sm text-gray-600">Enter your account email and we will send a reset link.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-start gap-2">
                    <Shield size={16} className="mt-0.5 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Instructions</h4>
                      <ul className="mt-1 space-y-1 text-xs text-blue-800">
                        <li>1. Check inbox and spam folder</li>
                        <li>2. Open the reset link in email</li>
                        <li>3. Create a new password and login</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={isResetLoading} className="w-full btn-primary py-2.5 text-base">
                  {isResetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  className="w-full rounded-lg border border-gray-300 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setErrors({})
                    setAuthPanel('login')
                  }}
                >
                  Back to Login
                </button>
              </form>
            )}
          </div>
        )}

        {authPanel === 'verify' && (
          <div className="mt-5 space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <Mail size={28} className="text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Verify Your Email</h3>
              <p className="mt-1 text-sm text-gray-600">We sent a verification link to:</p>
              <p className="mt-1 break-all font-medium text-gray-900">{registeredEmail || currentUser?.email || 'your email'}</p>
            </div>

            {verificationResent && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="font-medium text-green-900">Verification email sent</p>
                <p className="mt-1 text-sm text-green-800">A new verification email is on the way.</p>
              </div>
            )}

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Shield size={18} className="mt-0.5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-blue-900">Important Instructions</h4>
                  <ul className="mt-1 space-y-1 text-sm text-blue-800">
                    <li>1. Check inbox and spam folder</li>
                    <li>2. Click verification link in email</li>
                    <li>3. Return and log in with your account</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResendLoading}
              className="w-full rounded-lg border border-primary-600 py-2.5 text-base font-medium text-primary-600 hover:bg-primary-50"
            >
              <span className="inline-flex items-center gap-2">
                {isResendLoading ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                {isResendLoading ? 'Sending...' : 'Resend Verification Email'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setErrors({})
                setAuthPanel('login')
              }}
              className="w-full btn-primary py-2.5 text-base"
            >
              Continue to Login
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default AuthPopup

