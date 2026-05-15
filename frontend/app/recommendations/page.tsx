/**
 * Recommendations Page
 * 
 * This page shows personalized trainer recommendations based on user data.
 * Includes exercise, nutrition, and recovery advice.
 * 
 * Features:
 * - Personalized exercise recommendations
 * - Nutrition and hydration tips
 * - Recovery and sleep advice
 * - Priority-based sorting
 */

import { Dumbbell, Apple, Moon, AlertCircle, CheckCircle } from 'lucide-react'

export default function RecommendationsPage() {
  const recommendations = {
    exercise: [
      { 
        title: 'Increase Strength Training Frequency', 
        description: 'Add one more strength session per week to accelerate muscle growth',
        priority: 'high',
        rationale: 'Muscle mass growth is below target rate',
        action: 'Schedule Tuesday evening session'
      },
      { 
        title: 'Focus on Compound Movements', 
        description: 'Prioritize squats, deadlifts, and bench press over isolation exercises',
        priority: 'medium',
        rationale: 'Better hormonal response and time efficiency',
        action: 'Replace bicep curls with pull-ups'
      },
      { 
        title: 'Add HIIT Cardio', 
        description: 'Include 2x 20-minute HIIT sessions per week for fat loss',
        priority: 'medium',
        rationale: 'Body fat reduction has plateaued',
        action: 'Monday and Thursday mornings'
      },
    ],
    nutrition: [
      { 
        title: 'Increase Protein Intake', 
        description: 'Aim for 2g of protein per kg of body weight daily',
        priority: 'high',
        rationale: 'Current intake supports maintenance but not growth',
        action: 'Add protein shake post-workout'
      },
      { 
        title: 'Time Carbohydrates', 
        description: 'Consume majority of carbs around workouts',
        priority: 'medium',
        rationale: 'Better energy utilization and insulin sensitivity',
        action: 'Pre-workout banana, post-workout rice'
      },
      { 
        title: 'Hydration Check', 
        description: 'Increase water intake to 3L daily',
        priority: 'low',
        rationale: 'Water percentage slightly below optimal range',
        action: 'Carry 1L water bottle, refill 3x daily'
      },
    ],
    recovery: [
      { 
        title: 'Sleep Quality Improvement', 
        description: 'Aim for 7.5-8 hours of quality sleep nightly',
        priority: 'high',
        rationale: 'Metabolic age indicates recovery could be improved',
        action: 'Establish 10 PM bedtime routine'
      },
      { 
        title: 'Active Recovery Days', 
        description: 'Include light activity on rest days (walking, stretching)',
        priority: 'medium',
        rationale: 'Improves circulation and reduces soreness',
        action: '30-minute walk on Wednesday and Sunday'
      },
      { 
        title: 'Stress Management', 
        description: 'Incorporate 10 minutes of daily meditation',
        priority: 'low',
        rationale: 'Cortisol levels may be affecting progress',
        action: 'Morning meditation before breakfast'
      },
    ]
  }
  
  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
  }
  
  const priorityIcons = {
    high: AlertCircle,
    medium: AlertCircle,
    low: CheckCircle,
  }
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Trainer Recommendations</h1>
        <p className="text-gray-600 mt-2">
          Personalized advice based on your measurements and progress. Updated daily.
        </p>
      </div>
      
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Your Action Plan</h2>
            <p className="opacity-90">
              3 high-priority actions this week. Focus on strength training and sleep quality.
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">87%</div>
            <div className="text-sm opacity-90">Adherence Score</div>
          </div>
        </div>
      </div>
      
      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exercise Recommendations */}
        <div className="card-hover">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <Dumbbell className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Exercise</h2>
                <p className="text-sm text-gray-600">Training adjustments</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recommendations.exercise.map((rec, index) => {
                const PriorityIcon = priorityIcons[rec.priority as keyof typeof priorityIcons]
                return (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{rec.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[rec.priority as keyof typeof priorityColors]}`}>
                        {rec.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                    <div className="text-xs text-gray-500 mb-2">
                      <strong>Rationale:</strong> {rec.rationale}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">
                      <PriorityIcon className="h-4 w-4 inline mr-1" />
                      Action: {rec.action}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Nutrition Recommendations */}
        <div className="card-hover">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <Apple className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Nutrition</h2>
                <p className="text-sm text-gray-600">Diet & hydration</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recommendations.nutrition.map((rec, index) => {
                const PriorityIcon = priorityIcons[rec.priority as keyof typeof priorityIcons]
                return (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{rec.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[rec.priority as keyof typeof priorityColors]}`}>
                        {rec.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                    <div className="text-xs text-gray-500 mb-2">
                      <strong>Rationale:</strong> {rec.rationale}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">
                      <PriorityIcon className="h-4 w-4 inline mr-1" />
                      Action: {rec.action}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Recovery Recommendations */}
        <div className="card-hover">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Moon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Recovery</h2>
                <p className="text-sm text-gray-600">Sleep & stress management</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recommendations.recovery.map((rec, index) => {
                const PriorityIcon = priorityIcons[rec.priority as keyof typeof priorityIcons]
                return (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{rec.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[rec.priority as keyof typeof priorityColors]}`}>
                        {rec.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                    <div className="text-xs text-gray-500 mb-2">
                      <strong>Rationale:</strong> {rec.rationale}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">
                      <PriorityIcon className="h-4 w-4 inline mr-1" />
                      Action: {rec.action}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Implementation Plan */}
      <div className="card-hover p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Implementation Plan</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Day</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Exercise</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Nutrition Focus</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Recovery</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { day: 'Monday', exercise: 'HIIT + Strength', nutrition: 'High protein', recovery: '8 hours sleep', status: 'completed' },
                { day: 'Tuesday', exercise: 'Strength Training', nutrition: 'Carb timing', recovery: 'Meditation', status: 'today' },
                { day: 'Wednesday', exercise: 'Active Recovery', nutrition: 'Hydration focus', recovery: 'Light walk', status: 'upcoming' },
                { day: 'Thursday', exercise: 'HIIT + Strength', nutrition: 'High protein', recovery: '8 hours sleep', status: 'upcoming' },
                { day: 'Friday', exercise: 'Strength Training', nutrition: 'Carb timing', recovery: 'Meditation', status: 'upcoming' },
                { day: 'Saturday', exercise: 'Active Recovery', nutrition: 'Hydration focus', recovery: 'Light walk', status: 'upcoming' },
                { day: 'Sunday', exercise: 'Rest Day', nutrition: 'Flexible eating', recovery: '8+ hours sleep', status: 'upcoming' },
              ].map((row, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium text-gray-900">{row.day}</td>
                  <td className="py-3 px-2">{row.exercise}</td>
                  <td className="py-3 px-2">{row.nutrition}</td>
                  <td className="py-3 px-2">{row.recovery}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.status === 'completed' ? 'bg-green-100 text-green-800' :
                      row.status === 'today' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Important Disclaimer</h3>
        <p className="text-gray-700 mb-3">
          These recommendations are generated based on your measurement data and general health guidelines. 
          They are not a substitute for professional medical advice.
        </p>
        <ul className="space-y-2 text-gray-600 text-sm">
          <li className="flex items-start">
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3"></span>
            <span>Consult with a healthcare professional before starting any new exercise or diet program</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3"></span>
            <span>Adjust recommendations based on how your body responds</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3"></span>
            <span>Listen to your body and rest when needed</span>
          </li>
        </ul>
      </div>
    </div>
  )
}