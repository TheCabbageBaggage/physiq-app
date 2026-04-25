/**
 * Progress Chart Component (Placeholder)
 * 
 * This is a placeholder for chart components that will display progress data.
 * In production, this would be implemented with a charting library like Recharts or Chart.js.
 * 
 * Props:
 * - title: Chart title
 * - data: Chart data array
 * - type: Chart type ('line' | 'bar' | 'area')
 */

interface ProgressChartProps {
  title: string
  data: any[]
  type: 'line' | 'bar' | 'area'
}

export default function ProgressChart({ title, data, type }: ProgressChartProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">Chart visualization placeholder</p>
      </div>
      
      {/* Chart Placeholder */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center p-8">
          <div className="text-gray-400 mb-2">
            {/* Simple chart visualization using CSS */}
            <div className="relative h-32 w-64 mx-auto">
              {/* Grid lines */}
              <div className="absolute inset-0 border border-gray-200 rounded"></div>
              <div className="absolute top-1/4 left-0 right-0 border-t border-gray-100"></div>
              <div className="absolute top-1/2 left-0 right-0 border-t border-gray-100"></div>
              <div className="absolute top-3/4 left-0 right-0 border-t border-gray-100"></div>
              
              {/* Chart line/bar placeholder */}
              {type === 'line' && (
                <div className="absolute inset-0 flex items-end">
                  <div className="flex-1 h-3/4 border-r border-gray-200 relative">
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-3/4 bg-blue-500"></div>
                  </div>
                  <div className="flex-1 h-full border-r border-gray-200 relative">
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-5/6 bg-blue-500"></div>
                  </div>
                  <div className="flex-1 h-5/6 border-r border-gray-200 relative">
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-2/3 bg-blue-500"></div>
                  </div>
                  <div className="flex-1 h-2/3 border-r border-gray-200 relative">
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1/2 bg-blue-500"></div>
                  </div>
                  <div className="flex-1 h-3/4 relative">
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-2/3 bg-blue-500"></div>
                  </div>
                </div>
              )}
              
              {type === 'bar' && (
                <div className="absolute inset-0 flex items-end px-4">
                  <div className="flex-1 mx-1">
                    <div className="h-3/4 bg-blue-500 rounded-t"></div>
                  </div>
                  <div className="flex-1 mx-1">
                    <div className="h-5/6 bg-blue-500 rounded-t"></div>
                  </div>
                  <div className="flex-1 mx-1">
                    <div className="h-2/3 bg-blue-500 rounded-t"></div>
                  </div>
                  <div className="flex-1 mx-1">
                    <div className="h-1/2 bg-blue-500 rounded-t"></div>
                  </div>
                  <div className="flex-1 mx-1">
                    <div className="h-2/3 bg-blue-500 rounded-t"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-500 text-sm">
            {type === 'line' && 'Line chart visualization will appear here'}
            {type === 'bar' && 'Bar chart visualization will appear here'}
            {type === 'area' && 'Area chart visualization will appear here'}
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Implement with Recharts/Chart.js in production
          </p>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
          <span className="text-sm text-gray-600">Current Period</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-300 rounded mr-2"></div>
          <span className="text-sm text-gray-600">Previous Period</span>
        </div>
      </div>
    </div>
  )
}