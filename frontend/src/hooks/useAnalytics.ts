import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useBusiness } from './useBusiness'

export interface AnalyticsData {
  totalRevenue: number
  totalTransactions: number
  avgOrderValue: number
  stockTurnover: number
  salesData: any[]
  topProducts: any[]
  lowStockAlerts: any[]
  monthlyComparison: { 
    current: { revenue: number; transactions: number }
    previous: { revenue: number; transactions: number }
  }
}

export const useAnalytics = () => {
  const { user, resolveAppUserId } = useAuth()
  const { business } = useBusiness()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async (timeRange: string = '30d') => {
    if (!user || !business) return

    setLoading(true)
    setError(null)

    try {
      const appUserId = await resolveAppUserId(user)
      if (!appUserId) {
        throw new Error('Unable to resolve user ID')
      }

      // Calculate date range
      const now = new Date()
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

      // Get stock_out transactions (sales)
      const { data: stockOutTransactions, error: stockOutError } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          products (
            id,
            name,
            barcode,
            selling_price,
            cost_price
          )
        `)
        .eq('business_id', business.id)
        .eq('transaction_type', 'stock_out')
        .gte('created_at', startDate.toISOString())

      if (stockOutError) {
        throw stockOutError
      }

      console.log('[useAnalytics] Raw stock_out transactions:', stockOutTransactions)
      console.log('[useAnalytics] Date range:', { startDate: startDate.toISOString(), timeRange })

      // Process analytics data
      const analyticsData = processAnalyticsData(stockOutTransactions || [], timeRange)
      console.log('[useAnalytics] Processed analytics data:', analyticsData)
      setAnalytics(analyticsData)
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [user, business, resolveAppUserId])

  const processAnalyticsData = (transactions: any[], timeRange: string): AnalyticsData => {
    // Calculate total revenue and transactions
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.quantity * t.products?.selling_price || 0), 0)
    const totalTransactions = transactions.length
    const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // Generate sales data by day
    const salesData = generateSalesData(transactions, timeRange)

    // Top products by revenue
    const productRevenue = new Map()
    transactions.forEach(t => {
      const productName = t.products?.name || 'Unknown'
      const revenue = t.quantity * (t.products?.selling_price || 0)
      productRevenue.set(productName, (productRevenue.get(productName) || 0) + revenue)
    })

    const topProducts = Array.from(productRevenue.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Monthly comparison
    const monthlyComparison = generateMonthlyComparison(transactions)

    return {
      totalRevenue,
      totalTransactions,
      avgOrderValue,
      stockTurnover: 0, // TODO: Calculate stock turnover
      salesData,
      topProducts,
      lowStockAlerts: [], // TODO: Get low stock alerts
      monthlyComparison
    }
  }

  const generateSalesData = (transactions: any[], timeRange: string) => {
    console.log('[useAnalytics] generateSalesData - transactions:', transactions.length)
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const salesData = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayTransactions = transactions.filter(t => 
        t.created_at.startsWith(dateStr)
      )

      const revenue = dayTransactions.reduce((sum, t) => 
        sum + (t.quantity * (t.products?.selling_price || 0)), 0
      )

      const dayData = {
        date: dateStr,
        revenue,
        transactions: dayTransactions.length,
        units: dayTransactions.reduce((sum, t) => sum + t.quantity, 0)
      }

      console.log(`[useAnalytics] Day ${dateStr}:`, dayData)
      salesData.push(dayData)
    }

    console.log('[useAnalytics] Generated sales data:', salesData)
    return salesData
  }

  const generateMonthlyComparison = (transactions: any[]) => {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const currentMonthTransactions = transactions.filter(t => 
      new Date(t.created_at) >= currentMonth
    )

    const previousMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.created_at)
      return transactionDate >= previousMonth && transactionDate < currentMonth
    })

    const current = {
      revenue: currentMonthTransactions.reduce((sum, t) => 
        sum + (t.quantity * (t.products?.selling_price || 0)), 0),
      transactions: currentMonthTransactions.length
    }

    const previous = {
      revenue: previousMonthTransactions.reduce((sum, t) => 
        sum + (t.quantity * (t.products?.selling_price || 0)), 0),
      transactions: previousMonthTransactions.length
    }

    return { current, previous }
  }

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  return {
    analytics,
    loading,
    error,
    refetch: loadAnalytics
  }
}

export default useAnalytics
