import React, { useState } from 'react'
import { BarChart3Icon, TrendingUpIcon, TrendingDownIcon, PackageIcon, DollarSignIcon, CalendarIcon, ArrowLeftIcon } from 'lucide-react'
import { PageLayout } from '@/components/ui/PageLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { SalesChart } from '@/components/analytics/SalesChart'
import { MetricCard } from '@/components/analytics/MetricCard'
import { useAnalytics } from '@/hooks/useAnalytics'
import { TIME_RANGES } from '@/utils/constants'
import { formatCurrency, formatNumber } from '@/utils/formatters'

export const AnalyticsPage: React.FC = () => {
  const { analytics, loading, refetch } = useAnalytics()
  const [timeRange, setTimeRange] = useState('30d')

  // Debug logging
  console.log('[AnalyticsPage] Render - analytics:', !!analytics, 'loading:', loading)

  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange)
    refetch(newRange)
  }

  if (loading) {
    return (
      <PageLayout>
        <LoadingSpinner size="lg" text="Loading Analytics..." />
      </PageLayout>
    )
  }

  if (!analytics) {
    return (
      <PageLayout>
        <Card className="p-8 text-center">
          <BarChart3Icon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบข้อมูล</h3>
          <p className="text-gray-600">ไม่สามารถโหลดข้อมูลการวิเคราะห์ได้</p>
        </Card>
      </PageLayout>
    )
  }

  const revenueChange = analytics.monthlyComparison.previous.revenue > 0
    ? ((analytics.monthlyComparison.current.revenue - analytics.monthlyComparison.previous.revenue) / analytics.monthlyComparison.previous.revenue) * 100
    : 0

  const transactionChange = analytics.monthlyComparison.previous.transactions > 0
    ? ((analytics.monthlyComparison.current.transactions - analytics.monthlyComparison.previous.transactions) / analytics.monthlyComparison.previous.transactions) * 100
    : 0

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <PageHeader
          title="Analytics"
          subtitle="Business insights and performance metrics"
          onBack={() => window.history.back()}
        />

      {/* Time Range Selector */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          <CalendarIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
          <div className="flex gap-2 min-w-max">
            {TIME_RANGES.map((range) => (
              <Button
                key={range.value}
                variant={timeRange === range.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleTimeRangeChange(range.value)}
                className="whitespace-nowrap min-h-[44px] px-4 py-2 text-base"
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12" style={{ gap: '2rem' }}>
        <MetricCard
          title="Total Revenue"
          value={analytics.totalRevenue}
          format="currency"
          change={{
            value: Math.abs(revenueChange),
            type: revenueChange >= 0 ? 'increase' : 'decrease'
          }}
          icon={<DollarSignIcon className="h-8 w-8 text-green-500" />}
        />

        <MetricCard
          title="Total Orders"
          value={analytics.totalTransactions}
          format="number"
          change={{
            value: Math.abs(transactionChange),
            type: transactionChange >= 0 ? 'increase' : 'decrease'
          }}
          icon={<PackageIcon className="h-8 w-8 text-blue-500" />}
        />

        <MetricCard
          title="Average Order Value"
          value={analytics.avgOrderValue}
          format="currency"
          icon={<TrendingUpIcon className="h-8 w-8 text-purple-500" />}
        />

        <MetricCard
          title="Stock Turnover"
          value={analytics.stockTurnover}
          format="number"
          icon={<BarChart3Icon className="h-8 w-8 text-orange-500" />}
        />
      </div>

      {/* Sales Trend Chart */}
      <Card>
        <div className="px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Sales Trend</h3>
        </div>
        <div className="p-4 sm:p-6">
          <SalesChart salesData={analytics.salesData} />
        </div>
      </Card>

      {/* Top Products */}
      <Card>
        <div className="px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Top Products by Revenue</h3>
        </div>
        <div className="p-4 sm:p-6">
          {analytics.topProducts.length > 0 ? (
            <div className="space-y-4">
              {analytics.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{product.name}</span>
                  </div>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <PackageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No product data available</p>
            </div>
          )}
        </div>
      </Card>

      {/* Monthly Comparison */}
      <Card>
        <div className="px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Monthly Comparison</h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-600 mb-2">This Month</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(analytics.monthlyComparison.current.revenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Orders:</span>
                  <span className="font-semibold text-blue-600">
                    {formatNumber(analytics.monthlyComparison.current.transactions)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Last Month</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(analytics.monthlyComparison.previous.revenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Orders:</span>
                  <span className="font-semibold text-gray-900">
                    {formatNumber(analytics.monthlyComparison.previous.transactions)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      </div>
    </PageLayout>
  )
}

export default AnalyticsPage
