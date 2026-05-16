'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { apiUrl, browserPath, getAuthToken } from '@/lib/api'

type AdminOverview = {
  api_status: string
  ml_status: string
  ml_model_version: string | null
  database: { url: string; dialect: string; size_bytes: number | null }
  system: { started_at: string; uptime_seconds: number }
  users: { total: number; active_subscriptions: number }
  measurements: { total: number }
  opportunities: { total: number; waiting: number; converted: number }
  payments: { subscription_events_total: number; recent_events: { stripe_event_id: string; event_type: string; created_at: string | null }[] }
}

type Opportunity = {
  id: number
  uuid: string
  email: string
  name?: string | null
  status: string
  created_at?: string | null
}

type PricingTier = {
  tier: string
  name: string
  monthly_price_cents: number
  annual_price_cents?: number | null
  currency: string
  is_active: boolean
}

type Coupon = {
  code: string
  description?: string | null
  discount_type: string
  discount_value: number
  is_active: boolean
  used_count: number
  max_uses: number
}

type AuditItem = {
  id: number
  actor_user_id: number | null
  action: string
  resource_type: string
  resource_id: string | null
  created_at: string | null
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [pricing, setPricing] = useState<PricingTier[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [audit, setAudit] = useState<AuditItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [newCouponCode, setNewCouponCode] = useState('')

  const token = useMemo(() => getAuthToken(), [])

  async function loadAll() {
    if (!token) {
      window.location.href = browserPath('/login')
      return
    }

    setLoading(true)
    setError('')

    try {
      const [overviewRes, oppRes, pricingRes, couponsRes, auditRes] = await Promise.all([
        fetch(apiUrl('/admin/overview'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl('/admin/opportunities?per_page=20'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl('/admin/pricing'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl('/admin/coupons'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl('/admin/audit-logs?limit=25'), { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (!overviewRes.ok) throw new Error('Could not load admin overview')
      if (!oppRes.ok) throw new Error('Could not load opportunities')
      if (!pricingRes.ok) throw new Error('Could not load pricing')
      if (!couponsRes.ok) throw new Error('Could not load coupons')
      if (!auditRes.ok) throw new Error('Could not load audit logs')

      const overviewData = await overviewRes.json()
      const oppData = await oppRes.json()
      const pricingData = await pricingRes.json()
      const couponsData = await couponsRes.json()
      const auditData = await auditRes.json()

      setData(overviewData)
      setOpportunities(oppData.opportunities || [])
      setPricing(pricingData || [])
      setCoupons(couponsData || [])
      setAudit(auditData.items || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function markContacted(uuid: string) {
    if (!token) return
    setBusy(true)
    try {
      const res = await fetch(apiUrl(`/admin/opportunities/${uuid}/contact`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to mark as contacted')
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function convert(uuid: string) {
    if (!token) return
    setBusy(true)
    try {
      const res = await fetch(apiUrl(`/admin/opportunities/${uuid}/convert`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.detail || 'Failed to convert')
      }
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function deactivateCoupon(code: string) {
    if (!token) return
    setBusy(true)
    try {
      const res = await fetch(apiUrl(`/admin/coupons/${encodeURIComponent(code)}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to deactivate coupon')
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function createQuickCoupon(e: FormEvent) {
    e.preventDefault()
    if (!token || !newCouponCode.trim()) return
    setBusy(true)
    try {
      const res = await fetch(apiUrl('/admin/coupons'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: newCouponCode.trim().toUpperCase(),
          description: 'Admin quick coupon',
          discount_type: 'percentage',
          discount_value: 10,
          max_uses: 100,
          applicable_tiers: ['pro', 'enterprise'],
          min_interval: 'month',
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.detail || 'Failed to create coupon')
      }
      setNewCouponCode('')
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="text-gray-600">Loading admin overview...</div>
  if (error) return <div className="rounded-lg bg-red-100 px-4 py-3 text-red-800">{error}</div>
  if (!data) return <div className="text-gray-600">No data.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Console</h1>
          <p className="mt-2 text-gray-600">Operations, pricing, waitlist conversion, and audit telemetry.</p>
        </div>
        <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white" onClick={loadAll} disabled={busy}>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Users" value={String(data.users.total)} sub={`Active subs: ${data.users.active_subscriptions}`} />
        <Card title="Measurements" value={String(data.measurements.total)} sub="Total entries" />
        <Card title="Waitlist" value={String(data.opportunities.total)} sub={`Waiting: ${data.opportunities.waiting} • Converted: ${data.opportunities.converted}`} />
        <Card title="Payment Events" value={String(data.payments.subscription_events_total)} sub="Stripe webhook events" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">System Health</h2>
          <p className="text-sm text-gray-700">API: <strong>{data.api_status}</strong></p>
          <p className="text-sm text-gray-700">ML Service: <strong>{data.ml_status}</strong> {data.ml_model_version ? `(${data.ml_model_version})` : ''}</p>
          <p className="text-sm text-gray-700">DB Dialect: <strong>{data.database.dialect}</strong></p>
          <p className="text-sm text-gray-700">DB Size: <strong>{data.database.size_bytes ?? 'n/a'} bytes</strong></p>
          <p className="text-sm text-gray-700">Uptime: <strong>{data.system.uptime_seconds}s</strong></p>
        </section>

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Pricing Tiers</h2>
          <ul className="space-y-2 text-sm">
            {pricing.map((p) => (
              <li key={p.tier} className="rounded-md border border-gray-200 px-3 py-2">
                <strong>{p.name}</strong> ({p.tier}) • {p.currency} {(p.monthly_price_cents / 100).toFixed(2)}/mo • {p.is_active ? 'active' : 'inactive'}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-3 text-xl font-semibold text-gray-900">Waitlist Opportunities</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.uuid} className="border-t border-gray-100">
                  <td className="px-3 py-2">{o.email}</td>
                  <td className="px-3 py-2">{o.name || '-'}</td>
                  <td className="px-3 py-2">{o.status}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button className="rounded bg-blue-600 px-2 py-1 text-xs text-white" onClick={() => markContacted(o.uuid)} disabled={busy}>Contacted</button>
                    <button className="rounded bg-emerald-600 px-2 py-1 text-xs text-white" onClick={() => convert(o.uuid)} disabled={busy}>Convert</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Coupons</h2>
          <form onSubmit={createQuickCoupon} className="mb-4 flex gap-2">
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={newCouponCode}
              onChange={(e) => setNewCouponCode(e.target.value)}
              placeholder="New coupon code (10% quick coupon)"
            />
            <button className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white" disabled={busy}>Create</button>
          </form>
          <ul className="space-y-2 text-sm">
            {coupons.map((c) => (
              <li key={c.code} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                <span>{c.code} • {c.discount_type}:{c.discount_value} • used {c.used_count}/{c.max_uses || '∞'} • {c.is_active ? 'active' : 'inactive'}</span>
                {c.is_active && (
                  <button className="rounded bg-red-600 px-2 py-1 text-xs text-white" onClick={() => deactivateCoupon(c.code)} disabled={busy}>Deactivate</button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Audit Trail</h2>
          <ul className="space-y-2 text-xs text-gray-700">
            {audit.map((a) => (
              <li key={a.id} className="rounded-md border border-gray-200 px-3 py-2">
                <div><strong>{a.action}</strong> on {a.resource_type} {a.resource_id ? `(${a.resource_id})` : ''}</div>
                <div>actor={a.actor_user_id ?? 'system'} • {a.created_at ? new Date(a.created_at).toLocaleString() : '-'}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Card({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-600">{sub}</p>
    </div>
  )
}
