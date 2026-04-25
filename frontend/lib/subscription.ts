import { apiUrl, getAuthToken } from '@/lib/api'

export type PlanType = 'free' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'inactive' | 'canceled'

export type SubscriptionInfo = {
  plan_type: PlanType
  subscription_status: SubscriptionStatus
  current_period_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  features: string[]
}

const PLAN_LEVELS: Record<PlanType, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

export function hasPlanAccess(currentPlan: PlanType, currentStatus: SubscriptionStatus, requiredPlan: Exclude<PlanType, 'free'>) {
  if (currentStatus !== 'active') return false
  return PLAN_LEVELS[currentPlan] >= PLAN_LEVELS[requiredPlan]
}

export const DEFAULT_SUBSCRIPTION: SubscriptionInfo = {
  plan_type: 'free',
  subscription_status: 'inactive',
  current_period_end: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  features: ['Basic tracking', 'CSV export', 'Charts'],
}

export async function fetchSubscriptionStatus(): Promise<SubscriptionInfo> {
  const token = getAuthToken()
  if (!token) return DEFAULT_SUBSCRIPTION

  const res = await fetch(apiUrl('/subscriptions/status'), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    return DEFAULT_SUBSCRIPTION
  }

  return res.json()
}
