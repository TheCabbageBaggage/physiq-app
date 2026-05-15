/**
 * Prediction Chart Component (Placeholder)
 * 
 * Displays 90-day projections with current vs projected values.
 * Includes confidence indicators and trend lines.
 * 
 * Props:
 * - title: Chart title
 * - currentValue: Current measurement value
 * - projectedValue: Projected value after timeframe
 * - unit: Measurement unit (kg, %, etc.)
 * - timeframe: Projection timeframe ('30d', '60d', '90d', '180d')
 */

interface PredictionChartProps {
  title: string
  currentValue: number
  projectedValue: number
  unit: string
  timeframe: string
}

export default function PredictionChart({ 
  title, 
  currentValue, 
  projectedValue, 
  unit,
  timeframe 
}: PredictionChartProps) {
  const change = projectedValue - currentValue
  const changePercent = ((change / currentValue) * 100).toFixed(1)
  const isPositive = change < 0 // Negative change is good for weight/body fat
  
  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case '30d': return '30 days'
      case '60d': return '60 days'
      case '90d': return '90 days'
      case '180d': return '180 days'
      default: return tf
    }
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">Projection over {getTimeframeLabel(timeframe)}</p>
      </div>
      
      {/* Chart Visualization Placeholder */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 mb-4">
        <div className="text-center p-6">
          <div className="relative h-40 w-64 mx-auto mb-4">
            {/* Grid */}
            <div className="absolute inset-0 border border-gray-200 rounded"></div>
            
            {/* Current value indicator */}
            <div className="absolute left-1/4 top-1/2 transform -translate-y-1/2">
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-blue-700">Now</span>
                </div>
                <div className="text-sm font-medium">{currentValue}{unit}</div>
              </div>
            </div>
            
            {/* Projection line */}
            <div className="absolute left-1/4 top-1/2 right-1/4 h-1 bg-gradient-to-r from-blue-500 to-green-500"></div>
            
            {/* Projected value indicator */}
            <div className="absolute right-1/4 top-1/2 transform -translate-y-1/2">
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-green-700">{timeframe}</span>
                </div>
                <div className="text-sm font-medium">{projectedValue.toFixed(1)}{unit}</div>
              </div>
            </div>
            
            {/* Change indicator */}
            <div className="absolute left-1/2 top-1/4 transform -translate-x-1/2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isPositive ? '↓' : '↑'} {Math.abs(change).toFixed(1)}{unit} ({changePercent}%)
              </div>
            </div>
          </div>
          
          <p className="text-gray-500 text-sm">
            Projection based on linear trend analysis
          </p>
        </div>
      </div>
      
      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-sm text-blue-700 font-medium">Current</div>
          <div className="text-xl font-bold text-blue-900">{currentValue}{unit}</div>
          <div className="text-xs text-blue-600">Today's measurement</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-sm text-green-700 font-medium">Projected</div>
          <div className="text-xl font-bold text-green-900">{projectedValue.toFixed(1)}{unit}</div>
          <div className="text-xs text-green-600">In {getTimeframeLabel(timeframe)}</div>
        </div>
      </div>
      
      {/* Confidence Indicator */}
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Projection Confidence</span>
          <span>85%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 rounded-full"
            style={{ width: '85%' }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Based on data consistency and trend strength
        </div>
      </div>
    </div>
  )
}