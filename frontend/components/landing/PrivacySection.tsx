'use client'

export default function PrivacySection() {
  const items = [
    {
      icon: '🏠',
      title: 'Lokale Berechnung',
      desc: 'Alle Berechnungen erfolgen direkt in Ihrem Browser. Keine Daten werden an unsere Server gesendet – nicht einmal für Analytics.',
    },
    {
      icon: '🔓',
      title: 'Open Source Transparenz',
      desc: 'Unser gesamter Code ist öffentlich einsehbar. Keine Black-Box Algorithmen – Sie wissen genau, wie Ihre Daten verarbeitet werden.',
    },
    {
      icon: '🇪🇺',
      title: 'EU-Hosted & DSGVO',
      desc: 'Alle Server stehen in der EU. Volle DSGVO-Konformität mit deutschen Datenschutzstandards.',
    },
    {
      icon: '🚫',
      title: 'Kein Data Selling',
      desc: 'Wir verkaufen oder teilen niemals Ihre Daten. Kein Tracking, kein Profiling, keine Werbenetzwerke.',
    },
  ]

  return (
    <section id="privacy" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Data Privacy by Design</h2>
            <p className="text-lg text-gray-600">Unsere Prinzipien für digitale Souveränität</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {items.map((item, i) => (
              <div key={i} className="rounded-xl p-6" style={{ backgroundColor: '#f8fafc' }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#e6f0ff' }}>
                  <span>{item.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <a href="https://github.com/TheCabbageBaggage/physiq-ml-algorithm" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">
              <span>👁️</span> Sehen Sie sich unseren Open-Source Code an
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
