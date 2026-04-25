'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { apiUrl, getAuthToken, appPath } from '@/lib/api'
import ChartComponent from '@/components/ChartComponent'
import FeatureGuard from '@/components/FeatureGuard'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

type PredictionPoint = {
  date: string
  value: number
  point_type: 'historical' | 'predicted'
  confidence_low?: number
  confidence_high?: number
}

type PredictionData = {
  metric: string
  days_ahead: number
  current_value: number
  predicted_value: number
  confidence_interval: { low: number; high: number }
  trend: 'increasing' | 'decreasing' | 'stable'
  confidence_score: number
  assumptions: string[]
  source: 'ml' | 'fallback'
  points: PredictionPoint[]
}

const HORIZONS = [7, 30, 90]

export default function PredictionsPage() {
  const { t } = useTranslation()
  const [metric, setMetric] = useState('weight_kg')
  const [daysAhead, setDaysAhead] = useState(30)
  const [data, setData] = useState<PredictionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const selectedMetric = useMemo(() => {
    const metrics = [
      { label: t('measurements.weight'), value: 'weight_kg', unit: 'kg' },
      { label: t('measurements.body_fat'), value: 'body_fat_percent', unit: '%' },
      { label: t('measurements.muscle_mass'), value: 'muscle_mass_percent', unit: '%' },
    ]
    return metrics.find((m) => m.value === metric) ?? metrics[0]
  }, [metric, t])

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      window.location.href = appPath('/')
      return
    }

    setLoading(true)
    setError('')

    fetch(apiUrl(`/measurements/predictions?metric=${metric}&days_ahead=${daysAhead}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload.detail || t('errors.generic'))
        }
        return res.json()
      })
      .then(setData)
      .catch((e) => setError(e.message || t('errors.generic')))
      .finally(() => setLoading(false))
  }, [metric, daysAhead, t])

  const chartData = useMemo(
    () =>
      (data?.points || []).map((p) => ({
        date: p.date,
        label: new Date(p.date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }),
        value: p.value,
        pointType: p.point_type,
        confidenceLow: p.confidence_low,
        confidenceHigh: p.confidence_high,
      })),
    [data],
  )

  const TrendIcon = data?.trend === 'increasing' ? TrendingUp : data?.trend === 'decreasing' ? TrendingDown : Minus

  return (
    <FeatureGuard plan="pro" title={t('predictions.title')}>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('predictions.title')}</h1>
        <p className="text-gray-600 mt-2">{t('predictions.description')}</p>
      </div>

      <div className="bg-white rounded-xl shadow p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-600 block mb-1">{t('predictions.metric')}</label>
          <select value={metric} onChange={(e) => setMetric(e.target.value)} className="w-full border rounded-lg px-3 py-2">
            <option value="weight_kg">{t('measurements.weight')}</option>
            <option value="body_fat_percent">{t('measurements.body_fat')}</option>
            <option value="muscle_mass_percent">{t('measurements.muscle_mass')}</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600 block mb-1">{t('predictions.time_horizon')}</label>
          <select value={daysAhead} onChange={(e) => setDaysAhead(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2">
            {HORIZONS.map((h) => (
              <option key={h} value={h}>{h} {t('predictions.days')}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl shadow p-6 flex items-center gap-2 text-gray-700">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('predictions.loading')}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs text-gray-500">{t('predictions.current')}</p>
              <p className="text-xl font-semibold">{data.current_value.toFixed(1)} {selectedMetric.unit}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs text-gray-500">{t('predictions.predicted')} ({data.days_ahead}d)</p>
              <p className="text-xl font-semibold">{data.predicted_value.toFixed(1)} {selectedMetric.unit}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs text-gray-500">{t('predictions.confidence_interval')}</p>
              <p className="text-sm font-semibold">{data.confidence_interval.low.toFixed(1)} - {data.confidence_interval.high.toFixed(1)} {selectedMetric.unit}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs text-gray-500">{t('predictions.trend')}</p>
              <p className="text-sm font-semibold flex items-center gap-1 capitalize"><TrendIcon className="h-4 w-4" /> {data.trend === 'increasing' ? t('predictions.increasing') : data.trend === 'decreasing' ? t('predictions.decreasing') : t('predictions.stable')}</p>
              <p className="text-xs text-gray-500 mt-1">{Math.round(data.confidence_score * 100)}% {t('predictions.confidence')} ({data.source})</p>
            </div>
          </div>

          <ChartComponent
            title={t('predictions.historical_forecast', { metric: selectedMetric.label })}
            data={chartData}
            unit={selectedMetric.unit}
            color="#2563eb"
            heightClass="h-[320px]"
          />
        </>
      )}
    </div>
    </FeatureGuard>
  )
}
