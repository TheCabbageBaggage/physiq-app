import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

type Direction = 'up' | 'down' | 'stable'
type Metric = 'weight' | 'body_fat' | 'muscle_mass' | string

interface TrendIndicatorProps {
  direction: Direction
  change: number
  metric: Metric
  unit?: string
}

function isImprovement(metric: Metric, direction: Direction) {
  if (direction === 'stable') return null

  if (metric === 'weight' || metric === 'body_fat') {
    return direction === 'down'
  }

  if (metric === 'muscle_mass') {
    return direction === 'up'
  }

  return direction === 'down'
}

export default function TrendIndicator({ direction, change, metric, unit = '' }: TrendIndicatorProps) {
  const improvement = isImprovement(metric, direction)

  const colorClass =
    improvement === null ? 'text-gray-500 bg-gray-100' : improvement ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'

  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus
  const signedChange = `${change > 0 ? '+' : ''}${change.toFixed(1)}${unit}`
  const title = direction === 'stable' ? `No significant change since last measurement` : `${signedChange} since last measurement`

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
      aria-label={`Trend ${direction}, ${title}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {direction === 'stable' ? 'stable' : signedChange}
    </span>
  )
}
