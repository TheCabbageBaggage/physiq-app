'use client'

import FeatureGuard from '@/components/FeatureGuard'
import { useTranslation } from 'react-i18next'

export default function CoachingPage() {
  const { t } = useTranslation()
  
  return (
    <FeatureGuard plan="enterprise" title={t('coaching.title')}>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">{t('coaching.title')}</h1>
        <p className="text-gray-700">{t('coaching.description')}</p>
      </div>
    </FeatureGuard>
  )
}
