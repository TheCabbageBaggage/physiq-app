/**
 * Metric Card Component
 * 
 * Displays a single metric with value, change, and trend indicator.
 * Used in the dashboard for key health indicators.
 * 
 * Props:
 * - title: Metric name
 * - value: Current value
 * - change: Change from previous period
 * - trend: 'up' | 'down' | 'neutral'
 * - icon: React icon component
 * - color: Color theme
 */

import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface MetricCardProps {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
}

const trendIcons = {
  up: ArrowUp,
  down: ArrowDown,
  neutral: Minus,
}

const trendColors = {
  up: 'text-green-600',
  down: 'text-red-600',
  neutral: 'text-gray-600',
}

export default function MetricCard({ 
  title, 
  value, 
  change, 
  trend, 
  icon,
  color 
}: MetricCardProps) {
  const { t } = useTranslation()
  const TrendIcon = trendIcons[trend]
  
  return (
    <div className="card-hover p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      
      <div className="mb-2">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        <div className={`flex items-center text-sm font-medium ${trendColors[trend]}`}>
          <TrendIcon className="h-4 w-4 mr-1" />
          <span>{change}</span>
          <span className="text-gray-500 ml-1">{t('dashboard.from_last_week')}</span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-sm text-gray-600">
          {trend === 'up' && t('dashboard.positive_trend')}
          {trend === 'down' && t('dashboard.improvement_needed')}
          {trend === 'neutral' && t('dashboard.stable_performance')}
        </div>
      </div>
    </div>
  )
}
