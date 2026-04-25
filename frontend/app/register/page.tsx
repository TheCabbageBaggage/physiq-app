'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { apiUrl, appPath } from '@/lib/api'
import { useTranslation } from 'react-i18next'

export default function RegisterPage() {
  const { t } = useTranslation()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const passwordStrength =
    password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
      ? 'strong'
      : password.length >= 8
      ? 'medium'
      : 'weak'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('auth.passwords_no_match'))
      return
    }

    if (!acceptTerms) {
      setError(t('auth.accept_terms_required'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch(apiUrl('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || t('auth.registration_failed'))
        return
      }

      router.push(appPath('/'))
    } catch {
      setError(t('auth.connection_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-6">{t('auth.register')}</h1>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full border border-gray-300 rounded-lg py-2.5 px-3" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('auth.full_name')} required />
          <input className="w-full border border-gray-300 rounded-lg py-2.5 px-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.email')} required />

          <div className="relative">
            <input className="w-full border border-gray-300 rounded-lg py-2.5 px-3 pr-10" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('auth.password')} minLength={8} required />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-3 text-gray-500" aria-label={t('auth.password')}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <input className="w-full border border-gray-300 rounded-lg py-2.5 px-3 pr-10" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('auth.confirm_password')} minLength={8} required />
            <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-3 top-3 text-gray-500" aria-label={t('auth.confirm_password')}>
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <p className="text-xs text-gray-600">
            {t('auth.password_strength')}:{' '}
            <span className={passwordStrength === 'strong' ? 'text-emerald-600' : passwordStrength === 'medium' ? 'text-amber-600' : 'text-red-600'}>
              {t(`auth.${passwordStrength}`)}
            </span>
          </p>

          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5" required />
            <span>
              {t('auth.accept_terms')}{' '}
              <Link href={appPath('/terms')} className="text-blue-600 hover:underline">{t('auth.terms')}</Link>
              {' '}{t('auth.and')}{' '}
              <Link href={appPath('/privacy')} className="text-blue-600 hover:underline">{t('auth.privacy_policy')}</Link>.
            </span>
          </label>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? t('auth.creating_account') : t('auth.register')}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          {t('auth.has_account')} <Link href={appPath('/')} className="text-blue-600 hover:underline">{t('auth.login')}</Link>
        </p>
      </div>
    </main>
  )
}
