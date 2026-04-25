'use client'

import { useState } from 'react'
import { Activity, Loader2, AlertCircle } from 'lucide-react'
import { apiUrl, getAuthToken } from '@/lib/api'
import { useTranslation } from 'react-i18next'

interface MeasurementFormProps {
  onSuccess: () => void
}

export default function MeasurementForm({ onSuccess }: MeasurementFormProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight_kg: '',
    body_fat_percent: '',
    muscle_mass_percent: '',
    stomach_circumference_cm: '',
    skeletal_muscle_mass_kg: '',
    bmi: '',
    visceral_fat_level: '',
    bmr_kcal: '',
    source_type: 'manual',
    is_user_corrected: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }))
  }

  const toNumOrNull = (v: string) => (v === '' ? null : Number(v))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const token = getAuthToken()
    if (!token) {
      setError(t('measurements.not_logged_in'))
      return
    }

    setLoading(true)
    try {
      const payload = {
        date: formData.date,
        weight_kg: Number(formData.weight_kg),
        body_fat_percent: Number(formData.body_fat_percent),
        muscle_mass_percent: toNumOrNull(formData.muscle_mass_percent),
        stomach_circumference_cm: toNumOrNull(formData.stomach_circumference_cm),
        skeletal_muscle_mass_kg: toNumOrNull(formData.skeletal_muscle_mass_kg),
        bmi: toNumOrNull(formData.bmi),
        visceral_fat_level: toNumOrNull(formData.visceral_fat_level),
        bmr_kcal: toNumOrNull(formData.bmr_kcal),
        source_type: formData.source_type,
        is_user_corrected: formData.is_user_corrected,
      }

      const res = await fetch(apiUrl('/measurements'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || t('measurements.save_failed'))
        return
      }

      window.dispatchEvent(new Event('measurement:created'))
      onSuccess()
    } catch {
      setError(t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  const Input = ({ name, label, min, max, step = '0.1', required = false }: { name: string, label: string, min?: string, max?: string, step?: string, required?: boolean }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}{required ? ' *' : ''}</label>
      <input type="number" name={name} value={(formData as any)[name]} onChange={handleChange} min={min} max={max} step={step} className="input-primary" required={required} />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center mb-2">
        <div className="p-2 bg-blue-100 rounded-lg mr-3"><Activity className="h-6 w-6 text-blue-600" /></div>
        <h3 className="text-lg font-semibold text-gray-900">{t('measurements.new_measurement')}</h3>
      </div>

      {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 mt-0.5" /><span>{error}</span></div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('measurements.measurement_date')}</label>
        <input type="date" name="date" value={formData.date} onChange={handleChange} className="input-primary" required />
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-3">{t('measurements.basic')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input name="weight_kg" label={t('measurements.weight_kg')} min="30" max="200" required />
          <Input name="body_fat_percent" label={t('measurements.body_fat_percent')} min="3" max="50" required />
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-3">{t('measurements.advanced')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input name="muscle_mass_percent" label={t('measurements.muscle_mass_percent')} min="0" max="100" />
          <Input name="stomach_circumference_cm" label={t('measurements.stomach_circumference_cm')} min="50" max="150" />
          <Input name="skeletal_muscle_mass_kg" label={t('measurements.skeletal_muscle_mass_kg')} min="10" max="100" />
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-3">{t('measurements.health')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input name="bmi" label={t('measurements.bmi')} min="10" max="50" />
          <Input name="visceral_fat_level" label={t('measurements.visceral_fat_level')} min="1" max="30" step="1" />
          <Input name="bmr_kcal" label={t('measurements.bmr_kcal')} min="800" max="5000" />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button type="button" onClick={onSuccess} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium" disabled={loading}>{t('common.cancel')}</button>
        <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} {loading ? t('measurements.saving') : t('measurements.save_measurement')}
        </button>
      </div>
    </form>
  )
}
