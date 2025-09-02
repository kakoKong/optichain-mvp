// frontend/app/liff/analytics/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    BarChart3Icon,
    TrendingUpIcon,
    TrendingDownIcon,
    PackageIcon,
    DollarSignIcon,
    CalendarIcon,
    ArrowLeftIcon,
    DownloadIcon,
    FilterIcon
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

declare global {
    interface Window {
        liff: any;
    }
}

interface AnalyticsData {
    totalRevenue: number
    totalTransactions: number
    avgOrderValue: number
    stockTurnover: number
    salesData: any[]
    topProducts: any[]
    lowStockAlerts: any[]
    monthlyComparison: { current: { revenue: number; transactions: number }; previous: { revenue: number; transactions: number } }
}

export default function Analytics() {
    const { user, loading: authLoading } = useAuth()
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(false)
    const [timeRange, setTimeRange] = useState('30d')
    const [business, setBusiness] = useState<any>(null)

    useEffect(() => {
        if (authLoading || !user) return
        initializeAndLoad()
    }, [authLoading, user, timeRange])

    // Helper function to resolve app-level user ID
    const resolveAppUserId = async (u: { id: string; source: 'line' | 'dev'; databaseUid?: string }) => {
        // For dev users: use the databaseUid directly
        if (u.source === 'dev' && u.databaseUid) {
            console.log('[resolveAppUserId] Dev user detected, using databaseUid:', u.databaseUid)
            return u.databaseUid
        }

        // For LINE: map liff profile id to your app user (public.users.id)
        // NOTE: this expects `public.users.line_user_id` to exist.
        if (u.source === 'line') {
            console.log('[resolveAppUserId] LINE user detected, mapping from line_user_id:', u.id)
            
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('line_user_id', u.id)
                .single()

            if (error) {
                console.warn('Could not map LINE user to app user:', error)
                return null
            }
            return data?.id ?? null
        }

        console.warn('[resolveAppUserId] Unknown user source:', u.source)
        return null
    }

    // Helper function to fetch business for user (same as dashboard)
    const fetchBusinessForUser = async (appUserId: string) => {
        // Try owner first
        const { data: owned, error: ownedErr } = await supabase
            .from('businesses')
            .select('id, name')
            .eq('owner_id', appUserId)
            .limit(1)

        if (ownedErr) throw ownedErr
        if (owned && owned.length > 0) {
            return owned[0]
        }

        // Fallback: first business where the user is a member
        const { data: membership, error: memErr } = await supabase
            .from('business_members')
            .select(`
                business:business_id (
                    id, name
                )
            `)
            .eq('user_id', appUserId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        if (memErr) throw memErr
        if (!membership?.business) return null

        return membership.business
    }

    const initializeAndLoad = async () => {
        setLoading(true)
        try {
            if (!user) { setLoading(false); return }

            // 1) Resolve app-level user id used in your public schema
            const appUserId = await resolveAppUserId(user)
            if (!appUserId) {
                console.warn('Could not resolve app user id')
                setLoading(false)
                return
            }

            // Fetch business using the resolved app user ID
            const businessData = await fetchBusinessForUser(appUserId)
            if (businessData) {
                const business = Array.isArray(businessData) ? businessData[0] : businessData
                setBusiness(business)
                await loadAnalyticsData(business.id)
            }
        } catch (e) {
            console.error('Init analytics failed:', e)
        } finally {
            setLoading(false)
        }
    }


    const loadBusinessAndAnalytics = async (lineUserId: string) => {
        try {
            // Get user's business
            const { data: userData } = await supabase
                .from('profiles')
                .select('*, businesses(*)')
                .eq('line_user_id', lineUserId)
                .single()

            if (userData?.businesses?.[0]) {
                const businessData = userData.businesses[0]
                setBusiness(businessData)
                await loadAnalyticsData(businessData.id)
            }
        } catch (error) {
            console.error('Error loading business:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadAnalyticsData = async (businessId: string) => {
        try {
            const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - daysBack)

            // Get transactions for the period
            const { data: transactions } = await supabase
                .from('inventory_transactions')
                .select(`
          *,
          products (name, selling_price, cost_price)
        `)
                .eq('business_id', businessId)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true })

            // Get all products for stock analysis
            const { data: products } = await supabase
                .from('products')
                .select(`
          *,
          inventory (current_stock, min_stock_level)
        `)
                .eq('business_id', businessId)

            if (transactions && products) {
                const analyticsData = processAnalyticsData(transactions, products)
                setAnalytics(analyticsData)
            }
        } catch (error) {
            console.error('Error loading analytics:', error)
        }
    }

    const processAnalyticsData = (transactions: any[], products: any[]): AnalyticsData => {
        // Calculate revenue (stock_out transactions)
        const stockOutTransactions = transactions.filter(t => t.transaction_type === 'stock_out')
        const totalRevenue = stockOutTransactions.reduce((sum, t) => {
            const price = Number(t.products?.selling_price || 0)
            return sum + (t.quantity * price)
        }, 0)

        const totalTransactions = stockOutTransactions.length
        const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

        // Stock turnover calculation
        const totalInventoryValue = products.reduce((sum, p) => {
            const stock = p.inventory?.[0]?.current_stock || 0
            const cost = Number(p.cost_price || 0)
            return sum + (stock * cost)
        }, 0)

        const stockTurnover = totalInventoryValue > 0 ? totalRevenue / totalInventoryValue : 0

        // Daily sales data for chart
        const salesData = generateDailySalesData(stockOutTransactions)

        // Top products by revenue
        const productRevenue = new Map()
        stockOutTransactions.forEach(t => {
            const productName = t.products?.name || 'Unknown'
            const revenue = t.quantity * Number(t.products?.selling_price || 0)
            productRevenue.set(productName, (productRevenue.get(productName) || 0) + revenue)
        })

        const topProducts = Array.from(productRevenue.entries())
            .map(([name, revenue]) => ({ name, revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)

        // Low stock alerts
        const lowStockAlerts = products
            .filter(p => {
                const current = p.inventory?.[0]?.current_stock || 0
                const minimum = p.inventory?.[0]?.min_stock_level || 0
                return current <= minimum && minimum > 0
            })
            .map(p => ({
                name: p.name,
                current: p.inventory?.[0]?.current_stock || 0,
                minimum: p.inventory?.[0]?.min_stock_level || 0
            }))

        // Monthly comparison (current vs previous period)
        const monthlyComparison = generateMonthlyComparison(transactions)

        return {
            totalRevenue,
            totalTransactions,
            avgOrderValue,
            stockTurnover,
            salesData,
            topProducts,
            lowStockAlerts,
            monthlyComparison
        }
    }

    const generateDailySalesData = (transactions: any[]) => {
        const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
        
        const dailyData = Array.from({ length: daysBack }, (_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - (daysBack - 1 - i))
            return {
                date: date.toISOString().split('T')[0],
                revenue: 0,
                transactions: 0,
                units: 0
            }
        })

        transactions.forEach(t => {
            const txDate = t.created_at.split('T')[0]
            const dayData = dailyData.find(d => d.date === txDate)
            if (dayData && t.transaction_type === 'stock_out') {
                const revenue = t.quantity * Number(t.products?.selling_price || 0)
                dayData.revenue += revenue
                dayData.transactions += 1
                dayData.units += t.quantity
            }
        })

        return dailyData
    }

    const generateMonthlyComparison = (transactions: any[]) => {
        const now = new Date()
        const currentMonth = now.getMonth()
        const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const currentYear = now.getFullYear()
        const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear

        const currentMonthData = transactions.filter(t => {
            const txDate = new Date(t.created_at)
            return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
        })

        const previousMonthData = transactions.filter(t => {
            const txDate = new Date(t.created_at)
            return txDate.getMonth() === previousMonth && txDate.getFullYear() === previousYear
        })

        const calculateMetrics = (data: any[]) => {
            const stockOut = data.filter(t => t.transaction_type === 'stock_out')
            const revenue = stockOut.reduce((sum, t) => sum + (t.quantity * Number(t.products?.selling_price || 0)), 0)
            return { revenue, transactions: stockOut.length }
        }

        const current = calculateMetrics(currentMonthData)
        const previous = calculateMetrics(previousMonthData)

        return { current, previous }
    }

    const formatCurrency = (amount: number) => `฿${amount.toLocaleString()}`

    const getGrowthPercentage = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return Math.round(((current - previous) / previous) * 100)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
                    <p className="mt-6 text-gray-600 font-medium">Loading analytics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen relative overflow-hidden" style={{
            backgroundImage: 'linear-gradient(to bottom right, var(--bg-from), var(--bg-via), var(--bg-to))',
        }}>
            {/* Animated background blobs, tinted by theme */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply blur-xl opacity-40 animate-blob"
                    style={{ background: 'var(--accentA)' }}
                />
                <div
                    className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply blur-xl opacity-40 animate-blob animation-delay-2000"
                    style={{ background: 'var(--accentB)' }}
                />
                <div
                    className="absolute top-40 left-40 w-80 h-80 rounded-full mix-blend-multiply blur-xl opacity-40 animate-blob animation-delay-4000"
                    style={{ background: 'var(--accentC)' }}
                />
            </div>
            {/* Subtle grid overlay */}
            <div
                className="absolute inset-0 opacity-70"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />
            
            <div className="relative z-10 p-4 sm:p-6 space-y-6 sm:space-y-8 pb-20 sm:pb-6">
                {/* Header */}
                <div
                    className="relative overflow-hidden rounded-2xl border shadow-xl backdrop-blur-lg"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                >
                    {/* Accent bar */}
                    <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-60"
                        style={{ background: 'linear-gradient(90deg, transparent, var(--accentA), var(--accentB), transparent)' }}
                    />
                    <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                            <button
                                onClick={() => window.history.back()}
                                className="p-3 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors flex-shrink-0"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
                            </button>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h1
                                        className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate flex items-center gap-2 sm:gap-3"
                                        style={{ color: 'var(--text)' }}
                                    >
                                        <BarChart3Icon className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
                                        <span className="hidden sm:inline">Analytics Dashboard</span>
                                        <span className="sm:hidden">Analytics</span>
                                    </h1>
                                </div>
                                <p className="mt-1 text-xs sm:text-sm lg:text-base truncate" style={{ color: 'var(--muted)' }}>
                                    <span className="hidden sm:inline">Business insights and performance metrics</span>
                                    <span className="sm:hidden">Performance metrics</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="flex overflow-x-auto gap-2 sm:gap-3 pb-2 sm:pb-0">
                                <button
                                    onClick={() => setTimeRange('7d')}
                                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                        timeRange === '7d' 
                                            ? 'text-white' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                    style={{
                                        background: timeRange === '7d' ? 'var(--accentA)' : 'var(--input-bg)',
                                        border: `1px solid ${timeRange === '7d' ? 'var(--accentA)' : 'var(--input-border)'}`,
                                    }}
                                >
                                    7D
                                </button>
                                <button
                                    onClick={() => setTimeRange('30d')}
                                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                        timeRange === '30d' 
                                            ? 'text-white' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                    style={{
                                        background: timeRange === '30d' ? 'var(--accentA)' : 'var(--input-bg)',
                                        border: `1px solid ${timeRange === '30d' ? 'var(--accentA)' : 'var(--input-border)'}`,
                                    }}
                                >
                                    30D
                                </button>
                                <button
                                    onClick={() => setTimeRange('90d')}
                                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                                        timeRange === '90d' 
                                            ? 'text-white' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                    style={{
                                        background: timeRange === '90d' ? 'var(--accentA)' : 'var(--input-bg)',
                                        border: `1px solid ${timeRange === '90d' ? 'var(--accentA)' : 'var(--input-border)'}`,
                                    }}
                                >
                                    90D
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                        className="p-4 sm:p-6 rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Total Revenue</p>
                                <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1 sm:mt-2">
                                    {formatCurrency(analytics?.totalRevenue || 0)}
                                </p>
                                {analytics?.monthlyComparison && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <TrendingUpIcon className="h-4 w-4 text-green-500" />
                                        <span className="text-sm text-green-600 font-medium">
                                            {getGrowthPercentage(
                                                analytics.monthlyComparison.current.revenue,
                                                analytics.monthlyComparison.previous.revenue
                                            )}%
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-green-100 p-3 rounded-xl">
                                <DollarSignIcon className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div
                        className="p-4 sm:p-6 rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Transactions</p>
                                <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1 sm:mt-2">
                                    {analytics?.totalTransactions || 0}
                                </p>
                                {analytics?.monthlyComparison && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                                        <span className="text-sm text-blue-600 font-medium">
                                            {getGrowthPercentage(
                                                analytics.monthlyComparison.current.transactions,
                                                analytics.monthlyComparison.previous.transactions
                                            )}%
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <BarChart3Icon className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div
                        className="p-4 sm:p-6 rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Avg Order Value</p>
                                <p className="text-xl sm:text-2xl font-bold text-purple-600 mt-1 sm:mt-2">
                                    {formatCurrency(analytics?.avgOrderValue || 0)}
                                </p>
                            </div>
                            <div className="bg-purple-100 p-3 rounded-xl">
                                <TrendingUpIcon className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </div>

                    <div
                        className="p-4 sm:p-6 rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Stock Turnover</p>
                                <p className="text-xl sm:text-2xl font-bold text-orange-600 mt-1 sm:mt-2">
                                    {(analytics?.stockTurnover || 0).toFixed(1)}x
                                </p>
                            </div>
                            <div className="bg-orange-100 p-3 rounded-xl">
                                <PackageIcon className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sales Chart */}
                <div
                    className="rounded-2xl shadow-sm border backdrop-blur-xl"
                    style={{
                        background: 'var(--card-bg)',
                        borderColor: 'var(--card-border)',
                    }}
                >
                    <div className="px-4 sm:px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Sales Trend</h3>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                <span className="text-sm" style={{ color: 'var(--muted)' }}>Revenue</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6">
                        <div className="h-48 sm:h-64 relative">
                            {analytics?.salesData && analytics.salesData.length > 0 ? (
                                <div className="flex items-end justify-between h-full gap-1 sm:gap-2">
                                    {analytics.salesData.map((day, index) => {
                                        const maxRevenue = Math.max(...analytics.salesData.map(d => d.revenue))
                                        const height = maxRevenue > 0 ? Math.max((day.revenue / maxRevenue) * 100, 5) : 5

                                        return (
                                            <div key={index} className="flex-1 flex flex-col items-center gap-1 sm:gap-2 min-w-0">
                                                <div
                                                    className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-sm sm:rounded-t-lg relative group cursor-pointer transition-all hover:from-purple-600 hover:to-purple-500"
                                                    style={{ height: `${height}%` }}
                                                >
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                        {formatCurrency(day.revenue)}
                                                        <br />
                                                        {day.transactions} orders
                                                    </div>
                                                </div>
                                                <div className="text-xs text-center truncate w-full" style={{ color: 'var(--muted)' }}>
                                                    {new Date(day.date).toLocaleDateString('en', {
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <BarChart3Icon className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
                                        <p className="text-sm" style={{ color: 'var(--muted)' }}>No sales data available</p>
                                        <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                                            Try making some sales to see trends
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Products and Low Stock */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Products */}
                    <div
                        className="rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Top Products by Revenue</h3>
                        </div>
                        <div className="p-4 sm:p-6">
                            <div className="space-y-4">
                                {analytics?.topProducts.slice(0, 5).map((product, index) => {
                                    const maxRevenue = Math.max(...(analytics?.topProducts.map(p => p.revenue) || [1]))
                                    const percentage = (product.revenue / maxRevenue) * 100

                                    return (
                                        <div key={index} className="flex items-center gap-4">
                                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{product.name}</p>
                                                    <p className="font-semibold" style={{ color: 'var(--text)' }}>{formatCurrency(product.revenue)}</p>
                                                </div>
                                                <div className="w-full rounded-full h-2" style={{ background: 'var(--muted-bg)' }}>
                                                    <div
                                                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {(!analytics?.topProducts || analytics.topProducts.length === 0) && (
                                    <div className="text-center py-8">
                                        <PackageIcon className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
                                        <p style={{ color: 'var(--muted)' }}>No sales data available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Low Stock Alerts */}
                    <div
                        className="rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                                Low Stock Alerts
                                {analytics?.lowStockAlerts.length ? (
                                    <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                                        {analytics.lowStockAlerts.length}
                                    </span>
                                ) : null}
                            </h3>
                        </div>
                        <div className="p-4 sm:p-6">
                            <div className="space-y-4">
                                {analytics?.lowStockAlerts.slice(0, 8).map((alert, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                                <PackageIcon className="h-4 w-4 text-red-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium" style={{ color: 'var(--text)' }}>{alert.name}</p>
                                                <p className="text-sm text-red-600">
                                                    {alert.current} / {alert.minimum} units
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="text-right">
                                                <div className="w-16 bg-red-200 rounded-full h-2">
                                                    <div
                                                        className="bg-red-500 h-2 rounded-full"
                                                        style={{
                                                            width: `${Math.min(100, (alert.current / alert.minimum) * 100)}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!analytics?.lowStockAlerts || analytics.lowStockAlerts.length === 0) && (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <PackageIcon className="h-6 w-6 text-green-600" />
                                        </div>
                                        <p style={{ color: 'var(--muted)' }}>All products are well stocked!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Monthly Comparison */}
                {analytics?.monthlyComparison && (
                    <div
                        className="rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Monthly Performance</h3>
                            <p className="text-sm" style={{ color: 'var(--muted)' }}>Current month vs previous month</p>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="font-medium text-gray-900">Revenue Comparison</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                                            <span className="text-sm font-medium text-gray-700">Current Month</span>
                                            <span className="font-semibold text-green-600">
                                                {formatCurrency(analytics.monthlyComparison.current.revenue)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <span className="text-sm font-medium text-gray-700">Previous Month</span>
                                            <span className="font-semibold text-gray-600">
                                                {formatCurrency(analytics.monthlyComparison.previous.revenue)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-center p-3 bg-blue-50 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                {getGrowthPercentage(
                                                    analytics.monthlyComparison.current.revenue,
                                                    analytics.monthlyComparison.previous.revenue
                                                ) >= 0 ? (
                                                    <TrendingUpIcon className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <TrendingDownIcon className="h-4 w-4 text-red-500" />
                                                )}
                                                <span className={`font-semibold ${getGrowthPercentage(
                                                    analytics.monthlyComparison.current.revenue,
                                                    analytics.monthlyComparison.previous.revenue
                                                ) >= 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {Math.abs(getGrowthPercentage(
                                                        analytics.monthlyComparison.current.revenue,
                                                        analytics.monthlyComparison.previous.revenue
                                                    ))}% {getGrowthPercentage(
                                                        analytics.monthlyComparison.current.revenue,
                                                        analytics.monthlyComparison.previous.revenue
                                                    ) >= 0 ? 'growth' : 'decline'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium text-gray-900">Transactions Comparison</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                                            <span className="text-sm font-medium text-gray-700">Current Month</span>
                                            <span className="font-semibold text-blue-600">
                                                {analytics.monthlyComparison.current.transactions} orders
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <span className="text-sm font-medium text-gray-700">Previous Month</span>
                                            <span className="font-semibold text-gray-600">
                                                {analytics.monthlyComparison.previous.transactions} orders
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-center p-3 bg-purple-50 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                {getGrowthPercentage(
                                                    analytics.monthlyComparison.current.transactions,
                                                    analytics.monthlyComparison.previous.transactions
                                                ) >= 0 ? (
                                                    <TrendingUpIcon className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <TrendingDownIcon className="h-4 w-4 text-red-500" />
                                                )}
                                                <span className={`font-semibold ${getGrowthPercentage(
                                                    analytics.monthlyComparison.current.transactions,
                                                    analytics.monthlyComparison.previous.transactions
                                                ) >= 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {Math.abs(getGrowthPercentage(
                                                        analytics.monthlyComparison.current.transactions,
                                                        analytics.monthlyComparison.previous.transactions
                                                    ))}% {getGrowthPercentage(
                                                        analytics.monthlyComparison.current.transactions,
                                                        analytics.monthlyComparison.previous.transactions
                                                    ) >= 0 ? 'growth' : 'decline'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div
                    className="rounded-2xl shadow-sm border backdrop-blur-xl"
                    style={{
                        background: 'var(--card-bg)',
                        borderColor: 'var(--card-border)',
                    }}
                >
                    <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => window.location.href = '/liff/products'}
                                className="flex items-center justify-center gap-3 p-4 rounded-xl font-medium transition-all shadow-md hover:scale-[1.02]"
                                style={{
                                    background: 'linear-gradient(to right, var(--accentA), var(--accentB))',
                                    color: 'white',
                                }}
                            >
                                <PackageIcon className="h-5 w-5" />
                                <span>Manage Inventory</span>
                            </button>

                            <button
                                onClick={() => window.location.href = '/liff/scanner'}
                                className="flex items-center justify-center gap-3 p-4 rounded-xl font-medium transition-all shadow-md hover:scale-[1.02]"
                                style={{
                                    background: 'linear-gradient(to right, var(--accentB), var(--accentC))',
                                    color: 'white',
                                }}
                            >
                                <BarChart3Icon className="h-5 w-5" />
                                <span>Quick Scan</span>
                            </button>

                            <button
                                onClick={() => {
                                    // Generate and download report
                                    const reportData = {
                                        business: business?.name,
                                        period: timeRange,
                                        generated: new Date().toISOString(),
                                        ...analytics
                                    }
                                    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                                        type: 'application/json'
                                    })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = `analytics-report-${timeRange}.json`
                                    a.click()
                                    URL.revokeObjectURL(url)
                                }}
                                className="flex items-center justify-center gap-3 p-4 rounded-xl font-medium transition-all shadow-md hover:scale-[1.02]"
                                style={{
                                    background: 'linear-gradient(to right, var(--accentC), var(--accentA))',
                                    color: 'white',
                                }}
                            >
                                <DownloadIcon className="h-5 w-5" />
                                <span>Export Report</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}