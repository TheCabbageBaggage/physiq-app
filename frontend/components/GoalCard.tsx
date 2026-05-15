/**
 * Goal Card Component
 * 
 * Displays a single goal with current progress, target, and deadline.
 * Shows progress bar and priority indicator.
 * 
 * Props:
 * - title: Goal name
 * - currentValue: Current measurement value
 * - targetValue: Target measurement value
 * - unit: Measurement unit
 * - progress: Progress percentage (0-100)
 * - deadline: Target completion date
 * - priority: Priority level ('high' | 'medium' | 'low')
 */

import { Target, Calendar, AlertCircle } from 'lucide-react'

interface GoalCardProps {
  title: string
  currentValue: number
  targetValue: number
  unit: string
  progress: number
  deadline: string
  priority: 'high' | 'medium' | 'low'
}

export default function GoalCard({
  title,
  currentValue,
  targetValue,
  unit,
  progress,
  deadline,
  priority
}: GoalCardProps) {
  const remaining = targetValue - currentValue
  const isPositive = remaining > 0
  const remainingAbs = Math.abs(remaining)
  
  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-blue-100 text-blue-800',
  }
  
  const priorityIcons = {
    high: AlertCircle,
    medium: AlertCircle,
    low: Target,
  }
  
  const PriorityIcon = priorityIcons[priority]
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  
  const daysUntilDeadline = Math.ceil(
    (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )
  
  return (
    <div className="card-hover p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg mr-3">
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[priority]} mt-1 inline-block`}>
              <PriorityIcon className="h-3 w-3 inline mr-1" />
              {priority} priority
            </span>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${
              progress >= 80 ? 'bg-green-500' :
              progress >= 50 ? 'bg-blue-500' :
              progress >= 25 ? 'bg-amber-500' :
              'bg-red-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Values */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-600">Current</div>
          <div className="text-2xl font-bold text-gray-900">{currentValue}{unit}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Target</div>
          <div className="text-2xl font-bold text-gray-900">{targetValue}{unit}</div>
        </div>
      </div>
      
      {/* Remaining & Deadline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <Target className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm text-gray-700">Remaining</span>
          </div>
          <div className={`font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? '+' : '-'}{remainingAbs}{unit}
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm text-gray-700">Deadline</span>
          </div>
          <div className="text-right">
            <div className="font-medium text-gray-900">{formatDate(deadline)}</div>
            <div className="text-xs text-gray-500">
              {daysUntilDeadline > 0 ? `${daysUntilDeadline} days left` : 'Overdue'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Button */}
      <button className="w-full mt-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
        Update Progress
      </button>
    </div>
  )
}