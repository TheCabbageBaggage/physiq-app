'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n, { SupportedLanguage, supportedLanguages, updateLanguagePreference } from '@/lib/i18n'

const flags: Record<SupportedLanguage, string> = {
  de: '🇩🇪',
  en: '🇬🇧',
}

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const [value, setValue] = useState<SupportedLanguage>('de')

  useEffect(() => {
    const apply = (lng: string) => {
      const current = (lng || 'de').slice(0, 2) as SupportedLanguage
      setValue(supportedLanguages.includes(current) ? current : 'de')
    }
    apply(i18n.language)
    i18n.on('languageChanged', apply)
    return () => {
      i18n.off('languageChanged', apply)
    }
  }, [])

  const onChange = async (lang: SupportedLanguage) => {
    setValue(lang)
    await updateLanguagePreference(lang)
  }

  return (
    <label className={`inline-flex items-center gap-2 ${compact ? '' : 'text-sm text-gray-700'}`}>
      {!compact && <span>{t('settings.language')}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SupportedLanguage)}
        className="border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-sm"
        aria-label={t('settings.language')}
      >
        {supportedLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {flags[lang]} {t(`language.${lang}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
