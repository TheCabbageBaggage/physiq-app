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
    setIsLoggedIn(!!localStorage.getItem('token'))
  }, [])

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1000px_500px_at_10%_-5%,rgba(34,211,238,0.20),transparent),radial-gradient(900px_400px_at_95%_-10%,rgba(59,130,246,0.18),transparent)]" />

      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 font-bold text-white">⚡</div>
            <div>
              <p className="text-xl font-semibold tracking-tight">PhysIQ</p>
              <p className="text-xs text-slate-400">Modern Body Intelligence</p>
            </div>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            <button onClick={() => scrollTo('calculator')} className="text-sm text-slate-300 hover:text-white">Rechner</button>
            <button onClick={() => scrollTo('waitinglist')} className="text-sm text-slate-300 hover:text-white">Waitlist</button>
            <button onClick={() => scrollTo('privacy')} className="text-sm text-slate-300 hover:text-white">Privacy</button>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Link href={appPath('/dashboard')} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900">Dashboard</Link>
            ) : (
              <>
                <Link href={appPath('/login')} className="rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-900">Login</Link>
                <Link href={appPath('/register')} className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-white">Registrieren</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-14 md:grid-cols-[1.1fr_0.9fr] md:pt-20">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs text-cyan-100">
            <span className="rounded-full bg-emerald-500 px-2 py-0.5 font-semibold text-white">LIVE</span>
            DSGVO-konforme Analytics ohne Cloud-Zwang
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-tight md:text-6xl">
            Ein komplett neues,
            <span className="block bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">modernes PhysIQ Erlebnis</span>
          </h1>
          <p className="mt-5 max-w-xl text-slate-300 md:text-lg">
            Präzise Körperkompositions-Prognosen mit starker UX, schneller API und sauberem Datenschutz-Setup.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={() => scrollTo('calculator')} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900">Jetzt testen</button>
            <button onClick={() => scrollTo('waitinglist')} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900">Zur Waitlist</button>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Antwortzeit" value="<120ms" />
            <Stat label="Berechnung" value="Lokal + ML" />
            <Stat label="Deploy" value="Containerized" />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
          <p className="text-sm font-medium text-slate-200">Warum dieses Redesign?</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>Modernere visuelle Hierarchie für bessere Orientierung</li>
            <li>Reduzierte visuelle Last mit klaren Interaktionspunkten</li>
            <li>Konsistenter Look zwischen Landing, Login und App-Bereich</li>
          </ul>
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">
            Tipp: Gib mir gern konkrete Screens mit "zu dunkel / zu hell / mehr spacing" und ich tune es in der nächsten Iteration pixelgenau.
          </div>
        </div>
      </section>

      <div className="bg-white text-slate-900">
        <BodyCompositionCalculator />
        <WaitlistSection />
        <PrivacySection />
      </div>

      <footer className="border-t border-slate-800 bg-slate-950 py-10 text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm md:flex-row">
          <p>© {new Date().getFullYear()} PhysIQ</p>
          <div className="flex gap-5">
            <button onClick={() => scrollTo('privacy')} className="hover:text-white">Datenschutz</button>
            <Link href={appPath('/terms')} className="hover:text-white">Impressum</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
