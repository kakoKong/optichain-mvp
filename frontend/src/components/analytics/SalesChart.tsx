import React, { useState } from 'react'
import { BarChart3Icon, DollarSignIcon, PackageIcon } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'

interface SalesChartProps {
  salesData: Array<{
    date: string
    revenue: number
    transactions: number
    units: number
  }>
}

export const SalesChart: React.FC<SalesChartProps> = ({ salesData }) => {
  const [mode, setMode] = useState<'revenue' | 'units'>('revenue')
  console.log('[SalesChart] Received sales data:', salesData)

  if (!salesData || salesData.length === 0 || !salesData.some(d => d.revenue > 0)) {
    return (
      <div className="h-48 sm:h-64 relative bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <BarChart3Icon className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No sales data available</p>
          <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
            Try making some sales to see trends
          </p>
        </div>
      </div>
    )
  }

  // Calculate max value based on mode
  const maxValue = mode === 'revenue' 
    ? Math.max(...salesData.map(d => d.revenue))
    : Math.max(...salesData.map(d => d.units))

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setMode('revenue')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'revenue'
              ? 'bg-purple-100 text-purple-700 border border-purple-200'
              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
          }`}
        >
          <DollarSignIcon className="h-4 w-4" />
          Revenue
        </button>
        <button
          onClick={() => setMode('units')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'units'
              ? 'bg-purple-100 text-purple-700 border border-purple-200'
              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
          }`}
        >
          <PackageIcon className="h-4 w-4" />
          Units
        </button>
      </div>

      {/* Chart */}
      <div className="h-48 sm:h-64 relative bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-end justify-between h-full gap-1 sm:gap-2">
          {salesData.map((day, index) => {
            const currentValue = mode === 'revenue' ? day.revenue : day.units
            const pct = maxValue > 0 ? (currentValue / maxValue) * 100 : 0
            const height = Math.max(pct, 3) // keep a tiny sliver for zeros

            return (
              <div key={index} className="flex-1 h-full flex flex-col justify-end items-center gap-1 sm:gap-2 min-w-0">
                <div
                  className="w-full bg-purple-500 rounded-t-sm sm:rounded-t-lg relative group cursor-pointer transition-all hover:bg-purple-600 border border-purple-600"
                  style={{ height: `${height}%`, minHeight: 4 }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                    {mode === 'revenue' ? (
                      <>
                        {formatCurrency(day.revenue)}
                        <br />
                        {day.transactions} orders
                      </>
                    ) : (
                      <>
                        {day.units} units
                        <br />
                        {day.transactions} orders
                      </>
                    )}
                  </div>
                </div>

                <div className="text-xs text-center truncate w-full" style={{ color: 'var(--muted)' }}>
                  {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SalesChart
