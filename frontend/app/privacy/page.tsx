'use client'

import { useTranslation } from 'react-i18next'

export default function PrivacyPage() {
  const { t } = useTranslation()
  
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-3xl font-bold">{t('legal.privacy_title')}</h1>
      <p className="text-gray-700">{t('legal.privacy_content')}</p>
    </div>
  )
}
