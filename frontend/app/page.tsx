'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Zap } from 'lucide-react'
import { appPath } from '@/lib/api'
import BodyCompositionCalculator from '@/components/calculator/BodyCompositionCalculator'
import WaitlistSection from '@/components/landing/WaitlistSection'
import PrivacySection from '@/components/landing/PrivacySection'

export default function LandingPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) setIsLoggedIn(true)
  }, [])

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* ──────── HEADER ──────── */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-white'} border-b border-gray-100`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#2C5F7C' }}>
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">PhysIQ</h1>
                <p className="text-xs text-gray-500 -mt-0.5">Data Privacy First Body Analytics</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                <span className="text-sm font-medium text-gray-600 hidden sm:inline">100% Datensouverän</span>
              </div>
              <nav className="hidden md:flex items-center gap-5">
                <button onClick={() => scrollTo('calculator')} className="text-sm font-medium text-gray-600 hover:text-[#2C5F7C] transition-colors">Rechner</button>
                <button onClick={() => scrollTo('waitinglist')} className="text-sm font-medium text-gray-600 hover:text-[#2C5F7C] transition-colors">Waitlist</button>
                <button onClick={() => scrollTo('privacy')} className="text-sm font-medium text-gray-600 hover:text-[#2C5F7C] transition-colors">Privacy</button>
              </nav>
              <div className="flex items-center gap-3">
                {isLoggedIn ? (
                  <Link href={appPath('/dashboard')} className="text-sm px-4 py-2 rounded-lg text-white font-medium transition-colors" style={{ backgroundColor: '#2C5F7C' }}>
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href={appPath('/login')} className="text-sm text-gray-600 hover:text-[#2C5F7C] font-medium transition-colors">Anmelden</Link>
                    <Link href={appPath('/register')} className="text-sm px-4 py-2 rounded-lg text-white font-medium transition-colors" style={{ backgroundColor: '#2C5F7C' }}>Registrieren</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ──────── HERO ──────── */}
      <section className="py-16 md:py-24" style={{ background: 'linear-gradient(135deg, #e6f0ff 0%, #ffffff 100%)' }}>
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-white border shadow-sm">
              <span className="text-white text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                🔐 Data Privacy First
              </span>
              <span className="text-sm text-gray-500">Keine Cloud-Speicherung • EU-hosted • Open Source</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Körperkomposition <span style={{ color: '#2C5F7C' }}>privat</span> berechnen
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Präzise Vorhersage von Körperfett und Muskelmasse basierend auf wissenschaftlichen Algorithmen.
              <br />
              <span className="font-semibold text-gray-800">Ihre Daten werden niemals unsere Server verlassen.</span>
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-10">
              {[
                { icon: '📊', text: 'Körperfett % & Muskelmasse' },
                { icon: '🔬', text: 'Wissenschaftliche Algorithmen' },
                { icon: '🏠', text: '100% lokal berechnet' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#e6f0ff' }}>
                    <span className="text-sm">{item.icon}</span>
                  </div>
                  <span className="text-gray-700 text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => scrollTo('calculator')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all hover:shadow-lg"
                style={{ backgroundColor: '#2C5F7C' }}>
                Jetzt berechnen <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => scrollTo('waitinglist')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border transition-all"
                style={{ borderColor: '#3D8B8B', color: '#3D8B8B' }}>
                Für Waitlist anmelden
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ──────── CALCULATOR ──────── */}
      <BodyCompositionCalculator />

      {/* ──────── WAITLIST ──────── */}
      <WaitlistSection />

      {/* ──────── PRIVACY ──────── */}
      <PrivacySection />

      {/* ──────── FOOTER ──────── */}
      <footer className="py-12 text-white" style={{ backgroundColor: '#1A3440' }}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#2C5F7C' }}>
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">PhysIQ</h2>
                <p className="text-gray-400 text-xs">Data Privacy First Body Analytics</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-400 text-sm mb-1">&copy; {new Date().getFullYear()} PhysIQ. Alle Rechte vorbehalten.</p>
              <p className="text-gray-500 text-xs">
                Made with ❤️ in EU • <a href="#privacy" className="text-gray-400 hover:text-white ml-1">Datenschutz</a> • <a href="#" className="text-gray-400 hover:text-white ml-1">Impressum</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
