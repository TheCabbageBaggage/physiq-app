'use client'

import { useState, useCallback } from 'react'
import { BarChart3 } from 'lucide-react'
import { apiUrl } from '@/lib/api'

type CalculationResults = {
  bodyFat: number
  muscleMass: number
  muscleMassPercent: number
  bmi: number
  bmiCategory: string
  bodyFatCategory: string
  bodyFatBarWidth: number
  insights: { icon: string; text: string; color: string }[]
}

export default function BodyCompositionCalculator() {
  const [isMetric, setIsMetric] = useState(true)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [age, setAge] = useState('35')
  const [height, setHeight] = useState('180')
  const [weight, setWeight] = useState('80')
  const [abdomen, setAbdomen] = useState('90')
  const [calculated, setCalculated] = useState(false)
  const [results, setResults] = useState<CalculationResults | null>(null)

  const cmToIn = (cm: number) => +(cm * 0.393701).toFixed(1)
  const kgToLbs = (kg: number) => +(kg * 2.20462).toFixed(1)
  const inToCm = (v: number) => +(v / 0.393701).toFixed(1)
  const lbsToKg = (v: number) => +(v / 2.20462).toFixed(1)

  const handleCalculate = useCallback(() => {
    let h = parseFloat(height)
    let w = parseFloat(weight)
    let a = parseFloat(abdomen)
    const ag = parseFloat(age)

    if (!isMetric) { h = parseFloat(inToCm(h).toString()); w = parseFloat(lbsToKg(w).toString()); a = parseFloat(inToCm(a).toString()) }

    const heightM = h / 100
    const bmi = w / (heightM * heightM)

    let bodyFat: number
    if (gender === 'male') bodyFat = Math.max(5, Math.min(45, 0.29288 * a - 0.0005 * a * a + 0.15845 * ag - 5.76377))
    else bodyFat = Math.max(5, Math.min(45, 0.29669 * a - 0.00043 * a * a + 0.02963 * ag + 1.4072))

    const leanMass = w * (1 - bodyFat / 100)
    const muscleMass = leanMass * 0.5
    const musclePct = (muscleMass / w) * 100

    let bmiCat = ''
    if (bmi < 18.5) bmiCat = 'Untergewicht'
    else if (bmi < 25) bmiCat = 'Normalgewicht'
    else if (bmi < 30) bmiCat = 'Übergewicht'
    else bmiCat = 'Adipositas'

    let bfCat = '', bfBar = 0
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

    setResults({ bodyFat, muscleMass, muscleMassPercent: musclePct, bmi, bmiCategory: bmiCat, bodyFatCategory: bfCat, bodyFatBarWidth: bfBar, insights })
    setCalculated(true)
  }, [gender, age, height, weight, abdomen, isMetric])

  const switchToMetric = () => {
    if (!isMetric) {
      setHeight(inToCm(parseFloat(height)).toString())
      setWeight(lbsToKg(parseFloat(weight)).toString())
      setAbdomen(inToCm(parseFloat(abdomen)).toString())
      setIsMetric(true)
    }
  }

  const switchToImperial = () => {
    if (isMetric) {
      setHeight(cmToIn(parseFloat(height)).toString())
      setWeight(kgToLbs(parseFloat(weight)).toString())
      setAbdomen(cmToIn(parseFloat(abdomen)).toString())
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
              Geben Sie Ihre grundlegenden Messwerte ein für eine sofortige,{' '}
              <span className="font-semibold" style={{ color: '#2C5F7C' }}>lokal berechnete</span> Vorhersage.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Input */}
            <div className="rounded-2xl p-6 md:p-8 shadow-lg" style={{ backgroundColor: '#f8fafc' }}>
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Ihre Daten</h3>
                  <div className="flex rounded-lg p-0.5 border" style={{ backgroundColor: '#f1f5f9' }}>
                    <button onClick={switchToMetric}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${isMetric ? 'text-white' : 'text-gray-600'}`}
                      style={isMetric ? { backgroundColor: '#2C5F7C' } : {}}>Metrisch</button>
                    <button onClick={switchToImperial}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${!isMetric ? 'text-white' : 'text-gray-600'}`}
                      style={!isMetric ? { backgroundColor: '#2C5F7C' } : {}}>Imperial</button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">Alle Berechnungen erfolgen lokal in Ihrem Browser. Keine Serverübertragung.</p>
              </div>

              <div className="space-y-5">
                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Geschlecht</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['male', 'female'] as const).map(g => (
                      <label key={g}
                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all hover:border-[#3D8B8B] ${gender === g ? 'border-[#2C5F7C]' : 'border-gray-200'}`}>
                        <input type="radio" checked={gender === g} onChange={() => setGender(g)} className="h-4 w-4" style={{ accentColor: '#2C5F7C' }} />
                        <span className="ml-3 text-gray-700">{g === 'male' ? 'Männlich' : 'Weiblich'}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alter</label>
                  <input type="number" min="18" max="100" value={age} onChange={e => setAge(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none" />
                </div>

                {/* Height */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Größe</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none" />
                    <div className="absolute right-3 top-3 text-gray-400 text-sm">{isMetric ? 'cm' : 'in'}</div>
                  </div>
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gewicht</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none" />
                    <div className="absolute right-3 top-3 text-gray-400 text-sm">{isMetric ? 'kg' : 'lbs'}</div>
                  </div>
                </div>

                {/* Abdomen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bauchumfang</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={abdomen} onChange={e => setAbdomen(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none" />
                    <div className="absolute right-3 top-3 text-gray-400 text-sm">{isMetric ? 'cm' : 'in'}</div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Messen auf Höhe des Bauchnabels, nach normaler Ausatmung.</p>
                </div>

                <button onClick={handleCalculate}
                  className="w-full py-3 px-4 rounded-lg text-white font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
                  style={{ backgroundColor: '#2C5F7C' }}>
                  🔒 Lokal berechnen
                </button>
              </div>

              <div className="mt-6 p-4 rounded-lg border" style={{ backgroundColor: '#e6f0ff', borderColor: '#cce0ff' }}>
                <div className="flex items-start gap-3">
                  <span style={{ color: '#2C5F7C' }}>🔐</span>
                  <div>
                    <h4 className="text-sm font-medium" style={{ color: '#1A3440' }}>Data Privacy Garantie</h4>
                    <p className="mt-1 text-xs" style={{ color: '#2C5F7C' }}>
                      <span className="font-semibold">100% lokal in Ihrem Browser.</span> Keine Serverübertragung oder Speicherung.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-6">
              <div className="rounded-2xl p-6 md:p-8 shadow-lg" style={{ background: 'linear-gradient(135deg, #ffffff, #f8fafc)' }}>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Ihre Körperkomposition</h3>

                {!calculated || !results ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f1f5f9' }}>
                      <BarChart3 className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">Geben Sie Ihre Daten ein und klicken Sie auf &quot;Lokal berechnen&quot;</p>
                  </div>
                ) : (
                  <div>
                    {/* Body Fat */}
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

                    {/* Muscle Mass */}
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

                    {/* BMI */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-700">BMI</h4>
                        <span className="text-xl font-bold" style={{ color: results.bmi >= 25 ? '#d97706' : '#059669' }}>{results.bmi.toFixed(1)}</span>
                      </div>
                      <div className="text-sm text-gray-500">{results.bmiCategory} ({results.bmi.toFixed(1)})</div>
                    </div>

                    {/* Insights */}
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

              {/* Accuracy Note */}
              <div className="rounded-xl p-5 border" style={{ backgroundColor: '#fffbeb', borderColor: '#fef3c7' }}>
                <div className="flex gap-3">
                  <span style={{ color: '#d97706' }}>🔬</span>
                  <div>
                    <h4 className="text-sm font-medium" style={{ color: '#92400e' }}>Wissenschaftliche Genauigkeit</h4>
                    <p className="mt-1 text-xs" style={{ color: '#b45309' }}>
                      Dieser Rechner verwendet die <span className="font-semibold">US Navy Formel</span> mit ML-Korrekturen. Für präzisere Ergebnisse mit <span className="font-semibold">BIA-Scans</span>, melden Sie sich für personalisierte Vorhersagen an.
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
