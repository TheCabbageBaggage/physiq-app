'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { apiUrl, getAuthToken } from '@/lib/api'
import { Tag, Plus, Eye, X, CheckCircle, Users, Calendar } from 'lucide-react'

export default function AdminPricingPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [coupons, setCoupons] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'plans' | 'coupons' | 'grants'>('plans')
  const [loading, setLoading] = useState(true)
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [showGrantForm, setShowGrantForm] = useState(false)
  const [grants, setGrants] = useState<any[]>([])

  const token = getAuthToken()
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const loadData = async () => {
    setLoading(true)
    try {
      const [plansRes, couponsRes] = await Promise.all([
        fetch(apiUrl('/admin/pricing'), { headers }),
        fetch(apiUrl('/admin/coupons'), { headers }),
      ])
      if (plansRes.ok) setPlans((await plansRes.json()).plans || [])
      if (couponsRes.ok) setCoupons((await couponsRes.json()).coupons || [])
    } catch (e) {
      console.error('Failed to load pricing data', e)
    } finally {
      setLoading(false)
    }
  }

  const loadGrants = async () => {
    try {
      const res = await fetch(apiUrl('/admin/users/grants'), { headers })
      if (res.ok) setGrants((await res.json()).grants || [])
    } catch (e) {
      console.error('Failed to load grants', e)
    }
  }

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (activeTab === 'grants') loadGrants() }, [activeTab])

  if (loading) {
    return <AdminLayout><div className="text-center py-12 text-gray-500">Loading...</div></AdminLayout>
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pricing & Coupon Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage pricing plans, coupons, and free grants</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          {([
            { key: 'plans', label: 'Pricing Plans' },
            { key: 'coupons', label: 'Coupons' },
            { key: 'grants', label: 'Free Grants' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pricing Plans Tab */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            {plans.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                No pricing plans configured. Create plans via API.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 capitalize">{plan.plan}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><strong>Monthly:</strong> {plan.price_monthly}</p>
                      <p><strong>Annual:</strong> {plan.price_annual}</p>
                      {plan.stripe_price_id_monthly && (
                        <p className="text-xs text-gray-500 truncate">Stripe Monthly: {plan.stripe_price_id_monthly}</p>
                      )}
                      {plan.stripe_price_id_annual && (
                        <p className="text-xs text-gray-500 truncate">Stripe Annual: {plan.stripe_price_id_annual}</p>
                      )}
                    </div>
                    {plan.features && plan.features.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">Features ({plan.features.length}):</p>
                        <ul className="text-xs text-gray-600 space-y-0.5">
                          {plan.features.slice(0, 5).map((f: string, i: number) => (
                            <li key={i} className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {f}
                            </li>
                          ))}
                          {plan.features.length > 5 && (
                            <li className="text-gray-400">+{plan.features.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Coupons Tab */}
        {activeTab === 'coupons' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowCouponForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Create Coupon
            </button>

            {coupons.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                No coupons yet.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Discount</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Uses</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Expires</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.id} className="border-b border-gray-100">
                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{c.code}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {c.discount_percent > 0 ? `${c.discount_percent}%` : ''}
                          {c.discount_percent > 0 && c.discount_amount_cents > 0 ? ' + ' : ''}
                          {c.discount_amount_cents > 0 ? `€${(c.discount_amount_cents / 100).toFixed(2)}` : ''}
                          {c.discount_percent === 0 && c.discount_amount_cents === 0 ? '—' : ''}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {c.current_uses}{c.max_uses > 0 ? ` / ${c.max_uses}` : ' (unlimited)'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {c.expires_at ? new Date(c.expires_at).toLocaleDateString('de-DE') : 'Never'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Free Grants Tab */}
        {activeTab === 'grants' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowGrantForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Grant Free Months
            </button>

            {grants.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                No free grants yet.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">User ID</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Months</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grants.map((g) => (
                      <tr key={g.id} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-gray-900 font-medium">#{g.user_id}</td>
                        <td className="px-4 py-3 text-gray-700">{g.months} months</td>
                        <td className="px-4 py-3 text-gray-500">{g.reason || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {g.created_at ? new Date(g.created_at).toLocaleDateString('de-DE') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Coupon Create Modal */}
        {showCouponForm && <CouponForm onClose={() => { setShowCouponForm(false); loadData() }} />}

        {/* Grant Free Months Modal */}
        {showGrantForm && <GrantForm onClose={() => { setShowGrantForm(false); loadGrants() }} />}
      </div>
    </AdminLayout>
  )
}

function CouponForm({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [maxUses, setMaxUses] = useState(0)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setResult(null)
    try {
      const token = getAuthToken()
      const res = await fetch(apiUrl('/admin/coupons'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.toUpperCase(), discount_percent: discountPercent, max_uses: maxUses, description: description || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to create coupon')
      }
      setResult('Coupon created successfully!')
      setTimeout(onClose, 1500)
    } catch (e: any) {
      setResult(`Error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full m-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Create Coupon</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
            <input type="text" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase"
              placeholder="SUMMER2025" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
            <input type="number" min={0} max={100} value={discountPercent} onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (0 = unlimited)</label>
            <input type="number" min={0} value={maxUses} onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Summer promotion 2025" />
          </div>
          {result && (
            <div className={`text-sm p-2 rounded ${result.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {result}
            </div>
          )}
          <button type="submit" disabled={saving}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Coupon'}
          </button>
        </form>
      </div>
    </div>
  )
}

function GrantForm({ onClose }: { onClose: () => void }) {
  const [userId, setUserId] = useState('')
  const [months, setMonths] = useState(1)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setResult(null)
    try {
      const token = getAuthToken()
      const res = await fetch(apiUrl('/admin/users/grant-free-months'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: parseInt(userId), months, reason: reason || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to grant months')
      }
      setResult(`Granted ${months} months to user #${userId}!`)
      setTimeout(onClose, 1500)
    } catch (e: any) {
      setResult(`Error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full m-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Grant Free Months</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input type="number" required min={1} value={userId} onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Months</label>
            <input type="number" required min={1} max={120} value={months} onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Beta tester reward" />
          </div>
          {result && (
            <div className={`text-sm p-2 rounded ${result.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {result}
            </div>
          )}
          <button type="submit" disabled={saving}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Granting...' : 'Grant Free Months'}
          </button>
        </form>
      </div>
    </div>
  )
}
