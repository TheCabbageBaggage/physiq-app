'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { apiUrl, getAuthToken } from '@/lib/api'
import { useTranslation } from 'react-i18next'

interface Measurement {
  id: number
  date: string
  weight_kg: number
  body_fat_percent: number
  muscle_mass_percent?: number | null
  stomach_circumference_cm?: number | null
  skeletal_muscle_mass_kg?: number | null
  bmi?: number | null
  visceral_fat_level?: number | null
  bmr_kcal?: number | null
  source_type?: string
  is_user_corrected?: boolean
}

export default function MeasurementTable() {
  const { t } = useTranslation()
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(true)
  const [sortField, setSortField] = useState<keyof Measurement>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const loadMeasurements = useCallback(async () => {
    const token = getAuthToken()
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/measurements'), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(t('measurements.load_failed'))
      const data = await res.json()
      setMeasurements(data)
    } catch {
      setError(t('measurements.load_failed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadMeasurements()
    const onCreated = () => loadMeasurements()
    window.addEventListener('measurement:created', onCreated)
    return () => window.removeEventListener('measurement:created', onCreated)
  }, [loadMeasurements])

  const handleSort = (field: keyof Measurement) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: keyof Measurement) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
  }

  const sortedMeasurements = [...measurements].sort((a, b) => {
    const av = a[sortField]
    const bv = b[sortField]
    if (typeof av === 'string' && typeof bv === 'string') return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    if (typeof av === 'number' && typeof bv === 'number') return sortDirection === 'asc' ? av - bv : bv - av
    return 0
  })

  const fmt = (v?: number | null, digits = 1) => (v == null ? '-' : v.toFixed(digits))

  if (loading) return <div className="text-sm text-gray-600">{t('measurements.loading')}</div>
  if (error) return <div className="text-sm text-red-600">{error}</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50">
          {showAdvanced ? t('measurements.hide_advanced') : t('measurements.show_advanced')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr className="border-b border-gray-200 text-sm text-gray-700">
              <th className="text-left py-3 px-2 cursor-pointer" onClick={() => handleSort('date')}><div className="flex items-center">{t('measurements.date')}{getSortIcon('date')}</div></th>
              <th className="text-left py-3 px-2 cursor-pointer" onClick={() => handleSort('weight_kg')}><div className="flex items-center">{t('measurements.weight')}{getSortIcon('weight_kg')}</div></th>
              <th className="text-left py-3 px-2 cursor-pointer" onClick={() => handleSort('body_fat_percent')}><div className="flex items-center">{t('measurements.body_fat')}{getSortIcon('body_fat_percent')}</div></th>
              {showAdvanced && (
                <>
                  <th className="text-left py-3 px-2">{t('measurements.muscle_percent')}</th>
                  <th className="text-left py-3 px-2">{t('measurements.stomach_cm')}</th>
                  <th className="text-left py-3 px-2">{t('measurements.skeletal_kg')}</th>
                </>
              )}
              <th className="text-left py-3 px-2">{t('measurements.bmi')}</th>
              <th className="text-left py-3 px-2">{t('measurements.visceral')}</th>
              <th className="text-left py-3 px-2">{t('measurements.bmr_kcal')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedMeasurements.map((m) => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                <td className="py-3 px-2">{new Date(m.date).toLocaleDateString()}</td>
                <td className="py-3 px-2">{fmt(m.weight_kg)} kg</td>
                <td className="py-3 px-2">{fmt(m.body_fat_percent)}%</td>
                {showAdvanced && (
                  <>
                    <td className="py-3 px-2">{fmt(m.muscle_mass_percent)}%</td>
                    <td className="py-3 px-2">{fmt(m.stomach_circumference_cm)} cm</td>
                    <td className="py-3 px-2">{fmt(m.skeletal_muscle_mass_kg)} kg</td>
                  </>
                )}
                <td className="py-3 px-2">{fmt(m.bmi)}</td>
                <td className="py-3 px-2">{fmt(m.visceral_fat_level, 0)}</td>
                <td className="py-3 px-2">{fmt(m.bmr_kcal, 0)} kcal</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {measurements.length === 0 && <div className="text-center py-8 text-gray-500">{t('measurements.no_measurements')}</div>}
    </div>
  )
}
