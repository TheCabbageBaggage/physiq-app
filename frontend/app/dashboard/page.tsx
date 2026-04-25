'use client'

import { useEffect, useMemo, useState } from 'react'
import MetricCard from '@/components/MetricCard'
import RecentMeasurements from '@/components/RecentMeasurements'
import TrendIndicator from '@/components/TrendIndicator'
import { Activity, TrendingUp, Heart, Target } from 'lucide-react'
import { apiUrl, getAuthToken, appPath } from '@/lib/api'
import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'
import Link from 'next/link'
import { DEFAULT_SUBSCRIPTION, fetchSubscriptionStatus, hasPlanAccess, type SubscriptionInfo } from '@/lib/subscription'

const ChartComponent = dynamic(() => import('@/components/ChartComponent'), { ssr: false })

type DaysFilter = 7 | 30 | 90 | 0

type MetricOption = {
  key: 'weight' | 'body_fat'
  label: string
  unit: string
  color: string
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [days, setDays] = useState<DaysFilter>(30)
  const [selectedMetric, setSelectedMetric] = useState<MetricOption['key']>('weight')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<Record<string, { date: string; label: string; value: number }[]>>({
    weight: [],
    body_fat: [],
  })
  const [stats, setStats] = useState<any>(null)
  const [latestMeasurement, setLatestMeasurement] = useState<any>(null)
  const [subscription, setSubscription] = useState<SubscriptionInfo>(DEFAULT_SUBSCRIPTION)

  const METRICS = useMemo<MetricOption[]>(() => [
    { key: 'weight', label: t('measurements.weight'), unit: 'kg', color: '#2563eb' },
    { key: 'body_fat', label: t('measurements.body_fat'), unit: '%', color: '#16a34a' },
  ], [t])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) window.location.href = appPath('/')
  }, [])

  useEffect(() => {
    fetchSubscriptionStatus().then(setSubscription).catch(() => setSubscription(DEFAULT_SUBSCRIPTION))
  }, [])

  useEffect(() => {
    async function loadCharts() {
      setLoading(true)
      setError(null)

      try {
        const token = getAuthToken()
        const metricKeys: MetricOption['key'][] = ['weight', 'body_fat']

        const responses = await Promise.all(
          metricKeys.map(async (metric) => {
            const res = await fetch(apiUrl(`/measurements/chart?metric=${metric}&days=${days}`), {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })

            if (!res.ok) {
              throw new Error(`Chart request failed for ${metric}`)
            }

            const data: { dates: string[]; values: number[] } = await res.json()
            const points = data.dates.map((d, i) => {
              const dt = new Date(d)
              const label = dt.toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit' })
              return {
                date: d,
                label,
                value: data.values[i],
              }
            })
            return { metric, points }
          })
        )

        setChartData(
          responses.reduce((acc, item) => {
            acc[item.metric] = item.points
            return acc
          }, {} as Record<string, { date: string; label: string; value: number }[]>)
        )
      } catch (e) {
        setError(t('errors.generic'))
      } finally {
        setLoading(false)
      }
    }

    loadCharts()
  }, [days, t])

  useEffect(() => {
    async function loadStatsAndLatest() {
      try {
        const token = getAuthToken()

        const [statsRes, latestRes] = await Promise.all([
          fetch(apiUrl('/measurements/stats'), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          fetch(apiUrl('/measurements?limit=1'), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ])

        if (!statsRes.ok || !latestRes.ok) {
          throw new Error('Failed to load metrics')
        }

        const statsData = await statsRes.json()
        const latestData = await latestRes.json()

        setStats(statsData)
        setLatestMeasurement(Array.isArray(latestData) ? latestData[0] || null : null)
      } catch {
        setStats(null)
        setLatestMeasurement(null)
      }
    }

    loadStatsAndLatest()
  }, [])

  const currentMetric = useMemo(() => METRICS.find((m) => m.key === selectedMetric)!, [METRICS, selectedMetric])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('common.dashboard')}</h1>
        <p className="text-gray-600 mt-2">{t('dashboard.welcome')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <MetricCard
            title={t('dashboard.current_weight')}
            value={`${latestMeasurement?.weight_kg?.toFixed?.(1) ?? '--'} kg`}
            change={`${stats?.trends?.weight?.change > 0 ? '+' : ''}${stats?.trends?.weight?.change?.toFixed?.(1) ?? '0.0'} kg`}
            trend="neutral"
            icon={<Activity className="h-5 w-5" />}
            color="blue"
          />
          {stats?.trends?.weight && (
            <TrendIndicator
              direction={stats.trends.weight.direction}
              change={stats.trends.weight.change}
              metric="weight"
              unit="kg"
            />
          )}
        </div>

        <div className="space-y-2">
          <MetricCard
            title={t('dashboard.body_fat')}
            value={`${(latestMeasurement?.body_fat_percent ?? latestMeasurement?.body_fat_percentage)?.toFixed?.(1) ?? '--'}%`}
            change={`${stats?.trends?.body_fat?.change > 0 ? '+' : ''}${stats?.trends?.body_fat?.change?.toFixed?.(1) ?? '0.0'}%`}
            trend="neutral"
            icon={<TrendingUp className="h-5 w-5" />}
            color="green"
          />
          {stats?.trends?.body_fat && (
            <TrendIndicator
              direction={stats.trends.body_fat.direction}
              change={stats.trends.body_fat.change}
              metric="body_fat"
              unit="%"
            />
          )}
        </div>

        <div className="space-y-2">
          <MetricCard
            title={t('dashboard.muscle_mass')}
            value={`${latestMeasurement?.muscle_mass_percent?.toFixed?.(1) ?? '--'}%`}
            change={`${stats?.trends?.muscle_mass?.change > 0 ? '+' : ''}${stats?.trends?.muscle_mass?.change?.toFixed?.(1) ?? '0.0'}%`}
            trend="neutral"
            icon={<Target className="h-5 w-5" />}
            color="purple"
          />
          {stats?.trends?.muscle_mass && (
            <TrendIndicator
              direction={stats.trends.muscle_mass.direction}
              change={stats.trends.muscle_mass.change}
              metric="muscle_mass"
              unit="%"
            />
          )}
        </div>

        <MetricCard
          title={t('dashboard.metabolic_age')}
          value={`${latestMeasurement?.metabolic_age ?? '--'}`}
          change="0"
          trend="neutral"
          icon={<Heart className="h-5 w-5" />}
          color="orange"
        />
      </div>

      <div className="bg-white rounded-xl shadow p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.progress_trends')}</h2>

          <div className="flex flex-wrap gap-2">
            {([7, 30, 90, 0] as DaysFilter[]).map((option) => (
              <button
                key={option}
                onClick={() => setDays(option)}
                className={`px-3 py-1 rounded-lg text-sm border ${
                  days === option ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {option === 0 ? t('common.all') : `${option}D`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {METRICS.map((metric) => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              className={`px-3 py-1 rounded-lg text-sm border ${
                selectedMetric === metric.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {metric.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="h-[250px] md:h-[300px] flex items-center justify-center text-gray-500">{t('dashboard.loading_chart')}</div>
          ) : error ? (
            <div className="h-[250px] md:h-[300px] flex items-center justify-center text-red-600">{error}</div>
          ) : (
            <ChartComponent
              title={`${currentMetric.label} Trend`}
              data={chartData[selectedMetric] || []}
              unit={currentMetric.unit}
              color={currentMetric.color}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2" />
        <div className="space-y-6">
          {!hasPlanAccess(subscription.plan_type, subscription.subscription_status, 'pro') && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.unlock_predictions')}</h3>
              <p className="text-gray-700 mt-1">{t('dashboard.predictions_description')}</p>
              <Link href={appPath('/pricing')} className="inline-block mt-3 rounded-lg bg-blue-600 px-4 py-2 text-white">{t('dashboard.upgrade_to_pro')}</Link>
            </div>
          )}

          {!hasPlanAccess(subscription.plan_type, subscription.subscription_status, 'enterprise') && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.unlock_coaching')}</h3>
              <p className="text-gray-700 mt-1">{t('dashboard.coaching_description')}</p>
              <Link href={appPath('/pricing')} className="inline-block mt-3 rounded-lg bg-purple-600 px-4 py-2 text-white">{t('dashboard.upgrade_to_enterprise')}</Link>
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('dashboard.recent_measurements')}</h2>
            <RecentMeasurements />
          </div>
        </div>
      </div>
    </div>
  )
}
