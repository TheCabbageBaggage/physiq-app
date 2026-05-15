'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Point = {
  date: string
  label: string
  value: number
  pointType?: 'historical' | 'predicted'
  confidenceLow?: number
  confidenceHigh?: number
}

type ChartComponentProps = {
  title: string
  data: Point[]
  unit: string
  color?: string
  heightClass?: string
}

export default function ChartComponent({
  title,
  data,
  unit,
  color = '#2563eb',
  heightClass = 'h-[250px] md:h-[300px]',
}: ChartComponentProps) {
  const chartData = data.map((p) => ({
    ...p,
    historicalValue: p.pointType === 'predicted' ? null : p.value,
    predictedValue: p.pointType === 'predicted' ? p.value : null,
  }))

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      <div className={heightClass}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip
              formatter={(value: number, _name, payload) => {
                const p = payload?.payload as Point
                const typeLabel = p?.pointType === 'predicted' ? 'Predicted' : 'Historical'
                const base = `${value.toFixed(1)} ${unit} (${typeLabel})`
                if (p?.pointType === 'predicted' && p?.confidenceLow !== undefined && p?.confidenceHigh !== undefined) {
                  return [`${base} | CI: ${p.confidenceLow.toFixed(1)} - ${p.confidenceHigh.toFixed(1)} ${unit}`, 'Value']
                }
                return [base, 'Value']
              }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''}
            />
            <Line
              type="monotone"
              dataKey="historicalValue"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="predictedValue"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
