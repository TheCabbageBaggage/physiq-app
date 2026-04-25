'use client'

import { useEffect, useState } from 'react'
import { apiUrl, getAuthToken, appPath } from '@/lib/api'
import { DEFAULT_SUBSCRIPTION, fetchSubscriptionStatus, type PlanType } from '@/lib/subscription'
import { useTranslation } from 'react-i18next'

type BillingCycle = 'monthly' | 'annual'

export default function PricingPage() {
  const { t } = useTranslation()
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [subscription, setSubscription] = useState(DEFAULT_SUBSCRIPTION)
  const [msg, setMsg] = useState<string | null>(null)

  const plans = [
    {
      key: 'free' as PlanType,
      title: t('pricing.plans.free.title'),
      monthly: t('pricing.plans.free.price_monthly'),
      annual: t('pricing.plans.free.price_annual'),
      features: t('pricing.plans.free.features', { returnObjects: true }) as string[],
      subscribable: false,
    },
    {
      key: 'pro' as PlanType,
      title: t('pricing.plans.pro.title'),
      monthly: t('pricing.plans.pro.price_monthly'),
      annual: t('pricing.plans.pro.price_annual'),
      features: t('pricing.plans.pro.features', { returnObjects: true }) as string[],
      subscribable: true,
    },
    {
      key: 'enterprise' as PlanType,
      title: t('pricing.plans.enterprise.title'),
      monthly: t('pricing.plans.enterprise.price_monthly'),
      annual: t('pricing.plans.enterprise.price_annual'),
      features: t('pricing.plans.enterprise.features', { returnObjects: true }) as string[],
      subscribable: true,
    },
  ]

  useEffect(() => {
    fetchSubscriptionStatus().then(setSubscription).catch(() => setSubscription(DEFAULT_SUBSCRIPTION))

    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    if (checkout === 'success') setMsg(t('pricing.checkout_success'))
    if (checkout === 'cancel') setMsg(t('pricing.checkout_canceled'))
  }, [t])

  async function startCheckout(plan_type: 'pro' | 'enterprise') {
    const token = getAuthToken()
    if (!token) {
      window.location.href = appPath('/')
      return
    }

    setLoadingPlan(plan_type)
    setMsg(null)

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const res = await fetch(apiUrl('/subscriptions/create-checkout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_type,
          success_url: `${appUrl}${appPath('/pricing')}?checkout=success`,
          cancel_url: `${appUrl}${appPath('/pricing')}?checkout=cancel`,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || t('errors.generic'))

      window.location.href = data.checkout_url
    } catch (error: any) {
      setMsg(error.message || t('errors.generic'))
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('pricing.title')}</h1>
        <p className="text-gray-600 mt-2">{t('pricing.description')}</p>
      </div>

      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
        <button onClick={() => setBillingCycle('monthly')} className={`rounded-md px-3 py-1.5 text-sm ${billingCycle === 'monthly' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>{t('pricing.monthly')}</button>
        <button onClick={() => setBillingCycle('annual')} className={`rounded-md px-3 py-1.5 text-sm ${billingCycle === 'annual' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>{t('pricing.annual')}</button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-900">
        {t('pricing.current_plan')} <strong>{subscription.plan_type.toUpperCase()}</strong> {subscription.subscription_status === 'active' ? `(${t('pricing.active')})` : `(${t('pricing.not_active')})`}
      </div>

      {msg && <div className="rounded-lg bg-gray-100 text-gray-800 px-4 py-3">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.key === subscription.plan_type && subscription.subscription_status === 'active'
          return (
            <div key={plan.key} className="bg-white rounded-xl border shadow-sm p-6 flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{plan.title}</h2>
                <p className="text-gray-600">{billingCycle === 'monthly' ? plan.monthly : plan.annual}</p>
              </div>
              <ul className="text-sm text-gray-700 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              {plan.subscribable ? (
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  disabled={!!loadingPlan || isCurrent}
                  onClick={() => startCheckout(plan.key as 'pro' | 'enterprise')}
                >
                  {isCurrent ? t('pricing.current_plan_button') : loadingPlan === plan.key ? t('pricing.redirecting') : t('pricing.subscribe_to', { plan: plan.title })}
                </button>
              ) : (
                <div className="text-sm text-gray-500">{t('pricing.default_plan')}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
