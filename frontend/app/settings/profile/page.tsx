'use client'

import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { apiUrl, API_ORIGIN, getAuthToken, appPath } from '@/lib/api'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { DEFAULT_SUBSCRIPTION, fetchSubscriptionStatus, type SubscriptionInfo } from '@/lib/subscription'

type ProfilePayload = {
  full_name: string
  email: string
  birth_date: string
  gender: string
  phone: string
  address: string
  city: string
  postal_code: string
  country: string
  profile_image_url?: string | null
}

export default function SettingsProfilePage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile')
  const [profile, setProfile] = useState<ProfilePayload>({
    full_name: '',
    email: '',
    birth_date: '',
    gender: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    profile_image_url: null,
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionInfo>(DEFAULT_SUBSCRIPTION)
  const [cancelingSub, setCancelingSub] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      window.location.href = appPath('/')
      return
    }

    async function loadProfile() {
      try {
        const res = await fetch(apiUrl('/users/profile'), {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) throw new Error(t('settings.load_failed'))

        const data = await res.json()
        setProfile({
          full_name: data.full_name || '',
          email: data.email || '',
          birth_date: data.birth_date || '',
          gender: data.gender || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          country: data.country || '',
          profile_image_url: data.profile_image_url || null,
        })
        setPreviewUrl(data.profile_image_url ? `${API_ORIGIN}${data.profile_image_url}` : null)
        const sub = await fetchSubscriptionStatus()
        setSubscription(sub)
      } catch {
        setError(t('settings.load_failed'))
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [t])

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault()
    const token = getAuthToken()
    if (!token) return

    setSavingProfile(true)
    setMessage(null)
    setError(null)

    try {
      const res = await fetch(apiUrl('/users/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: profile.full_name,
          birth_date: profile.birth_date || null,
          gender: profile.gender || null,
          phone: profile.phone || null,
          address: profile.address || null,
          city: profile.city || null,
          postal_code: profile.postal_code || null,
          country: profile.country || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || t('settings.save_failed'))

      setMessage(t('settings.profile_updated'))
    } catch (err: any) {
      setError(err.message || t('settings.save_failed'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function onCancelSubscription() {
    const token = getAuthToken()
    if (!token) return

    setCancelingSub(true)
    setMessage(null)
    setError(null)

    try {
      const res = await fetch(apiUrl('/subscriptions/cancel'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || t('settings.cancel_failed'))

      setMessage(data.message || t('settings.subscription') + ' ' + t('common.canceled'))
      const sub = await fetchSubscriptionStatus()
      setSubscription(sub)
    } catch (err: any) {
      setError(err.message || t('settings.cancel_failed'))
    } finally {
      setCancelingSub(false)
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault()
    const token = getAuthToken()
    if (!token) return

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError(t('auth.passwords_no_match'))
      return
    }

    setChangingPassword(true)
    setMessage(null)
    setError(null)

    try {
      const res = await fetch(apiUrl('/users/password'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || t('settings.password_change_failed'))

      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setMessage(t('settings.password_changed'))
    } catch (err: any) {
      setError(err.message || t('settings.password_change_failed'))
    } finally {
      setChangingPassword(false)
    }
  }

  async function onUploadImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const token = getAuthToken()
    if (!token) return

    setMessage(null)
    setError(null)

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch(apiUrl('/users/profile-image'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || t('settings.upload_failed'))

      const imageUrl = data.profile_image_url ? `${API_ORIGIN}${data.profile_image_url}` : null
      setPreviewUrl(imageUrl)
      setProfile((prev) => ({ ...prev, profile_image_url: data.profile_image_url }))
      setMessage(t('settings.image_uploaded'))
    } catch (err: any) {
      setError(err.message || t('settings.upload_failed'))
    }
  }

  if (loading) {
    return <div className="text-gray-600">{t('settings.loading')}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('common.settings')}</h1>
        <p className="text-gray-600 mt-2">{t('settings.description')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['profile', t('settings.profile')],
          ['security', t('settings.security')],
          ['preferences', t('settings.preferences')],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'profile' | 'security' | 'preferences')}
            className={`px-4 py-2 rounded-lg border ${
              activeTab === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message && <div className="rounded-lg bg-green-100 text-green-800 px-4 py-2">{message}</div>}
      {error && <div className="rounded-lg bg-red-100 text-red-800 px-4 py-2">{error}</div>}

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
            <form onSubmit={onSaveProfile} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('settings.personal_data')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input className="border rounded-lg p-3" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder={t('auth.full_name')} required />
                  <input className="border rounded-lg p-3 bg-gray-100" value={profile.email} disabled placeholder={t('auth.email')} />
                  <input className="border rounded-lg p-3" type="date" value={profile.birth_date} onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })} />
                  <select
                    className="border rounded-lg p-3 bg-white"
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  >
                    <option value="">{t('settings.select_gender') || 'Select gender'}</option>
                    <option value="male">{t('settings.gender_male') || 'Male'}</option>
                    <option value="female">{t('settings.gender_female') || 'Female'}</option>
                    <option value="other">{t('settings.gender_other') || 'Other'}</option>
                    <option value="prefer_not_to_say">{t('settings.gender_prefer_not') || 'Prefer not to say'}</option>
                  </select>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('settings.contact_info')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input className="border rounded-lg p-3" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder={t('settings.phone')} />
                  <input className="border rounded-lg p-3" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder={t('settings.address')} />
                  <input className="border rounded-lg p-3" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder={t('settings.city')} />
                  <input className="border rounded-lg p-3" value={profile.postal_code} onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })} placeholder={t('settings.postal_code')} />
                  <input className="border rounded-lg p-3 md:col-span-2" value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} placeholder={t('settings.country')} />
                </div>
              </div>

              <button disabled={savingProfile} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {savingProfile ? t('settings.saving') : t('settings.save_profile')}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('settings.profile_image')}</h2>
            <div className="space-y-4">
              {previewUrl ? (
                <img src={previewUrl} alt="Profile" className="h-40 w-40 rounded-full object-cover border" />
              ) : (
                <div className="h-40 w-40 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">{t('settings.no_image')}</div>
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onUploadImage} className="block w-full text-sm" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('settings.change_password')}</h2>
          <form onSubmit={onChangePassword} className="space-y-4">
            <input className="border rounded-lg p-3 w-full" type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} placeholder={t('settings.current_password')} required />
            <input className="border rounded-lg p-3 w-full" type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} placeholder={t('settings.new_password')} required />
            <input className="border rounded-lg p-3 w-full" type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} placeholder={t('settings.confirm_new_password')} required />
            <p className="text-sm text-gray-500">{t('auth.password_requirements')}</p>
            <button disabled={changingPassword} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {changingPassword ? t('settings.updating') : t('settings.update_password')}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="bg-white rounded-xl shadow p-6 text-gray-700 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('settings.language')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('settings.language_help')}</p>
          </div>
          <LanguageSwitcher />

          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{t('settings.subscription')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('pricing.current_plan')} <strong>{subscription.plan_type.toUpperCase()}</strong> ({subscription.subscription_status})</p>
            {subscription.current_period_end && (
              <p className="text-sm text-gray-600 mt-1">{t('settings.next_billing_date')} {new Date(subscription.current_period_end).toLocaleDateString()}</p>
            )}
            {subscription.stripe_subscription_id && subscription.subscription_status === 'active' && (
              <button
                onClick={onCancelSubscription}
                disabled={cancelingSub}
                className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50"
              >
                {cancelingSub ? t('settings.canceling') : t('settings.cancel_subscription')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
