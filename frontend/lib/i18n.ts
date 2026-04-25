'use client'

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from '@/locales/de.json'
import en from '@/locales/en.json'
import { apiUrl, getAuthToken } from '@/lib/api'

const resources = {
  de: { translation: de },
  en: { translation: en },
}

function detectBrowserLanguage() {
  if (typeof window === 'undefined') return 'de'
  const browser = navigator.language?.toLowerCase() || 'de'
  return browser.startsWith('en') ? 'en' : 'de'
}

export const supportedLanguages = ['de', 'en'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

if (!i18n.isInitialized) {
  const local = typeof window !== 'undefined' ? localStorage.getItem('preferred_language') : null
  i18n.use(initReactI18next).init({
    resources,
    lng: local && supportedLanguages.includes(local as SupportedLanguage) ? local : detectBrowserLanguage(),
    fallbackLng: 'de',
    interpolation: { escapeValue: false },
  })
}

export async function syncLanguageFromProfile() {
  const token = getAuthToken()
  if (!token) return

  try {
    const res = await fetch(apiUrl('/users/language'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    const lang = data?.preferred_language
    if (supportedLanguages.includes(lang)) {
      await i18n.changeLanguage(lang)
      localStorage.setItem('preferred_language', lang)
    }
  } catch {
    // noop
  }
}

export async function updateLanguagePreference(lang: SupportedLanguage) {
  await i18n.changeLanguage(lang)
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferred_language', lang)
  }

  const token = getAuthToken()
  if (!token) return

  try {
    await fetch(apiUrl('/users/language'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ preferred_language: lang }),
    })
  } catch {
    // noop
  }
}

export default i18n
