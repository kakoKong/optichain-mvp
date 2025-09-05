'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
    TrendingUpIcon,
    TrendingDownIcon,
    PackageIcon,
    AlertTriangleIcon,
    DollarSignIcon,
    BarChart3Icon,
    ScanLineIcon,
    PlusCircleIcon,
    HistoryIcon,
    Settings as SettingsIcon, UserPlus as UserPlusIcon
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import ResponsiveNav from '@/components/ResponsiveNav'
interface DashboardStats {
    totalProducts: number
    lowStockItems: number
    totalValue: number
    monthlyRevenue: number
    recentTransactions: any[]
    stockMovement: any[]
    topProducts: any[]
    businessName: string | null;
}
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || process.env.NEXT_PUBLIC_LINE_LIFF_ID

export default function Dashboard() {
    const { user, loading: authLoading } = useAuth()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
    const router = useRouter()
    useEffect(() => {
        if (authLoading) return
        if (!user) {
            router.replace(`/signin`)
        }
        if (user) {
            loadDashboardData(user)
        }

    }, [authLoading, user])

    async function resolveAppUserId(u: { id: string; source: 'line' | 'line_browser' | 'dev'; databaseUid?: string }) {
        // For dev users: use the databaseUid directly
        if (u.source === 'dev' && u.databaseUid) {
            console.log('[resolveAppUserId] Dev user detected, using databaseUid:', u.databaseUid)
            return u.databaseUid
        }

        // For LINE (both LIFF and browser): map line_user_id to your app user (public.profiles.id)
        if (u.source === 'line' || u.source === 'line_browser') {
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

    async function fetchBusinessForUser(appUserId: string) {
        // Try owner first
        const { data: owned, error: ownedErr } = await supabase
            .from('businesses')
            .select(`
            id,
            name,
            products (
              id, name, cost_price, selling_price, barcode,
              inventory ( current_stock, min_stock_level )
            )
          `)
            .eq('owner_id', appUserId)
            .limit(1)

        if (ownedErr) throw ownedErr
        if (owned && owned.length > 0) {
            return { business: owned[0], products: owned[0].products ?? [] }
        }

        // Fallback: first business where the user is a member
        const { data: membership, error: memErr } = await supabase
            .from('business_members')
            .select(`
            business:business_id (
              id,
              name,
              products (
                id, name, cost_price, selling_price, barcode,
                inventory ( current_stock, min_stock_level )
              )
            )
          `)
            .eq('user_id', appUserId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        if (memErr) throw memErr
        if (!membership?.business) return { business: null, products: [] }

        return { business: membership.business, products: Array.isArray(membership.business) ? [] : (membership.business as { products: any[] })?.products ?? [] }
    }

    // --- replace your loadDashboardData with this ---
    const loadDashboardData = async (u: { id: string; source: 'line' | 'line_browser' | 'dev'; databaseUid?: string }) => {
        try {
            // 1) Resolve app-level user id used in your public schema
            const appUserId = await resolveAppUserId(u)
            if (!appUserId) {
                console.warn('Could not resolve app user id')
                setStats(null)
                setLoading(false)
                return
            }

            // 2) If user has no business (neither owner nor member) -> get-started
            const [{ data: owned }, { data: memberships }] = await Promise.all([
                supabase.from('businesses').select('id').eq('owner_id', appUserId),
                supabase.from('business_members').select('id').eq('user_id', appUserId),
            ])
            if ((owned?.length ?? 0) === 0 && (memberships?.length ?? 0) === 0) {
                router.replace('/get-started')
                return
            }

            // 3) Fetch a business for this user (owner first, else member)
            const { business, products } = await fetchBusinessForUser(appUserId)
            if (!business) {
                setStats({
                    totalProducts: 0,
                    lowStockItems: 0,
                    totalValue: 0,
                    monthlyRevenue: 0,
                    recentTransactions: [],
                    stockMovement: [],
                    topProducts: [],
                    businessName: null,
                })
                return
            }

            const businessName = !Array.isArray(business) && business.name ? business.name : 'Inventory Hub'

            // 4) Compute metrics
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

            const monthlyRevenue = products.reduce((sum: number, p: any) => {
                const stock = p.inventory?.[0]?.current_stock ?? 0
                const sellPrice = Number(p.selling_price ?? 0)
                return sum + stock * sellPrice * 0.1
            }, 0)

            // 5) Recent transactions for this business (last 7 days for stock movement)
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

            const { data: transactions, error: txErr } = await supabase
                .from('inventory_transactions')
                .select(`
          id,
          transaction_type,
          quantity,
          reason,
          created_at,
          products ( name, selling_price )
        `)
                .eq('business_id', !Array.isArray(business) ? business.id : null)
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('created_at', { ascending: false })

            if (txErr) console.error('Supabase (transactions):', txErr)
            
            // Debug: Log all transactions to see what we're getting
            console.log('[Dashboard] All transactions:', transactions)
            console.log('[Dashboard] Transaction types:', transactions?.map(tx => tx.transaction_type))

            const stockMovement = processStockMovement(transactions || [])
            const topProducts = getTopProducts(products)

            setStats({
                totalProducts,
                lowStockItems,
                totalValue,
                monthlyRevenue,
                recentTransactions: transactions?.slice(0, 5) || [],
                stockMovement,
                topProducts,
                businessName,
            })
        } catch (error) {
            console.error('Error loading dashboard data:', error)
            setStats(null)
        } finally {
            setLoading(false)
        }
    }

    if (authLoading || !user) {
        return (
            <div className="min-h-screen grid place-items-center">
                <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent" />
            </div>
        )
    }
    const processStockMovement = (transactions: any[]) => {
        console.log('[Dashboard] Processing stock movement with transactions:', transactions.length)

        // Create last 7 days array (most recent first)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - i)
            return {
                date: date.toISOString().split('T')[0],
                stockIn: 0,
                stockOut: 0
            }
        }).reverse() // Reverse to show oldest to newest

        console.log('[Dashboard] Last 7 days range:', {
            from: last7Days[0].date,
            to: last7Days[6].date
        })

        // Process each transaction
        transactions.forEach(tx => {
            const txDate = tx.created_at.split('T')[0]
            const dayData = last7Days.find(d => d.date === txDate)

            if (dayData) {
                if (tx.transaction_type === 'stock_in') {
                    dayData.stockIn += tx.quantity
                } else if (tx.transaction_type === 'stock_out') {
                    dayData.stockOut += tx.quantity
                }
            } else {
                console.log('[Dashboard] Transaction date outside range:', txDate, tx.transaction_type, tx.quantity)
            }
        })

        console.log('[Dashboard] Processed stock movement:', last7Days)
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
    const formatCurrency = (amount: number) => `฿${amount.toLocaleString()}`

    const groupTransactionsByProduct = (transactions: any[]) => {
        const grouped = transactions.reduce((acc, tx) => {
            const productId = tx.products?.name || 'Unknown Product'
            if (!acc[productId]) {
                acc[productId] = {
                    productName: productId,
                    transactions: [],
                    totalIn: 0,
                    totalOut: 0,
                    lastActivity: tx.created_at
                }
            }
            acc[productId].transactions.push(tx)
            if (tx.transaction_type === 'stock_in') {
                acc[productId].totalIn += tx.quantity
            } else if (tx.transaction_type === 'stock_out') {
                acc[productId].totalOut += tx.quantity
            }
            // Update last activity to most recent
            if (new Date(tx.created_at) > new Date(acc[productId].lastActivity)) {
                acc[productId].lastActivity = tx.created_at
            }
            return acc
        }, {})

        // Sort by last activity (most recent first)
        return Object.values(grouped).sort((a: any, b: any) =>
            new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        )
    }

    const toggleGroup = (productName: string) => {
        const newExpanded = new Set(expandedGroups)
        if (newExpanded.has(productName)) {
            newExpanded.delete(productName)
        } else {
            newExpanded.add(productName)
        }
        setExpandedGroups(newExpanded)
    }
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        )
    }
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 pb-20 sm:pb-6">
                {/* Header */}
                <ResponsiveNav
                    title={stats?.businessName || 'Inventory Hub'}
                    subtitle={`Welcome back, ${user?.displayName}`}
                    action={
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="hidden sm:inline">Last updated {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                <span className="sm:hidden">Updated {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                            </div>

                            <div className="flex items-center gap-1">
                                <Link
                                    href="/team"
                                    className="inline-flex items-center px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <SettingsIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Team</span>
                                </Link>

                                <button
                                    onClick={() => window.location.reload()}
                                    className="inline-flex items-center px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <span className="hidden sm:inline">Refresh</span>
                                    <span className="sm:hidden">↻</span>
                                </button>
                            </div>
                        </div>
                    }
                />
                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                        className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push('/liff/products')}
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Products</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {stats?.totalProducts ?? 0}
                            </p>
                        </div>
                    </div>
                    <div
                        className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push('/liff/analytics')}
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-600">Low Stock Alert</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{stats?.lowStockItems ?? 0}</p>
                        </div>
                    </div>
                    <div
                        className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push('/liff/products')}
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {formatCurrency(stats?.totalValue ?? 0)}
                            </p>
                        </div>
                    </div>
                    <div
                        className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push('/liff/analytics')}
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-600">Est. Monthly Revenue</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {formatCurrency(stats?.monthlyRevenue ?? 0)}
                            </p>
                        </div>
                    </div>
                </div>
                {/* Quick Actions */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => (window.location.href = '/liff/scanner')}
                                className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left"
                            >
                                <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                                    <ScanLineIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900">Scan Barcode</div>
                                    <div className="text-sm text-gray-600">Quick inventory update</div>
                                </div>
                            </button>
                            <button
                                onClick={() => (window.location.href = '/liff/products')}
                                className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left"
                            >
                                <div className="p-3 rounded-lg bg-gray-50 text-gray-600">
                                    <PackageIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900">Manage Products</div>
                                    <div className="text-sm text-gray-600">View & edit inventory</div>
                                </div>
                            </button>
                            <button
                                onClick={() => (window.location.href = '/liff/analytics')}
                                className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left"
                            >
                                <div className="p-3 rounded-lg bg-green-50 text-green-600">
                                    <BarChart3Icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900">Analytics</div>
                                    <div className="text-sm text-gray-600">Sales & trends</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
                {/* Charts & Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Stock Movement Chart */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Stock Movement (7 Days)</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {stats?.stockMovement && stats.stockMovement.length > 0 ? (
                                    stats.stockMovement.map((day, index) => (
                                        <div key={index} className="flex items-center gap-4">
                                            <div className="w-16 text-sm font-medium text-gray-600 shrink-0">
                                                {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-2 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                        <span className="text-gray-600">In: {day.stockIn}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                                        <span className="text-gray-600">Out: {day.stockOut}</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 relative">
                                                    <div
                                                        className="bg-green-500 h-2 rounded-full absolute left-0"
                                                        style={{ width: `${Math.min(100, (day.stockIn / Math.max(day.stockIn + day.stockOut, 1)) * 100)}%` }}
                                                    ></div>
                                                    <div
                                                        className="bg-red-500 h-2 rounded-full absolute left-0"
                                                        style={{
                                                            width: `${Math.min(100, (day.stockOut / Math.max(day.stockIn + day.stockOut, 1)) * 100)}%`,
                                                            transform: `translateX(${(day.stockIn / Math.max(day.stockIn + day.stockOut, 1)) * 100}%)`
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <div className="text-4xl mb-2">📊</div>
                                        <p>No stock movement data for the last 7 days</p>
                                        <p className="text-sm mt-1">Start scanning products to see movement trends</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Top Products */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Top Products by Value</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {stats?.topProducts.map((product, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gray-600 shrink-0">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 truncate">{product.name}</p>
                                                <p className="text-sm text-gray-600">{product.stock} units</p>
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
                {/* Recent Activity - Grouped by Product */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                        <button
                            onClick={() => (window.location.href = '/liff/transactions')}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                            View All
                        </button>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                            groupTransactionsByProduct(stats.recentTransactions).map((group: any) => (
                                <div key={group.productName} className="px-6 py-4">
                                    {/* Group Header */}
                                    <div
                                        className="flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => toggleGroup(group.productName)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                                                <PackageIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 truncate">{group.productName}</p>
                                                <p className="text-sm text-gray-600">
                                                    {group.transactions.length} transaction{group.transactions.length !== 1 ? 's' : ''} •
                                                    {group.totalIn > 0 && (
                                                        <span className="text-green-600 ml-1">+{group.totalIn} in</span>
                                                    )}
                                                    {group.totalIn > 0 && group.totalOut > 0 && <span className="mx-1">•</span>}
                                                    {group.totalOut > 0 && (
                                                        <span className="text-red-600">-{group.totalOut} out</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-gray-600">
                                                {new Date(group.lastActivity).toLocaleDateString()}
                                            </p>
                                            <div className={`transform transition-transform ${expandedGroups.has(group.productName) ? 'rotate-180' : ''}`}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Individual Transactions */}
                                    {expandedGroups.has(group.productName) && (
                                        <div className="mt-3 ml-14 space-y-2 border-l-2 border-gray-100 pl-4">
                                            {group.transactions.map((tx: any) => (
                                                <div key={tx.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-3 -ml-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${tx.transaction_type === 'stock_in'
                                                            ? 'bg-green-100 text-green-600'
                                                            : tx.transaction_type === 'stock_out'
                                                                ? 'bg-red-100 text-red-600'
                                                                : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {tx.transaction_type === 'stock_in' ? (
                                                                <TrendingUpIcon className="h-3 w-3" />
                                                            ) : tx.transaction_type === 'stock_out' ? (
                                                                <TrendingDownIcon className="h-3 w-3" />
                                                            ) : (
                                                                <HistoryIcon className="h-3 w-3" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {tx.transaction_type.replace('_', ' ')} • {tx.quantity} units
                                                            </p>
                                                            {tx.reason && (
                                                                <p className="text-xs text-gray-500 truncate">{tx.reason}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(tx.created_at).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <div className="text-4xl mb-2">📋</div>
                                <p>No recent activity</p>
                                <p className="text-sm mt-1">Start scanning products to see activity</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Quick Actions - Floating Bottom Bar (Mobile Only) - COMMENTED OUT */}
            {/* 
            <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:hidden">
                <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-2">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => (window.location.href = '/liff/products')}
                            className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg text-center text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <PackageIcon className="h-5 w-5 text-gray-600" />
                            <span>Products</span>
                        </button>
                        <button
                            onClick={() => (window.location.href = '/liff/scanner')}
                            className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg text-center text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <ScanLineIcon className="h-5 w-5 text-blue-600" />
                            <span>Scan</span>
                        </button>

                        <button
                            onClick={() => (window.location.href = '/liff/analytics')}
                            className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg text-center text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <BarChart3Icon className="h-5 w-5 text-green-600" />
                            <span>Analytics</span>
                        </button>
                    </div>
                </div>
            </div>
            */}
        </div>
    );
}