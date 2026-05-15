'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DEFAULT_SUBSCRIPTION, fetchSubscriptionStatus, hasPlanAccess, type PlanType, type SubscriptionInfo } from '@/lib/subscription'
import { useTranslation } from 'react-i18next'

type GuardPlan = Exclude<PlanType, 'free'>

export default function FeatureGuard({
  plan,
  children,
  title,
}: {
  plan: GuardPlan
  children: React.ReactNode
  title?: string
}) {
  const { t } = useTranslation()
  const [subscription, setSubscription] = useState<SubscriptionInfo>(DEFAULT_SUBSCRIPTION)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptionStatus()
      .then(setSubscription)
      .catch(() => setSubscription(DEFAULT_SUBSCRIPTION))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="rounded-xl bg-white p-6 shadow text-gray-600">{t('errors.loading_subscription')}</div>
  }

  if (!hasPlanAccess(subscription.plan_type, subscription.subscription_status, plan)) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="text-xl font-semibold text-gray-900">{title || t('coaching.title')}</h2>
        <p className="mt-2 text-gray-700">
          {t('coaching.premium_description', { plan: plan.toUpperCase() })}
        </p>
        <Link href="/pricing" className="inline-block mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white">
          {t('coaching.view_plans')}
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
