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

            // 5) Recent transactions for this business
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
                .order('created_at', { ascending: false })
                .limit(20)

            if (txErr) console.error('Supabase (transactions):', txErr)

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
    const formatCurrency = (amount: number) => `฿${amount.toLocaleString()}`
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
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-gray-900 truncate">
                                {stats?.businessName || 'Inventory Hub'}
                            </h1>
                            <p className="mt-1 text-gray-600 truncate">
                                Welcome back, {user?.displayName}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Last updated {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </div>

                            <div className="flex items-center gap-2">
                                <Link
                                    href="/settings/team"
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <SettingsIcon className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Team</span>
                                </Link>

                                <button
                                    onClick={() => window.location.reload()}
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Refresh
                                </button>

                                <LogoutButton>Sign Out</LogoutButton>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                        className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push('/liff/products')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Products</p>
                                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                                    {stats?.totalProducts ?? 0}
                                </p>
                            </div>
                            <div className="p-2 sm:p-3 rounded-lg bg-gray-100 text-gray-600">
                                <PackageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                        </div>
                    </div>
                    <div
                        className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push('/liff/analytics')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Low Stock Alert</p>
                                <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{stats?.lowStockItems ?? 0}</p>
                            </div>
                            <div className="p-2 sm:p-3 rounded-lg bg-red-50 text-red-600">
                                <AlertTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                        </div>
                    </div>
                    <div
                        className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push('/liff/products')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Inventory Value</p>
                                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                                    {formatCurrency(stats?.totalValue ?? 0)}
                                </p>
                            </div>
                            <div className="p-2 sm:p-3 rounded-lg bg-gray-100 text-gray-600">
                                <DollarSignIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                        </div>
                    </div>
                    <div
                        className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push('/liff/analytics')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-600">Est. Monthly Revenue</p>
                                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                                    {formatCurrency(stats?.monthlyRevenue ?? 0)}
                                </p>
                            </div>
                            <div className="p-2 sm:p-3 rounded-lg bg-gray-100 text-gray-600">
                                <TrendingUpIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
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
                                {stats?.stockMovement.map((day, index) => (
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
                {/* Recent Activity */}
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
                        {stats?.recentTransactions.map((tx: any) => (
                            <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tx.transaction_type === 'stock_in'
                                            ? 'bg-green-50 text-green-600'
                                            : tx.transaction_type === 'stock_out'
                                                ? 'bg-red-50 text-red-600'
                                                : 'bg-gray-50 text-gray-600'
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
                                        <p className="font-medium text-gray-900 truncate">{tx.products?.name}</p>
                                        <p className="text-sm text-gray-600 truncate">
                                            {tx.transaction_type.replace('_', ' ')} • {tx.quantity} units
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm text-gray-600">
                                        {new Date(tx.created_at).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(tx.created_at).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Quick Actions - Floating Bottom Bar (Mobile Only) */}
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
        </div>
    );
}