'use client'

import { useEffect, useState } from 'react'
import MeasurementForm from '@/components/MeasurementForm'
import MeasurementTable from '@/components/MeasurementTable'
import { apiUrl, getAuthToken, appPath } from '@/lib/api'
import { Download, Filter, Plus, UploadCloud } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function MeasurementsPage() {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) window.location.href = appPath('/')
  }, [])

  const handleExportCsv = async () => {
    const token = getAuthToken()
    if (!token) {
      setExportStatus(t('measurements.not_logged_in'))
      return
    }

    setIsExporting(true)
    setExportStatus(null)

    try {
      const response = await fetch(apiUrl('/measurements/export/csv'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition') || ''
      const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
      const filename = filenameMatch?.[1] || `measurements_${new Date().toISOString().slice(0, 10)}.csv`

      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      setExportStatus(t('measurements.export_csv'))
    } catch (error) {
      console.error(error)
      setExportStatus(t('measurements.save_failed'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Actions */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('common.measurements')}</h1>
          <p className="text-gray-600 mt-2">
            {t('measurements.description')}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            <Filter className="h-4 w-4 mr-2" />
            {t('measurements.filter')}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? t('measurements.exporting') : t('measurements.export_csv')}
          </button>
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('measurements.manual_entry')}
          </button>
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UploadCloud className="h-4 w-4 mr-2" />
            {t('measurements.upload_pdf')}
          </button>
        </div>
      </div>
      
      {exportStatus && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {exportStatus}
        </div>
      )}

      {/* Measurement Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{t('measurements.add_new')}</h2>
                <button 
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <MeasurementForm onSuccess={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}
      
      {/* Measurement History */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('measurements.history')}</h2>
          <p className="text-gray-600 text-sm mt-1">
            {t('measurements.sorted_by_date')}
          </p>
        </div>
        <div className="p-6">
          <MeasurementTable />
        </div>
        
        {/* Table Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {t('measurements.showing_results', { start: 1, end: 10, total: 25 })}
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                {t('common.previous')}
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm bg-blue-600 text-white hover:bg-blue-700">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                2
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                3
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                {t('common.next')}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">{t('measurements.measurement_tips')}</h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
            <span>{t('measurements.tip_1')}</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
            <span>{t('measurements.tip_2')}</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
            <span>{t('measurements.tip_3')}</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
            <span>{t('measurements.tip_4')}</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
