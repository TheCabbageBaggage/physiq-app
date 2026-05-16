'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { apiUrl } from '@/lib/api'

type CalculationMode = 'local' | 'server'

type CalculationResults = {
  bodyFat: number
  muscleMass: number
  muscleMassPercent: number
  bmi: number
  bmiCategory: string
  bodyFatCategory: string
  bodyFatBarWidth: number
  insights: { icon: string; text: string; color: string }[]
  source: 'local' | 'ml' | 'navy_only'
  confidence?: number
}

export default function BodyCompositionCalculator() {
  const [isMetric, setIsMetric] = useState(true)
  const [mode, setMode] = useState<CalculationMode>('local')
  const [mlAvailable, setMlAvailable] = useState<boolean | null>(null)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [age, setAge] = useState('35')
  const [height, setHeight] = useState('180')
  const [weight, setWeight] = useState('80')
  const [abdomen, setAbdomen] = useState('90')
  const [neck, setNeck] = useState('40')
  const [hip, setHip] = useState('95')
  const [calculated, setCalculated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<CalculationResults | null>(null)

  const cmToIn = (cm: number) => +(cm * 0.393701).toFixed(1)
  const kgToLbs = (kg: number) => +(kg * 2.20462).toFixed(1)
  const inToCm = (v: number) => +(v / 0.393701).toFixed(1)
  const lbsToKg = (v: number) => +(v / 2.20462).toFixed(1)

  useEffect(() => {
    fetch(apiUrl('/calculate/availability'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMlAvailable(Boolean(data?.ml_available)))
      .catch(() => setMlAvailable(false))
  }, [])

  const enrichResults = useCallback((bodyFat: number, musclePct: number, weightKg: number, source: 'local' | 'ml' | 'navy_only', confidence?: number): CalculationResults => {
    const heightM = parseFloat(height) / 100
    const bmi = weightKg / (heightM * heightM)
    const muscleMass = weightKg * (musclePct / 100)

    let bmiCat = ''
    if (bmi < 18.5) bmiCat = 'Untergewicht'
    else if (bmi < 25) bmiCat = 'Normalgewicht'
    else if (bmi < 30) bmiCat = 'Übergewicht'
    else bmiCat = 'Adipositas'

    let bfCat = ''
    let bfBar = 0
    const isM = gender === 'male'
    if (isM) {
      if (bodyFat < 8) { bfCat = 'Sehr niedrig (Athlet)'; bfBar = 20 }
      else if (bodyFat < 15) { bfCat = 'Gut (Sportlich)'; bfBar = 40 }
      else if (bodyFat < 20) { bfCat = 'Normal'; bfBar = 60 }
      else if (bodyFat < 25) { bfCat = 'Erhöht'; bfBar = 80 }
      else { bfCat = 'Hoch'; bfBar = 95 }
    } else {
      if (bodyFat < 14) { bfCat = 'Sehr niedrig (Athlet)'; bfBar = 20 }
      else if (bodyFat < 22) { bfCat = 'Gut (Sportlich)'; bfBar = 40 }
      else if (bodyFat < 28) { bfCat = 'Normal'; bfBar = 60 }
      else if (bodyFat < 35) { bfCat = 'Erhöht'; bfBar = 80 }
      else { bfCat = 'Hoch'; bfBar = 95 }
    }

    const insights = []
    if (bodyFat > (isM ? 20 : 28)) insights.push({ icon: '⚠️', text: 'Körperfettanteil könnte reduziert werden', color: 'text-amber-600' })
    if (musclePct < (isM ? 38 : 30)) insights.push({ icon: '💪', text: 'Muskelmasse könnte optimiert werden', color: 'text-blue-600' })
    if (bmi >= 25) insights.push({ icon: '⚖️', text: 'BMI im Übergewichtsbereich', color: 'text-amber-600' })
    if (!insights.length) insights.push({ icon: '✅', text: 'Gute Körperkomposition', color: 'text-green-600' })

    return {
      bodyFat,
      muscleMass,
      muscleMassPercent: musclePct,
      bmi,
      bmiCategory: bmiCat,
      bodyFatCategory: bfCat,
      bodyFatBarWidth: bfBar,
      insights,
      source,
      confidence,
    }
  }, [gender, height])

  const handleCalculateLocal = useCallback(() => {
    let h = parseFloat(height)
    let w = parseFloat(weight)
    let a = parseFloat(abdomen)
    const ag = parseFloat(age)

    if (!isMetric) { h = parseFloat(inToCm(h).toString()); w = parseFloat(lbsToKg(w).toString()); a = parseFloat(inToCm(a).toString()) }

    let bodyFat: number
    if (gender === 'male') bodyFat = Math.max(5, Math.min(45, 0.29288 * a - 0.0005 * a * a + 0.15845 * ag - 5.76377))
    else bodyFat = Math.max(5, Math.min(45, 0.29669 * a - 0.00043 * a * a + 0.02963 * ag + 1.4072))

    const leanMass = w * (1 - bodyFat / 100)
    const musclePct = (leanMass * 0.5 / w) * 100
    setResults(enrichResults(bodyFat, musclePct, w, 'local'))
    setCalculated(true)
  }, [gender, age, height, weight, abdomen, isMetric, enrichResults])

  const handleCalculateServer = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let h = parseFloat(height)
      let w = parseFloat(weight)
      let a = parseFloat(abdomen)
      let n = parseFloat(neck)
      let hp = parseFloat(hip)
      const ag = parseFloat(age)

      if (!isMetric) {
        h = parseFloat(inToCm(h).toString())
        w = parseFloat(lbsToKg(w).toString())
        a = parseFloat(inToCm(a).toString())
        n = parseFloat(inToCm(n).toString())
        hp = parseFloat(inToCm(hp).toString())
      }

      const res = await fetch(apiUrl('/calculate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender,
          age: Math.round(ag),
          height_cm: h,
          weight_kg: w,
          neck_cm: n,
          waist_cm: a,
          hip_cm: gender === 'female' ? hp : undefined,
          activity_level: 'moderate',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Serverberechnung fehlgeschlagen')

      setResults(
        enrichResults(
          Number(data.body_fat_percent),
          Number(data.muscle_mass_percent),
          w,
          data.source === 'ml' ? 'ml' : 'navy_only',
          Number(data.confidence_score),
        ),
      )
      setCalculated(true)
    } catch (e: any) {
      setError(e?.message || 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [gender, age, height, weight, abdomen, neck, hip, isMetric, enrichResults])

  const handleCalculate = useCallback(() => {
    if (mode === 'local') {
      handleCalculateLocal()
    } else {
      void handleCalculateServer()
    }
  }, [mode, handleCalculateLocal, handleCalculateServer])

  const switchToMetric = () => {
    if (!isMetric) {
      setHeight(inToCm(parseFloat(height)).toString())
      setWeight(lbsToKg(parseFloat(weight)).toString())
      setAbdomen(inToCm(parseFloat(abdomen)).toString())
      setNeck(inToCm(parseFloat(neck)).toString())
      setHip(inToCm(parseFloat(hip)).toString())
      setIsMetric(true)
    }
  }

  const switchToImperial = () => {
    if (isMetric) {
      setHeight(cmToIn(parseFloat(height)).toString())
      setWeight(kgToLbs(parseFloat(weight)).toString())
      setAbdomen(cmToIn(parseFloat(abdomen)).toString())
      setNeck(cmToIn(parseFloat(neck)).toString())
      setHip(cmToIn(parseFloat(hip)).toString())
      setIsMetric(false)
    }
  }

  return (
    <section id="calculator" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Körperkomposition Rechner</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Wählen Sie zwischen <span className="font-semibold" style={{ color: '#2C5F7C' }}>lokaler Berechnung</span> oder{' '}
              <span className="font-semibold" style={{ color: '#2C5F7C' }}>Server/ML-Berechnung</span>.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl p-6 md:p-8 shadow-lg" style={{ backgroundColor: '#f8fafc' }}>
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Ihre Daten</h3>
                  <div className="flex rounded-lg p-0.5 border" style={{ backgroundColor: '#f1f5f9' }}>
                    <button onClick={switchToMetric} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${isMetric ? 'text-white' : 'text-gray-600'}`} style={isMetric ? { backgroundColor: '#2C5F7C' } : {}}>Metrisch</button>
                    <button onClick={switchToImperial} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${!isMetric ? 'text-white' : 'text-gray-600'}`} style={!isMetric ? { backgroundColor: '#2C5F7C' } : {}}>Imperial</button>
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <button onClick={() => setMode('local')} className={`px-3 py-1 rounded-md text-sm border ${mode === 'local' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                    Lokal
                  </button>
                  <button onClick={() => setMode('server')} className={`px-3 py-1 rounded-md text-sm border ${mode === 'server' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                    Server / ML
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  ML-Service Status: <span className="font-semibold">{mlAvailable === null ? 'wird geprüft...' : mlAvailable ? 'verfügbar' : 'nicht verfügbar (Fallback aktiv)'}</span>
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Geschlecht</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['male', 'female'] as const).map(g => (
                      <label key={g} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all hover:border-[#3D8B8B] ${gender === g ? 'border-[#2C5F7C]' : 'border-gray-200'}`}>
                        <input type="radio" checked={gender === g} onChange={() => setGender(g)} className="h-4 w-4" style={{ accentColor: '#2C5F7C' }} />
                        <span className="ml-3 text-gray-700">{g === 'male' ? 'Männlich' : 'Weiblich'}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alter</label>
                  <input type="number" min="18" max="100" value={age} onChange={e => setAge(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Größe</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none" />
                    <div className="absolute right-3 top-3 text-gray-400 text-sm">{isMetric ? 'cm' : 'in'}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gewicht</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none" />
                    <div className="absolute right-3 top-3 text-gray-400 text-sm">{isMetric ? 'kg' : 'lbs'}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bauchumfang (Waist)</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={abdomen} onChange={e => setAbdomen(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none" />
                    <div className="absolute right-3 top-3 text-gray-400 text-sm">{isMetric ? 'cm' : 'in'}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Halsumfang (Neck)</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={neck} onChange={e => setNeck(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none" />
                    <div className="absolute right-3 top-3 text-gray-400 text-sm">{isMetric ? 'cm' : 'in'}</div>
                  </div>
                </div>

                {gender === 'female' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hüftumfang (Hip)</label>
                    <div className="relative">
                      <input type="number" step="0.1" value={hip} onChange={e => setHip(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none" />
                      <div className="absolute right-3 top-3 text-gray-400 text-sm">{isMetric ? 'cm' : 'in'}</div>
                    </div>
                  </div>
                )}

                <button onClick={handleCalculate} disabled={loading} className="w-full py-3 px-4 rounded-lg text-white font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70" style={{ backgroundColor: '#2C5F7C' }}>
                  {loading ? 'Berechne...' : mode === 'local' ? '🔒 Lokal berechnen' : '🧠 Server/ML berechnen'}
                </button>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl p-6 md:p-8 shadow-lg" style={{ background: 'linear-gradient(135deg, #ffffff, #f8fafc)' }}>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Ihre Körperkomposition</h3>

                {!calculated || !results ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f1f5f9' }}>
                      <BarChart3 className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">Geben Sie Ihre Daten ein und klicken Sie auf Berechnen</p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                      Quelle: <strong>{results.source === 'local' ? 'Local Formula' : results.source === 'ml' ? 'ML Service' : 'Server Fallback (Navy)'}</strong>
                      {typeof results.confidence === 'number' && (
                        <span> • Confidence: {(results.confidence * 100).toFixed(0)}%</span>
                      )}
                    </div>
                    <div className="mb-8">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-700">Körperfettanteil</h4>
                        <span className="text-2xl font-bold text-gray-900">{results.bodyFat.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold py-1 px-2 rounded-full" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>Gesund</span>
                        <span className="text-xs font-semibold text-gray-600">{results.bodyFatCategory}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: '#dbeafe' }}>
                        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${results.bodyFatBarWidth}%`, background: 'linear-gradient(90deg, #2C5F7C, #3D8B8B)' }} />
                      </div>
                    </div>

                    <div className="mb-8">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-700">Muskelmasse</h4>
                        <span className="text-2xl font-bold text-gray-900">{results.muscleMass.toFixed(1)} kg</span>
                      </div>
                      <div className="rounded-lg p-4 grid grid-cols-2 gap-4" style={{ backgroundColor: '#f8fafc' }}>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Absolut</div>
                          <div className="text-lg font-semibold text-gray-900">{results.muscleMass.toFixed(1)} kg</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Relativ</div>
                          <div className="text-lg font-semibold text-gray-900">{results.muscleMassPercent.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-700">BMI</h4>
                        <span className="text-xl font-bold" style={{ color: results.bmi >= 25 ? '#d97706' : '#059669' }}>{results.bmi.toFixed(1)}</span>
                      </div>
                      <div className="text-sm text-gray-500">{results.bmiCategory} ({results.bmi.toFixed(1)})</div>
                    </div>

                    <div className="border-t pt-6">
                      <h4 className="font-medium text-gray-700 mb-3">Gesundheits-Empfehlungen</h4>
                      <div className="space-y-3">
                        {results.insights.map((insight, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span>{insight.icon}</span>
                            <span className={`text-sm ${insight.color}`}>{insight.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl p-5 border" style={{ backgroundColor: '#fffbeb', borderColor: '#fef3c7' }}>
                <div className="flex gap-3">
                  <span style={{ color: '#d97706' }}>🔬</span>
                  <div>
                    <h4 className="text-sm font-medium" style={{ color: '#92400e' }}>Modus-Hinweis</h4>
                    <p className="mt-1 text-xs" style={{ color: '#b45309' }}>
                      Lokal: vollständig im Browser. Server/ML: Anfrage an API, mit ML wenn verfügbar, sonst Navy-Fallback.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
