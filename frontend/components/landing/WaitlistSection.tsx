'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { apiUrl } from '@/lib/api'

const INTEREST_OPTIONS = [
  { value: 'kfa', label: 'KFA-Berechnung (Körperfettanteil)' },
  { value: 'bmi', label: 'BMI-Tracking' },
  { value: 'nutrition', label: 'Ernährungsplan' },
  { value: 'coaching', label: 'Fitness-Coaching' },
]

const BIA_OPTIONS = [
  { value: 'yes', label: 'Ja, regelmäßig' },
  { value: 'occasionally', label: 'Gelegentlich' },
  { value: 'planning', label: 'Ich plane eine Anschaffung' },
  { value: 'no', label: 'Nein, aber interessiert' },
]

export default function WaitlistSection() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [biaAccess, setBiaAccess] = useState('yes')
  const [interests, setInterests] = useState<string[]>([])
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const toggleInterest = (val: string) => {
    setInterests(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agree) { setError('Bitte stimmen Sie der Datenschutzerklärung zu.'); return }
    if (!name.trim()) { setError('Bitte geben Sie Ihren Namen ein.'); return }
    setLoading(true)
    setError('')

    try {
      const res = await fetch(apiUrl('/opportunities'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name.trim(),
          phone: phone.trim() || undefined,
          interests: interests.length > 0 ? interests : undefined,
          bia_access: biaAccess,
          newsletter_opt_in: true,
          referral_source: `bia:${biaAccess}`,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 409 || (data.detail && data.detail.includes('bereits'))) {
          setSubmitted(true)
          return
        }
        setError(data.detail || 'Fehler bei der Anmeldung.')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es später erneut.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <section id="waitinglist" className="py-16 md:py-24" style={{ backgroundColor: '#f8fafc' }}>
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto text-center p-8 rounded-2xl bg-white shadow-lg">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
              <CheckCircle className="h-8 w-8" style={{ color: '#16a34a' }} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Erfolgreich angemeldet!</h3>
            <p className="text-gray-600">Vielen Dank für Ihr Interesse, <strong>{name}</strong>! Wir melden uns in Kürze bei <strong>{email}</strong>.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="waitinglist" className="py-16 md:py-24" style={{ backgroundColor: '#f8fafc' }}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Personalisierte BIA-basierte Vorhersagen</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Erhalten Sie <span className="font-semibold" style={{ color: '#2C5F7C' }}>präzisere Körperkompositions-Analysen</span> basierend auf Ihren eigenen Bioimpedanz-Scans.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="md:flex">
              {/* Benefits */}
              <div className="md:w-1/2 p-8 md:p-12" style={{ backgroundColor: '#e6f0ff' }}>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Ihre Vorteile</h3>
                <div className="space-y-6">
                  {[
                    { icon: '🎯', title: 'Personalisierte Algorithmen', desc: 'ML-Modelle, die auf Ihren eigenen BIA-Scans trainiert werden.' },
                    { icon: '🏠', title: 'Digitale Souveränität', desc: 'Ihre Daten bleiben unter Ihrer Kontrolle. Selbst-hosted Option.' },
                    { icon: '📈', title: 'Fortschritts-Tracking', desc: 'Verfolgen Sie Veränderungen über Zeit mit detaillierten Trends.' },
                    { icon: '🔓', title: 'Open Source Transparenz', desc: 'Vollständige Transparenz aller Algorithmen. Keine Black-Box.' },
                  ].map((b, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#d1e9f0' }}>
                        <span>{b.icon}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{b.title}</h4>
                        <p className="text-gray-600 text-sm">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form */}
              <div className="md:w-1/2 p-8 md:p-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Waitlist Anmeldung</h3>
                <p className="text-gray-600 mb-6">Erhalten Sie Zugang zu personalisierten Vorhersagen.</p>

                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C5F7C]/20 focus:border-[#2C5F7C]"
                      placeholder="Ihr vollständiger Name" />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C5F7C]/20 focus:border-[#2C5F7C]"
                      placeholder="ihre.email@beispiel.de" />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon (optional)</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C5F7C]/20 focus:border-[#2C5F7C]"
                      placeholder="+49 123 456789" />
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interessen (optional)</label>
                    <div className="grid grid-cols-1 gap-2">
                      {INTEREST_OPTIONS.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                          <input type="checkbox" checked={interests.includes(opt.value)} onChange={() => toggleInterest(opt.value)}
                            className="h-4 w-4 rounded" style={{ accentColor: '#2C5F7C' }} />
                          <span className="text-sm text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* BIA Access */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Haben Sie Zugang zu BIA-Scans?</label>
                    <select value={biaAccess} onChange={e => setBiaAccess(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C5F7C]/20 focus:border-[#2C5F7C]">
                      {BIA_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* GDPR Consent */}
                  <div>
                    <label className="flex items-start">
                      <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)}
                        className="h-4 w-4 mt-1 rounded" style={{ accentColor: '#2C5F7C' }} />
                      <span className="ml-3 text-sm text-gray-700">
                        Ich stimme der <a href="#privacy" className="font-medium" style={{ color: '#2C5F7C' }}>Datenschutzerklärung</a> zu.
                        Meine Daten werden gemäß <span className="font-semibold">EU-DSGVO</span> verarbeitet.
                      </span>
                    </label>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 px-4 rounded-lg text-white font-semibold transition-all hover:shadow-lg disabled:opacity-60"
                    style={{ backgroundColor: '#2C5F7C' }}>
                    {loading ? <span className="inline-flex items-center gap-2"><span className="animate-spin">⟳</span> Wird gesendet...</span> : '🔒 Für Waitlist anmelden'}
                  </button>
                </form>

                <div className="mt-6 p-4 rounded-lg border" style={{ backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }}>
                  <p className="text-sm" style={{ color: '#166534' }}>
                    <span className="font-semibold">Kein Spam, nur relevante Updates.</span> Maximal 2-3 E-Mails pro Monat über Fortschritte und Launch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
