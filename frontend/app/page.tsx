'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { appPath } from '@/lib/api'
import BodyCompositionCalculator from '@/components/calculator/BodyCompositionCalculator'
import WaitlistSection from '@/components/landing/WaitlistSection'
import PrivacySection from '@/components/landing/PrivacySection'

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 70,
        behavior: 'smooth',
      })
    }
  }, [])

  return (
    <div className="bg-gray-50 text-gray-900">
      <header className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">⚡</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PhysIQ</h1>
                <p className="text-sm text-gray-600">Data Privacy First Body Analytics</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-sm font-medium text-gray-700">100% Datensouverän</span>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <button onClick={() => scrollTo('calculator')} className="text-blue-600 hover:text-blue-700 font-medium">Rechner</button>
                <button onClick={() => scrollTo('waitinglist')} className="text-blue-600 hover:text-blue-700 font-medium">Waitlist</button>
                <button onClick={() => scrollTo('privacy')} className="text-blue-600 hover:text-blue-700 font-medium">Privacy</button>
              </div>
              <div className="flex items-center gap-2">
                {isLoggedIn ? (
                  <Link href={appPath('/dashboard')} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href={appPath('/login')} className="text-blue-600 hover:text-blue-700 font-medium text-sm">Anmelden</Link>
                    <Link href={appPath('/register')} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
                      Registrieren
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 mb-6 px-4 py-2 rounded-full bg-white border shadow-sm">
              <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full">🔐 Data Privacy First</span>
              <span className="text-sm text-gray-600">Keine Cloud-Speicherung • EU-hosted • Open Source</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Körperkomposition <span className="text-blue-600">privat</span> berechnen
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Präzise Vorhersage von Körperfett und Muskelmasse basierend auf wissenschaftlichen Algorithmen.{' '}
              <span className="font-semibold text-gray-800">Ihre Daten werden niemals unsere Server verlassen.</span>
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Feature icon="📊" text="Körperfett % & Muskelmasse" />
              <Feature icon="🔬" text="Wissenschaftliche Algorithmen" />
              <Feature icon="🏠" text="100% lokal berechnet" />
            </div>
          </div>
        </div>
      </section>

      <BodyCompositionCalculator />
      <WaitlistSection />
      <PrivacySection />

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">⚡</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">PhysIQ</h2>
                  <p className="text-gray-400 text-sm">Data Privacy First Body Analytics</p>
                </div>
              </div>
            </div>

            <div className="text-center md:text-right">
              <p className="text-gray-400 mb-2">&copy; {new Date().getFullYear()} PhysIQ. Alle Rechte vorbehalten.</p>
              <p className="text-gray-500 text-sm">
                Made with ❤️ in EU • <button onClick={() => scrollTo('privacy')} className="text-gray-400 hover:text-white">Datenschutz</button> •{' '}
                <Link href={appPath('/terms')} className="text-gray-400 hover:text-white">Impressum</Link>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center">
      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
        <span className="text-blue-600">{icon}</span>
      </div>
      <span className="text-gray-700">{text}</span>
    </div>
  )
}
