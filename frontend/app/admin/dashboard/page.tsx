'use client'

import { useEffect, useState } from 'react'
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

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      window.location.href = browserPath('/login')
      return
    }

    fetch(apiUrl('/admin/overview'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload.detail || 'Could not load admin overview')
        }
        return res.json()
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-600">Loading admin overview...</div>
  if (error) return <div className="rounded-lg bg-red-100 px-4 py-3 text-red-800">{error}</div>
  if (!data) return <div className="text-gray-600">No data.</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Overview</h1>
        <p className="mt-2 text-gray-600">Operational health, growth metrics, payments, and system status.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Users" value={String(data.users.total)} sub={`Active subs: ${data.users.active_subscriptions}`} />
        <Card title="Measurements" value={String(data.measurements.total)} sub="Total entries" />
        <Card title="Waitlist" value={String(data.opportunities.total)} sub={`Waiting: ${data.opportunities.waiting} • Converted: ${data.opportunities.converted}`} />
        <Card title="Payment Events" value={String(data.payments.subscription_events_total)} sub="Stripe webhook events" />
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-3 text-xl font-semibold text-gray-900">System Health</h2>
        <p className="text-sm text-gray-700">API: <strong>{data.api_status}</strong></p>
        <p className="text-sm text-gray-700">ML Service: <strong>{data.ml_status}</strong> {data.ml_model_version ? `(${data.ml_model_version})` : ''}</p>
        <p className="text-sm text-gray-700">DB Dialect: <strong>{data.database.dialect}</strong></p>
        <p className="text-sm text-gray-700">DB Size: <strong>{data.database.size_bytes ?? 'n/a'} bytes</strong></p>
        <p className="text-sm text-gray-700">Uptime: <strong>{data.system.uptime_seconds}s</strong></p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-3 text-xl font-semibold text-gray-900">Recent Payment Events</h2>
        {data.payments.recent_events.length === 0 ? (
          <p className="text-sm text-gray-500">No events yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Event Type</th>
                  <th className="px-3 py-2 text-left">Stripe Event ID</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.recent_events.map((e) => (
                  <tr key={e.stripe_event_id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{e.created_at ? new Date(e.created_at).toLocaleString() : '-'}</td>
                    <td className="px-3 py-2">{e.event_type}</td>
                    <td className="px-3 py-2">{e.stripe_event_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
