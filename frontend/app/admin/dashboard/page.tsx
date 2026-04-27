'use client'

import AdminLayout from '@/components/AdminLayout'
import { useState, useEffect, useCallback } from 'react'
import { apiUrl, getAuthToken } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { Users, Calculator, Mail, UserPlus, Activity } from 'lucide-react'

function DashboardContent() {
  const [overview, setOverview] = useState<any>(null)
  const [calcTrend, setCalcTrend] = useState<any[]>([])
  const [waitlistTrend, setWaitlistTrend] = useState<any[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  const token = getAuthToken()
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [overviewRes, calcRes, waitlistRes] = await Promise.all([
        fetch(apiUrl('/admin/stats/overview'), { headers }),
        fetch(apiUrl(`/admin/stats/calculations?days=${days}`), { headers }),
        fetch(apiUrl(`/admin/stats/waitlist?days=${days}`), { headers }),
      ])
      if (overviewRes.ok) setOverview(await overviewRes.json())
      if (calcRes.ok) setCalcTrend((await calcRes.json()).trend || [])
      if (waitlistRes.ok) setWaitlistTrend((await waitlistRes.json()).trend || [])
    } catch (e) {
      console.error('Failed to load admin stats', e)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !overview) {
    return <div className="text-center py-12 text-gray-500">Loading dashboard data...</div>
  }

  const StatCard = ({ title, value, sub, icon }: { title: string; value: string; sub?: string; icon: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-blue-50 text-blue-700">{icon}</div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-sm text-gray-500 mt-1">System-wide metrics and analytics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={overview?.users?.total?.toLocaleString() ?? '—'}
          sub={`+${overview?.users?.new_30d ?? 0} in 30 days`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Active Subscriptions"
          value={overview?.users?.active_subscriptions?.toLocaleString() ?? '—'}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          title="Total Calculations"
          value={overview?.calculations?.total?.toLocaleString() ?? '—'}
          sub={`${overview?.calculations?.today ?? 0} today`}
          icon={<Calculator className="h-5 w-5" />}
        />
        <StatCard
          title="Waitlist"
          value={overview?.waitlist?.total?.toLocaleString() ?? '—'}
          sub={`${overview?.waitlist?.conversion_rate_pct ?? 0}% conversion`}
          icon={<UserPlus className="h-5 w-5" />}
        />
      </div>

      {/* Plan Distribution */}
      {overview?.plans && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {Object.entries(overview.plans).map(([plan, count]) => (
              <div key={plan} className="text-center p-4 rounded-lg bg-gray-50">
                <p className="text-2xl font-bold text-gray-900">{count as number}</p>
                <p className="text-sm text-gray-500 capitalize">{plan}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Zeitraum:</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              days === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            {d} Tage
          </button>
        ))}
      </div>

      {/* Calculations Trend Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculations Trend</h3>
        <div className="h-[300px]">
          {calcTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calcTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#2C5F7C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
          )}
        </div>
      </div>

      {/* Waitlist Signups Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Waitlist Signups</h3>
        <div className="h-[300px]">
          {waitlistTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waitlistTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3D8B8B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
          )}
        </div>
      </div>

      {/* Waitlist Stats */}
      {overview?.waitlist?.by_status && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Waitlist Status Distribution</h3>
          <div className="grid grid-cols-4 gap-4 max-w-lg">
            {Object.entries(overview.waitlist.by_status).map(([status, count]) => (
              <div key={status} className="text-center p-4 rounded-lg bg-gray-50">
                <p className="text-2xl font-bold text-gray-900">{count as number}</p>
                <p className="text-sm text-gray-500 capitalize">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Stats */}
      {overview?.email && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Stats</h3>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <span className="text-gray-700">
              Total emails sent: <strong>{overview.email.total_sent}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      <DashboardContent />
    </AdminLayout>
  )
}
