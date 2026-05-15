/**
 * Recent Measurements Component
 * 
 * Displays a list of recent measurements in a compact table.
 * Shows date, key metrics, and trend indicators.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { appPath } from '@/lib/api'

export default function RecentMeasurements() {
  const { t } = useTranslation()
  
  // Mock data - will be replaced with API data
  const measurements = [
    { date: '2024-04-19', weight: '75.2 kg', bodyFat: '18.5%', muscle: '58.4 kg', trend: 'up' },
    { date: '2024-04-12', weight: '75.5 kg', bodyFat: '19.3%', muscle: '57.9 kg', trend: 'down' },
    { date: '2024-04-05', weight: '76.1 kg', bodyFat: '19.8%', muscle: '57.5 kg', trend: 'down' },
    { date: '2024-03-29', weight: '76.8 kg', bodyFat: '20.2%', muscle: '57.0 kg', trend: 'down' },
    { date: '2024-03-22', weight: '77.5 kg', bodyFat: '20.5%', muscle: '56.8 kg', trend: 'down' },
  ]
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <Minus className="h-4 w-4 text-gray-600" />
    }
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">{t('measurements.date')}</th>
            <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">{t('measurements.weight')}</th>
            <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">{t('measurements.body_fat')}</th>
            <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">{t('measurements.muscle_mass')}</th>
            <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">{t('predictions.trend')}</th>
          </tr>
        </thead>
        <tbody>
          {measurements.map((measurement, index) => (
            <tr 
              key={index} 
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-3 px-2">
                <div className="font-medium text-gray-900">{formatDate(measurement.date)}</div>
                <div className="text-xs text-gray-500">{measurement.date}</div>
              </td>
              <td className="py-3 px-2 font-medium text-gray-900">{measurement.weight}</td>
              <td className="py-3 px-2">
                <div className="font-medium text-gray-900">{measurement.bodyFat}</div>
                <div className="text-xs text-gray-500">{t('measurements.body_fat')}</div>
              </td>
              <td className="py-3 px-2">
                <div className="font-medium text-gray-900">{measurement.muscle}</div>
                <div className="text-xs text-gray-500">{t('measurements.muscle_mass')}</div>
              </td>
              <td className="py-3 px-2">
                <div className="flex items-center">
                  {getTrendIcon(measurement.trend)}
                  <span className="ml-2 text-sm capitalize">{measurement.trend === 'up' ? t('predictions.increasing') : measurement.trend === 'down' ? t('predictions.decreasing') : t('predictions.stable')}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-4 text-center">
        <Link href={appPath('/measurements')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          {t('dashboard.view_all')} →
        </Link>
      </div>
    </div>
  )
}
