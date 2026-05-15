'use client'

import { useTranslation } from 'react-i18next'

export default function TermsPage() {
  const { t } = useTranslation()
  
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-3xl font-bold">{t('legal.terms_title')}</h1>
      <p className="text-gray-700">{t('legal.terms_content')}</p>
    </div>
  )
}
