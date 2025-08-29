// frontend/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import liff from '@line/liff'
import { supabase } from '@/lib/supabase'
import {
    TrendingUpIcon,
    TrendingDownIcon,
    PackageIcon,
    AlertTriangleIcon,
    DollarSignIcon,
    BarChart3Icon,
    ScanLineIcon,
    PlusCircleIcon,
    HistoryIcon
} from 'lucide-react'

interface DashboardStats {
    totalProducts: number
    lowStockItems: number
    totalValue: number
    monthlyRevenue: number
    recentTransactions: any[]
    stockMovement: any[]
    topProducts: any[]
}

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || process.env.NEXT_PUBLIC_LINE_LIFF_ID

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [timeRange, setTimeRange] = useState('7d')

    useEffect(() => {
        const boot = async () => {
            try {
                if (!LIFF_ID) {
                    throw new Error('Missing NEXT_PUBLIC_LIFF_ID')
                }

                await liff.init({ liffId: LIFF_ID })

                // if (!liff.isLoggedIn()) {
                //   liff.login()
                // //   window.location.replace(location.href + "/");
                //   return // wait for redirect
                // }
                const profile = await liff.getProfile()
                setUser(profile)
                await loadDashboardData(profile.userId)
            } catch (err) {
                console.error('LIFF init failed:', err)
                setLoading(false)
            }
        }

        boot()
    }, [])

    const loadDashboardData = async (lineUserId: string) => {
        try {
            // Get user's businesses + products + inventory
            const { data: userData, error } = await supabase
                .from('users')
                .select(`
          *,
          businesses (
            id,
            name,
            products (
              id,
              name,
              cost_price,
              selling_price,
              barcode,
              inventory (
                current_stock,
                min_stock_level
              )
            )
          )
        `)
                .eq('line_user_id', lineUserId)
                .single()

            if (error) {
                console.error('Supabase error (users query):', error)
            }

            if (userData?.businesses?.[0]) {
                const business = userData.businesses[0]
                const products = business.products || []

                const totalProducts = products.length
                const lowStockItems = products.filter((p: any) => {
                    const cur = p.inventory?.[0]?.current_stock
                    const min = p.inventory?.[0]?.min_stock_level
                    return typeof cur === 'number' && typeof min === 'number' && cur <= min
                }).length

                const totalValue = products.reduce((sum: number, p: any) => {
                    const stock = p.inventory?.[0]?.current_stock ?? 0
                    const cost = Number(p.cost_price ?? 0)
                    return sum + stock * cost
                }, 0)

                // Calculate monthly revenue estimate
                const monthlyRevenue = products.reduce((sum: number, p: any) => {
                    const stock = p.inventory?.[0]?.current_stock ?? 0
                    const sellPrice = Number(p.selling_price ?? 0)
                    return sum + stock * sellPrice * 0.1 // Assume 10% monthly turnover
                }, 0)

                // Get transactions for analytics
                const { data: transactions, error: txErr } = await supabase
                    .from('inventory_transactions')
                    .select(`
            *,
            products ( name, selling_price )
          `)
                    .eq('business_id', business.id)
                    .order('created_at', { ascending: false })
                    .limit(20)

                if (txErr) {
                    console.error('Supabase error (transactions):', txErr)
                }

                // Process stock movement data
                const stockMovement = processStockMovement(transactions || [])
                const topProducts = getTopProducts(products)

                setStats({
                    totalProducts,
                    lowStockItems,
                    totalValue,
                    monthlyRevenue,
                    recentTransactions: transactions?.slice(0, 5) || [],
                    stockMovement,
                    topProducts
                })
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const processStockMovement = (transactions: any[]) => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - i)
            return {
                date: date.toISOString().split('T')[0],
                stockIn: 0,
                stockOut: 0
            }
        }).reverse()

        transactions.forEach(tx => {
            const txDate = tx.created_at.split('T')[0]
            const dayData = last7Days.find(d => d.date === txDate)
            if (dayData) {
                if (tx.transaction_type === 'stock_in') {
                    dayData.stockIn += tx.quantity
                } else if (tx.transaction_type === 'stock_out') {
                    dayData.stockOut += tx.quantity
                }
            }
        })

        return last7Days
    }

    const getTopProducts = (products: any[]) => {
        return products
            .map(p => ({
                name: p.name,
                stock: p.inventory?.[0]?.current_stock || 0,
                value: (p.inventory?.[0]?.current_stock || 0) * (Number(p.selling_price) || 0)
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                    <p className="mt-6 text-gray-600 font-medium">Loading your dashboard...</p>
                </div>
            </div>
        )
    }

    const formatCurrency = (amount: number) => `฿${amount.toLocaleString()}`

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
                <div className="px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                <PackageIcon className="h-8 w-8" />
                                Inventory Hub
                            </h1>
                            <p className="text-blue-100 mt-1">Welcome back, {user?.displayName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-blue-100 text-sm">Last updated</p>
                            <p className="text-white font-medium">{new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 space-y-8">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Products</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalProducts ?? 0}</p>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <PackageIcon className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Low Stock Alert</p>
                                <p className="text-3xl font-bold text-red-500 mt-2">{stats?.lowStockItems ?? 0}</p>
                            </div>
                            <div className="bg-red-100 p-3 rounded-xl">
                                <AlertTriangleIcon className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                                <p className="text-3xl font-bold text-green-600 mt-2">
                                    {formatCurrency(stats?.totalValue ?? 0)}
                                </p>
                            </div>
                            <div className="bg-green-100 p-3 rounded-xl">
                                <DollarSignIcon className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Est. Monthly Revenue</p>
                                <p className="text-3xl font-bold text-purple-600 mt-2">
                                    {formatCurrency(stats?.monthlyRevenue ?? 0)}
                                </p>
                            </div>
                            <div className="bg-purple-100 p-3 rounded-xl">
                                <TrendingUpIcon className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => (window.location.href = '/liff/scanner')}
                                className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
                            >
                                <ScanLineIcon className="h-6 w-6" />
                                <div className="text-left">
                                    <div className="font-semibold">Scan Barcode</div>
                                    <div className="text-blue-100 text-sm">Quick inventory update</div>
                                </div>
                            </button>

                            <button
                                onClick={() => (window.location.href = '/liff/products')}
                                className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-medium hover:from-gray-600 hover:to-gray-700 transition-all shadow-md"
                            >
                                <PackageIcon className="h-6 w-6" />
                                <div className="text-left">
                                    <div className="font-semibold">Manage Products</div>
                                    <div className="text-gray-200 text-sm">View & edit inventory</div>
                                </div>
                            </button>

                            <button
                                onClick={() => (window.location.href = '/liff/analytics')}
                                className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-md"
                            >
                                <BarChart3Icon className="h-6 w-6" />
                                <div className="text-left">
                                    <div className="font-semibold">Analytics</div>
                                    <div className="text-green-200 text-sm">Sales & trends</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Charts & Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Stock Movement Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">Stock Movement (7 Days)</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {stats?.stockMovement.map((day, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <div className="w-16 text-sm text-gray-600 font-medium">
                                            {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                    <span className="text-sm text-gray-600">In: {day.stockIn}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                                    <span className="text-sm text-gray-600">Out: {day.stockOut}</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full"
                                                    style={{ width: `${Math.min(100, (day.stockIn / Math.max(day.stockIn + day.stockOut, 1)) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Top Products */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">Top Products by Value</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {stats?.topProducts.map((product, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{product.name}</p>
                                                <p className="text-sm text-gray-500">{product.stock} units</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-gray-900">{formatCurrency(product.value)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                        <button
                            onClick={() => (window.location.href = '/liff/transactions')}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                            View All
                        </button>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats?.recentTransactions.map((tx: any) => (
                            <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.transaction_type === 'stock_in'
                                            ? 'bg-green-100 text-green-600'
                                            : tx.transaction_type === 'stock_out'
                                                ? 'bg-red-100 text-red-600'
                                                : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        {tx.transaction_type === 'stock_in' ? (
                                            <TrendingUpIcon className="h-5 w-5" />
                                        ) : tx.transaction_type === 'stock_out' ? (
                                            <TrendingDownIcon className="h-5 w-5" />
                                        ) : (
                                            <HistoryIcon className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{tx.products?.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {tx.transaction_type.replace('_', ' ')} • {tx.quantity} units
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">
                                        {new Date(tx.created_at).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(tx.created_at).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}