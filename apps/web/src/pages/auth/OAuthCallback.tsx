import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const OAuthCallback: React.FC = () => {
  const [error, setError] = useState('')
  const { completeSocialLogin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    const finalize = async () => {
      try {
        const redirectTo = await completeSocialLogin()
        if (!active) {
          return
        }
        navigate(redirectTo, { replace: true })
      } catch (err) {
        if (!active) {
          return
        }

        const message = err instanceof Error ? err.message : 'Unable to complete social login.'
        setError(message)
      }
    }

    void finalize()

    return () => {
      active = false
    }
  }, [completeSocialLogin, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        {!error ? (
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
            <h1 className="mt-4 text-xl font-bold text-gray-900">Finalizing your sign-in</h1>
            <p className="mt-2 text-sm text-gray-600">Please wait while we securely complete your social login.</p>
          </div>
        ) : (
          <div className="text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <h1 className="mt-4 text-xl font-bold text-gray-900">Social login failed</h1>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <div className="mt-6 space-y-3">
              <Link to="/?auth=signup" className="block w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                Back to sign up
              </Link>
              <Link to="/?auth=login" className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Use email login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OAuthCallback

