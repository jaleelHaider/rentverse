import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Save,
  Shield,
  Trash2,
  User,
} from 'lucide-react'
import { fileToBase64 } from '@/api/clients'
import { requestEmailChange } from '@/api/endpoints/auth'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface ProfileSettingsForm {
  name: string
  email: string
  phone: string
  city: string
  description: string
  avatarUrl: string
}

interface KycFieldErrors {
  documentType?: string
  documentNumber?: string
  frontImage?: string
  backImage?: string
  submit?: string
}

const DEFAULT_FORM: ProfileSettingsForm = {
  name: '',
  email: '',
  phone: '',
  city: '',
  description: '',
  avatarUrl: '',
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const pakistaniPhoneRegex = /^(?:\+?92|0092|0)?3\d{9}$/

const normalizePakistaniPhone = (value: string): string => value.replace(/[\s\-().]/g, '')

const isPakistaniPhoneNumber = (value: string): boolean => pakistaniPhoneRegex.test(normalizePakistaniPhone(value))

const getFriendlyErrorMessage = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) {
    return fallback
  }

  const raw = error.message.trim()
  if (!raw || raw === 'Request failed') {
    return fallback
  }

  return raw
}

const toDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read selected image.'))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unsupported image data.'))
        return
      }
      resolve(reader.result)
    }
    reader.readAsDataURL(file)
  })

const optimizeAvatar = async (file: File): Promise<string> => {
  const rawDataUrl = await toDataUrl(file)

  const image = new Image()
  image.src = rawDataUrl

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Failed to decode selected image.'))
  })

  const size = 320
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Image processing is not supported in this browser.')
  }

  const sourceSize = Math.min(image.width, image.height)
  const sourceX = (image.width - sourceSize) / 2
  const sourceY = (image.height - sourceSize) / 2

  ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.86)
}

const ProfileSettings: React.FC = () => {
  const {
    currentUser,
    userData,
    isEmailVerified,
    isKycVerified,
    updateUserProfile,
    submitKycVerification,
    deleteAccount,
    resetPassword,
    resendVerification,
  } = useAuth()
  const navigate = useNavigate()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<ProfileSettingsForm>(DEFAULT_FORM)
  const [initialSnapshot, setInitialSnapshot] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [isAvatarBusy, setIsAvatarBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false)
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false)
  const [kycDocumentType, setKycDocumentType] = useState('')
  const [kycDocumentNumber, setKycDocumentNumber] = useState('')
  const [kycFrontImage, setKycFrontImage] = useState<File | null>(null)
  const [kycBackImage, setKycBackImage] = useState<File | null>(null)
  const [kycFrontName, setKycFrontName] = useState('')
  const [kycBackName, setKycBackName] = useState('')
  const [kycFieldErrors, setKycFieldErrors] = useState<KycFieldErrors>({})
  const [kycMessage, setKycMessage] = useState<string | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [contactMessage, setContactMessage] = useState<string | null>(null)
  const [contactError, setContactError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) {
      return
    }

    const nextForm: ProfileSettingsForm = {
      name:
        userData?.name?.trim() ||
        ((currentUser.user_metadata?.full_name as string | undefined)?.trim() ?? ''),
      email: userData?.email || currentUser.email || '',
      phone:
        userData?.phone ||
        (currentUser.user_metadata?.phone as string | undefined) ||
        '',
      city:
        userData?.city ||
        (currentUser.user_metadata?.city as string | undefined) ||
        '',
      description:
        userData?.description ||
        (currentUser.user_metadata?.description as string | undefined) ||
        '',
      avatarUrl:
        userData?.avatarUrl ||
        (currentUser.user_metadata?.avatar_url as string | undefined) ||
        '',
    }

    setForm(nextForm)
    setInitialSnapshot(JSON.stringify({
      name: nextForm.name,
      city: nextForm.city,
      description: nextForm.description,
      avatarUrl: nextForm.avatarUrl,
    }))
    setKycDocumentType((userData?.kycDocumentType as string | undefined) || (currentUser.user_metadata?.kyc_document_type as string | undefined) || '')
    setKycDocumentNumber('')
    setKycFrontImage(null)
    setKycBackImage(null)
    setKycFrontName('')
    setKycBackName('')
    setKycFieldErrors({})
    setKycMessage(null)
    setDeleteError(null)
    setContactMessage(null)
    setContactError(null)
  }, [currentUser, userData])

  const generalSnapshot = useMemo(
    () => JSON.stringify({ name: form.name, city: form.city, description: form.description, avatarUrl: form.avatarUrl }),
    [form.name, form.city, form.description, form.avatarUrl]
  )

  const hasChanges = useMemo(() => generalSnapshot !== initialSnapshot, [generalSnapshot, initialSnapshot])

  const initials = useMemo(() => {
    const base = form.name.trim() || currentUser?.email?.split('@')[0] || 'U'
    return base.charAt(0).toUpperCase()
  }, [form.name, currentUser])

  const kycStatus = userData?.kycStatus || 'unverified'
  const kycStatusLabel =
    kycStatus === 'verified'
      ? 'Verified'
      : kycStatus === 'pending'
        ? 'Pending review'
        : kycStatus === 'rejected'
          ? 'Rejected'
          : 'Unverified'

  const kycStatusBadgeClass =
    kycStatus === 'verified'
      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
      : kycStatus === 'pending'
        ? 'bg-amber-100 text-amber-800 border border-amber-200'
        : kycStatus === 'rejected'
          ? 'bg-red-100 text-red-800 border border-red-200'
          : 'bg-gray-100 text-gray-700 border border-gray-200'

  const phoneVerified = Boolean(userData?.phone?.trim())

  const onChangeField =
    (field: keyof ProfileSettingsForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setErrorMessage(null)
      setStatusMessage(null)
      setContactMessage(null)
      setContactError(null)
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleAvatarPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setErrorMessage(null)
    setStatusMessage(null)

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file.')
      return
    }

    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage('Image is too large. Please select a file below 4MB.')
      return
    }

    setIsAvatarBusy(true)
    try {
      const optimizedDataUrl = await optimizeAvatar(file)
      setForm((prev) => ({ ...prev, avatarUrl: optimizedDataUrl }))
      setStatusMessage('Profile photo updated locally. Save changes to persist it.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not process selected image.'
      setErrorMessage(message)
    } finally {
      setIsAvatarBusy(false)
      event.target.value = ''
    }
  }

  const handleRemovePhoto = () => {
    setErrorMessage(null)
    setStatusMessage(null)
    setForm((prev) => ({ ...prev, avatarUrl: '' }))
  }

  const validateForm = () => {
    if (!form.name.trim()) {
      throw new Error('Name is required.')
    }
  }

  const handlePreviewProfile = () => {
    if (currentUser?.id) {
      navigate(`/user/${currentUser.id}`)
    }
  }

  const handleUpdateEmail = async () => {
    const nextEmail = form.email.trim().toLowerCase()
    const currentEmail = (userData?.email || currentUser?.email || '').trim().toLowerCase()

    setErrorMessage(null)
    setStatusMessage(null)
    setContactMessage(null)
    setContactError(null)

    if (!nextEmail) {
      setContactError('Email is required.')
      return
    }

    if (!emailRegex.test(nextEmail)) {
      setContactError('Please enter a valid email address.')
      return
    }

    if (nextEmail === currentEmail) {
      setContactMessage('You are already using this email.')
      return
    }

    setIsUpdatingEmail(true)
    try {
      const response = await requestEmailChange(nextEmail)
      setContactMessage(response.message)
    } catch (error) {
      setContactError(getFriendlyErrorMessage(error, 'Failed to request email update.'))
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  const handleUpdatePhone = async () => {
    const nextPhoneRaw = form.phone.trim()
    const currentPhone = userData?.phone?.trim() || ''

    setErrorMessage(null)
    setStatusMessage(null)
    setContactMessage(null)
    setContactError(null)

    if (!nextPhoneRaw) {
      setContactError('Phone number is required.')
      return
    }

    if (!isPakistaniPhoneNumber(nextPhoneRaw)) {
      setContactError('Please enter a valid Pakistani phone number.')
      return
    }

    const nextPhone = normalizePakistaniPhone(nextPhoneRaw)
    if (nextPhone === currentPhone) {
      setContactMessage('You are already using this phone number.')
      return
    }

    setIsUpdatingPhone(true)
    try {
      await updateUserProfile({ phone: nextPhone })
      setForm((prev) => ({ ...prev, phone: nextPhone }))
      setContactMessage('Phone number updated successfully.')
    } catch (error) {
      setContactError(getFriendlyErrorMessage(error, 'Failed to update phone number.'))
    } finally {
      setIsUpdatingPhone(false)
    }
  }

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault()

    setErrorMessage(null)
    setStatusMessage(null)

    try {
      validateForm()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Please check your input.')
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        name: form.name.trim(),
        city: form.city.trim() || undefined,
        description: form.description.trim() || undefined,
        avatarUrl: form.avatarUrl || undefined,
        profileCompleted: true,
      }

      await updateUserProfile(payload)
      setInitialSnapshot(JSON.stringify({
        name: payload.name,
        city: payload.city || '',
        description: payload.description || '',
        avatarUrl: payload.avatarUrl || '',
      }))

      setStatusMessage('Profile settings saved successfully.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save your settings.'
      setErrorMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendPasswordReset = async () => {
    const targetEmail = form.email.trim() || currentUser?.email
    if (!targetEmail) {
      setErrorMessage('Please add an email first, then retry password reset.')
      return
    }

    setErrorMessage(null)
    setStatusMessage(null)
    setIsSendingPasswordReset(true)

    try {
      await resetPassword(targetEmail)
      setStatusMessage('Password reset email sent. Please check your inbox.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send password reset email.'
      setErrorMessage(message)
    } finally {
      setIsSendingPasswordReset(false)
    }
  }

  const handleResendVerification = async () => {
    setErrorMessage(null)
    setStatusMessage(null)
    setIsSendingVerification(true)

    try {
      await resendVerification()
      setStatusMessage('Verification email sent. Please check your inbox.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send verification email.'
      setErrorMessage(message)
    } finally {
      setIsSendingVerification(false)
    }
  }

  const handleKycImagePick =
    (side: 'front' | 'back') =>
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      setErrorMessage(null)
      setStatusMessage(null)
      setKycMessage(null)
      setKycFieldErrors((prev) => ({ ...prev, submit: undefined }))

      if (!file.type.startsWith('image/')) {
        if (side === 'front') {
          setKycFieldErrors((prev) => ({ ...prev, frontImage: 'Please upload a valid image file.' }))
        } else {
          setKycFieldErrors((prev) => ({ ...prev, backImage: 'Please upload a valid image file.' }))
        }
        return
      }

      if (side === 'front') {
        setKycFrontImage(file)
        setKycFrontName(file.name)
        setKycFieldErrors((prev) => ({ ...prev, frontImage: undefined }))
      } else {
        setKycBackImage(file)
        setKycBackName(file.name)
        setKycFieldErrors((prev) => ({ ...prev, backImage: undefined }))
      }

      event.target.value = ''
    }

  const handleCompleteKyc = async () => {
    const sanitizedNumber = kycDocumentNumber.replace(/\D/g, '')
    const nextErrors: KycFieldErrors = {}

    if (!kycDocumentType) {
      nextErrors.documentType = 'Please select an identity document type.'
    }

    if (!sanitizedNumber) {
      nextErrors.documentNumber = 'Please enter your document number.'
    }

    if (!kycFrontImage) {
      nextErrors.frontImage = 'Please upload the front image of your ID.'
    }

    if (!kycBackImage) {
      nextErrors.backImage = 'Please upload the back image of your ID.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setKycFieldErrors(nextErrors)
      return
    }

    setErrorMessage(null)
    setStatusMessage(null)
    setKycFieldErrors({})
    setKycMessage(null)
    setIsSubmittingKyc(true)

    const frontFile = kycFrontImage
    const backFile = kycBackImage

    if (!frontFile || !backFile) {
      setKycFieldErrors({
        frontImage: 'Please upload the front image of your ID.',
        backImage: 'Please upload the back image of your ID.',
      })
      setIsSubmittingKyc(false)
      return
    }

    try {
      const [frontImage, backImage] = await Promise.all([fileToBase64(frontFile), fileToBase64(backFile)])

      const result = await submitKycVerification({
        documentType: kycDocumentType,
        documentNumber: sanitizedNumber,
        frontImage,
        backImage,
      })

      if (result.status === 'pending') {
        setKycMessage('KYC request submitted successfully. It is now pending admin review.')
      } else {
        setKycMessage('KYC request updated successfully.')
      }

      setKycFrontImage(null)
      setKycBackImage(null)
      setKycFrontName('')
      setKycBackName('')
      setKycDocumentNumber('')
    } catch (error) {
      const message = getFriendlyErrorMessage(
        error,
        'Unable to submit KYC right now. Please verify your details and try again.'
      )
      setKycFieldErrors((prev) => ({ ...prev, submit: message }))
    } finally {
      setIsSubmittingKyc(false)
    }
  }

  const handleDeleteAccount = async () => {
    setErrorMessage(null)
    setStatusMessage(null)
    setDeleteError(null)

    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE exactly to confirm account deletion.')
      return
    }

    setIsDeletingAccount(true)

    try {
      await deleteAccount()
      navigate('/?auth=choose', { replace: true })
    } catch (error) {
      const message = getFriendlyErrorMessage(
        error,
        'Unable to delete account right now. If you have active rentals, complete them first and try again.'
      )
      setDeleteError(message)
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom space-y-6">
        <section className="px-1 py-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <button
              type="button"
              onClick={handlePreviewProfile}
              disabled={!currentUser?.id}
              className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ExternalLink size={16} />
              Preview Profile
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="card p-5 lg:sticky lg:top-24 h-fit">
            <h2 className="text-lg font-semibold text-gray-900">Public Identity</h2>
            <p className="mt-1 text-sm text-gray-500">This is how your profile appears across chats and listings.</p>

            <div className="mt-6 flex items-center gap-4">
              <div className="relative">
                {form.avatarUrl ? (
                  <img
                    src={form.avatarUrl}
                    alt="Profile"
                    className="h-20 w-20 rounded-2xl border border-gray-200 object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-2xl font-bold text-white shadow-sm">
                    {initials}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
                  disabled={isAvatarBusy}
                >
                  {isAvatarBusy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                  {form.avatarUrl ? 'Change Photo' : 'Upload Photo'}
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  disabled={!form.avatarUrl || isAvatarBusy}
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarPick}
              className="hidden"
            />

            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-800">Photo tips</p>
              <p className="mt-1">Use a clear face or logo image. Uploaded images are automatically cropped and optimized.</p>
            </div>

            <div className="mt-4 space-y-2">
              {[
                { show: isEmailVerified, label: 'Email verified' },
                { show: phoneVerified, label: 'Phone verified' },
                { show: isKycVerified, label: 'KYC verified' },
                { show: Boolean(userData?.verifiedSeller), label: 'RentVerse Verified Seller' },
              ].map((item) =>
                item.show ? (
                  <div
                    key={item.label}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                  >
                    <CheckCircle2 size={14} />
                    {item.label}
                  </div>
                ) : null
              )}
            </div>
          </aside>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <section className="card p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-primary-100 p-2 text-primary-700">
                  <User size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                  <p className="text-sm text-gray-500">Update your public-facing identity and personal details.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Full Name</span>
                  <input
                    value={form.name}
                    onChange={onChangeField('name')}
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">City</span>
                  <input
                    value={form.city}
                    onChange={onChangeField('city')}
                    className="input-field"
                    placeholder="Lahore"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">About You</span>
                  <textarea
                    value={form.description}
                    onChange={onChangeField('description')}
                    className="input-field min-h-28 resize-y"
                    placeholder="Tell people what you rent, your response style, or anything that builds trust."
                    maxLength={320}
                  />
                  <p className="text-xs text-gray-500">{form.description.length}/320</p>
                </label>
              </div>
            </section>

            <section className="card p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <Mail size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Contact & Account</h2>
                  <p className="text-sm text-gray-500">Keep your email and phone updated for bookings and notifications.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Email Address</span>
                  <input
                    value={form.email}
                    onChange={onChangeField('email')}
                    className="input-field"
                    placeholder="you@example.com"
                  />
                  <p className="text-xs text-gray-500">
                    Changing email requires verification before it updates in your profile.
                  </p>
                  <button
                    type="button"
                    onClick={handleUpdateEmail}
                    disabled={isUpdatingEmail}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                  >
                    {isUpdatingEmail ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    Update Email
                  </button>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Phone Number</span>
                  <div className="relative">
                    <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={form.phone}
                      onChange={onChangeField('phone')}
                      className="input-field pl-10"
                      placeholder="+92 300 1234567"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdatePhone}
                    disabled={isUpdatingPhone}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {isUpdatingPhone ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
                    Update Number
                  </button>
                </label>
              </div>

              {(contactError || contactMessage) ? (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                    contactError
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-green-200 bg-green-50 text-green-700'
                  }`}
                >
                  {contactError || contactMessage}
                </div>
              ) : null}
            </section>

            <section className="card p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                  <Shield size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">KYC Verification</h2>
                  <p className="text-sm text-gray-500">Upload the front and back of your ID for automated authenticity screening.</p>
                </div>
              </div>

              {kycStatus !== 'rejected' ? (
                <div className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${kycStatusBadgeClass}`}>
                  <span>{kycStatusLabel}</span>
                </div>
              ) : null}

              {kycStatus === 'pending' ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Your verification request is under review.
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Document Type</span>
                  <select
                    value={kycDocumentType}
                    onChange={(event) => {
                      setKycDocumentType(event.target.value)
                      setKycFieldErrors((prev) => ({ ...prev, documentType: undefined, submit: undefined }))
                      setKycMessage(null)
                    }}
                    className="input-field"
                    disabled={isKycVerified}
                  >
                    <option value="">Select document type</option>
                    <option value="cnic">CNIC</option>
                    <option value="passport">Passport</option>
                    <option value="driver_license">Driver License</option>
                  </select>
                  {kycFieldErrors.documentType ? (
                    <p className="text-xs text-red-600">{kycFieldErrors.documentType}</p>
                  ) : null}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Document Number</span>
                  <input
                    value={kycDocumentNumber}
                    onChange={(event) => {
                      setKycDocumentNumber(event.target.value)
                      setKycFieldErrors((prev) => ({ ...prev, documentNumber: undefined, submit: undefined }))
                      setKycMessage(null)
                    }}
                    className="input-field"
                    placeholder="Enter document number"
                    disabled={isKycVerified}
                  />
                  {kycFieldErrors.documentNumber ? (
                    <p className="text-xs text-red-600">{kycFieldErrors.documentNumber}</p>
                  ) : null}
                </label>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                  <span className="text-sm font-medium text-gray-700">Front of ID</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleKycImagePick('front')}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-700"
                    disabled={isKycVerified}
                  />
                  <p className="text-xs text-gray-500">Upload a clear photo of the front side of your document.</p>
                  {kycFrontName ? <p className="text-xs font-medium text-gray-700">Selected: {kycFrontName}</p> : null}
                  {kycFieldErrors.frontImage ? <p className="text-xs text-red-600">{kycFieldErrors.frontImage}</p> : null}
                </label>

                <label className="space-y-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                  <span className="text-sm font-medium text-gray-700">Back of ID</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleKycImagePick('back')}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-700"
                    disabled={isKycVerified}
                  />
                  <p className="text-xs text-gray-500">Upload a clear photo of the back side of your document.</p>
                  {kycBackName ? <p className="text-xs font-medium text-gray-700">Selected: {kycBackName}</p> : null}
                  {kycFieldErrors.backImage ? <p className="text-xs text-red-600">{kycFieldErrors.backImage}</p> : null}
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCompleteKyc}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                  disabled={isKycVerified || isSubmittingKyc || kycStatus === 'pending'}
                >
                  {isSubmittingKyc ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {isKycVerified
                    ? 'Verified'
                    : kycStatus === 'pending'
                      ? 'Pending Verification'
                      : kycMessage === 'KYC request submitted successfully. It is now pending admin review.'
                        ? 'Submitted for Verification'
                        : kycStatus === 'rejected'
                          ? 'Resubmit KYC Documents'
                          : 'Submit for Verification'}
                </button>
                <span className={`text-sm font-medium ${isKycVerified ? 'text-green-700' : kycStatus === 'rejected' ? 'text-red-700' : 'text-gray-600'}`}>
                  {isKycVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>

              {!isKycVerified ? (
                <p className="mt-3 text-sm text-gray-600">
                  {kycStatus === 'pending'
                    ? 'Your ID will be verified soon. We are reviewing your documents.'
                    : 'Your ID will be verified soon after you submit the documents.'}
                </p>
              ) : null}

              {kycStatus === 'rejected' ? (
                <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${kycStatusBadgeClass}`}>
                  <span>{kycStatusLabel}</span>
                </div>
              ) : null}

              {kycMessage ? (
                <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {kycMessage}
                </div>
              ) : null}

              {kycFieldErrors.submit ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {kycFieldErrors.submit}
                </div>
              ) : null}

              {(statusMessage || errorMessage) && (
                <div
                  className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                    errorMessage
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-green-200 bg-green-50 text-green-700'
                  }`}
                >
                  {errorMessage || statusMessage}
                </div>
              )}

              {kycStatus === 'rejected' ? (
                <div className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-4 text-red-800">
                  <p className="text-sm font-semibold">KYC Request Rejected</p>
                  <p className="mt-1 text-sm">
                    {userData?.kycReviewMessage || 'Your KYC request was rejected by the review team. Please upload clearer documents and resubmit.'}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900">Security Actions</h2>
              <p className="mt-1 text-sm text-gray-500">Quick actions for account access and verification.</p>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800 hover:bg-yellow-100 disabled:opacity-60"
                  disabled={isEmailVerified || isSendingVerification}
                >
                  {isSendingVerification ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                  {isEmailVerified ? 'Email Already Verified' : 'Send Verification Email'}
                </button>

                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-60"
                  disabled={isSendingPasswordReset}
                >
                  {isSendingPasswordReset ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  Send Password Reset Email
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-red-200 bg-red-50/60 p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-lg bg-red-100 p-2 text-red-700">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-red-900">Danger Zone</h2>
                  <p className="text-sm text-red-800">
                    Deleting your account is permanent. Your listings and profile data will be removed.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-900">
                Account deletion is blocked if you are in an active rental flow (approved, handover pending, in-use, or return pending).
              </div>

              {!showDeleteConfirmation ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirmation(true)
                      setDeleteConfirmText('')
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                    Delete Account
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-4 rounded-lg border border-red-200 bg-white p-4">
                  <p className="text-sm text-red-900">
                    Type <span className="font-bold">DELETE</span> to confirm permanent account deletion.
                  </p>
                  <input
                    value={deleteConfirmText}
                    onChange={(event) => setDeleteConfirmText(event.target.value)}
                    className="input-field border-red-200 focus:ring-red-500"
                    placeholder="Type DELETE"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {isDeletingAccount ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      {isDeletingAccount ? 'Deleting Account...' : 'Confirm Delete Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirmation(false)
                        setDeleteConfirmText('')
                      }}
                      disabled={isDeletingAccount}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>

                  {deleteError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {deleteError}
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">Your changes are synced with your RentVerse account profile.</p>
              <button
                type="submit"
                disabled={!hasChanges || isSaving || isAvatarBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {(statusMessage || errorMessage) ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  errorMessage
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-green-200 bg-green-50 text-green-700'
                }`}
              >
                {errorMessage || statusMessage}
              </div>
            ) : null}

            {!hasChanges && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 size={16} />
                <span>All profile settings are up to date.</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProfileSettings

