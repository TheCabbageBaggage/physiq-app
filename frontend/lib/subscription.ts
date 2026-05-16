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

export type SubscriptionHistoryItem = {
  stripe_event_id: string
  event_type: string
  created_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export type InvoiceItem = {
  invoice_id: string
  status: string | null
  amount_due_cents: number
  amount_paid_cents: number
  currency: string
  period_start: string | null
  period_end: string | null
  hosted_invoice_url: string | null
  invoice_pdf: string | null
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

export async function fetchSubscriptionHistory(limit = 30): Promise<SubscriptionHistoryItem[]> {
  const token = getAuthToken()
  if (!token) return []

  const res = await fetch(apiUrl(`/subscriptions/history?limit=${limit}`), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return []
  return res.json()
}

export async function fetchInvoices(limit = 20): Promise<InvoiceItem[]> {
  const token = getAuthToken()
  if (!token) return []

  const res = await fetch(apiUrl(`/subscriptions/invoices?limit=${limit}`), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return []
  return res.json()
}
