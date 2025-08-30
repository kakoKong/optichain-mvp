'use client'
import { useEffect, useState } from 'react'
import liff from '@line/liff'
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
import { useHybridAuth } from '@/hooks/useHybridAuth'
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
    const { user, loading: authLoading } = useHybridAuth()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    useEffect(() => {
        supabase.auth.getSession().finally(() => {
            if (typeof window !== 'undefined' && window.location.hash) {
                window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
            }
        })
    }, [])
    useEffect(() => {
        if (authLoading) return
        if (!user) {
            router.replace(`/signin`)
        }
        if (user) {
            loadDashboardData(user)
        }

    }, [authLoading, user])

    async function resolveAppUserId(u: { id: string; source: 'supabase' | 'line' }) {
        // For Supabase OAuth: auth.uid() == public.users.id
        if (u.source === 'supabase') return u.id

        // For LINE: map liff profile id to your app user (public.users.id)
        // NOTE: this expects `public.users.line_user_id` to exist.
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('line_user_id', u.id)
            .single()

        if (error) {
            console.warn('Could not map LINE user to app user:', error)
            return null
        }
        return data?.id ?? null
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
    const loadDashboardData = async (u: { id: string; source: 'supabase' | 'line' }) => {
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
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                    <p className="mt-6 text-gray-600 font-medium">Loading your dashboard...</p>
                </div>
            </div>
        )
    }
    return (
        <div
            className="min-h-screen relative overflow-hidden"
            style={{
                backgroundImage:
                    'linear-gradient(to bottom right, var(--bg-from), var(--bg-via), var(--bg-to))',
            }}
        >
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
                    backgroundImage:
                        `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
                        {/* Title + avatar */}
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h1
                                        className="text-2xl sm:text-3xl font-bold tracking-tight truncate"
                                        style={{ color: 'var(--text)' }}
                                    >
                                        {stats?.businessName || 'Inventory Hub'}
                                    </h1>
                                </div>
                                <p className="mt-1 text-sm sm:text-base truncate" style={{ color: 'var(--muted)' }}>
                                    Welcome back, {user?.displayName}
                                </p>
                            </div>
                        </div>

                        {/* Meta + actions */}
                        <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <div className="ml-auto sm:ml-0">
                                <div
                                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs sm:text-sm"
                                    style={{ borderColor: 'var(--card-border)', color: 'var(--muted)' }}
                                >
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span
                                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
                                            style={{ background: 'var(--accentA)' }}
                                        />
                                        <span
                                            className="relative inline-flex rounded-full h-2.5 w-2.5"
                                            style={{ background: 'var(--accentA)' }}
                                        />
                                    </span>
                                    Last updated {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                </div>
                            </div>

                            {/* Team Settings Link */}
                            <Link
                                href="/settings/team"
                                className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                                style={{ border: '1px solid var(--card-border)', color: 'var(--text)', background: 'transparent' }}
                            >
                                <SettingsIcon className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Team</span>
                            </Link>

                            {/* Invite Button */}
                            <Link
                                href="/settings/team#invite"
                                className="hidden md:inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                                style={{ border: '1px solid var(--card-border)', color: 'var(--text)', background: 'transparent' }}
                                title="Invite teammates"
                            >
                                <UserPlusIcon className="h-4 w-4 mr-2" />
                                Invite
                            </Link>

                            {/* Refresh Button */}
                            <button
                                onClick={() => window.location.reload()}
                                className="hidden sm:inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                                style={{ border: '1px solid var(--card-border)', color: 'var(--text)', background: 'transparent' }}
                            >
                                Refresh
                            </button>

                            {/* Logout Button */}
                            <div className="shrink-0">
                                <LogoutButton />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                        className="p-5 rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Total Products</p>
                                <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2" style={{ color: 'var(--text)' }}>
                                    {stats?.totalProducts ?? 0}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-indigo-100/50 text-indigo-600">
                                <PackageIcon className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                    <div
                        className="p-5 rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Low Stock Alert</p>
                                <p className="text-2xl sm:text-3xl font-bold text-red-500 mt-1 sm:mt-2">{stats?.lowStockItems ?? 0}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-red-100/50 text-red-600">
                                <AlertTriangleIcon className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                    <div
                        className="p-5 rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Inventory Value</p>
                                <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">
                                    {formatCurrency(stats?.totalValue ?? 0)}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-green-100/50 text-green-600">
                                <DollarSignIcon className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                    <div
                        className="p-5 rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Est. Monthly Revenue</p>
                                <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1 sm:mt-2">
                                    {formatCurrency(stats?.monthlyRevenue ?? 0)}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-purple-100/50 text-purple-600">
                                <TrendingUpIcon className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Quick Actions (Desktop/Tablet) */}
                <div
                    className="hidden sm:block rounded-2xl shadow-sm border backdrop-blur-xl"
                    style={{
                        background: 'var(--card-bg)',
                        borderColor: 'var(--card-border)',
                    }}
                >
                    <div className="px-4 py-4 sm:px-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Quick Actions</h2>
                    </div>
                    <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => (window.location.href = '/liff/scanner')}
                                className="flex items-center gap-4 p-4 rounded-xl font-medium transition-all shadow-md transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                                style={{
                                    background: 'linear-gradient(to right, #6366f1, #4f46e5)',
                                    color: 'white',
                                }}
                            >
                                <ScanLineIcon className="h-6 w-6" />
                                <div className="text-left">
                                    <div className="font-semibold">Scan Barcode</div>
                                    <div className="text-indigo-100 text-sm">Quick inventory update</div>
                                </div>
                            </button>
                            <button
                                onClick={() => (window.location.href = '/liff/products')}
                                className="flex items-center gap-4 p-4 rounded-xl font-medium transition-all shadow-md transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                                style={{
                                    background: 'linear-gradient(to right, #6b7280, #4b5563)',
                                    color: 'white',
                                }}
                            >
                                <PackageIcon className="h-6 w-6" />
                                <div className="text-left">
                                    <div className="font-semibold">Manage Products</div>
                                    <div className="text-gray-200 text-sm">View & edit inventory</div>
                                </div>
                            </button>
                            <button
                                onClick={() => (window.location.href = '/liff/analytics')}
                                className="flex items-center gap-4 p-4 rounded-xl font-medium transition-all shadow-md transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                                style={{
                                    background: 'linear-gradient(to right, #22c55e, #16a34a)',
                                    color: 'white',
                                }}
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
                    <div
                        className="rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="px-4 py-4 sm:px-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Stock Movement (7 Days)</h3>
                        </div>
                        <div className="p-4 sm:p-6">
                            <div className="space-y-4">
                                {stats?.stockMovement.map((day, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <div className="w-16 text-sm font-medium shrink-0" style={{ color: 'var(--muted)' }}>
                                            {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1 text-xs sm:text-sm">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
                                                    <span style={{ color: 'var(--muted)' }}>In: {day.stockIn}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
                                                    <span style={{ color: 'var(--muted)' }}>Out: {day.stockOut}</span>
                                                </div>
                                            </div>
                                            <div className="w-full rounded-full h-2" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
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
                    <div
                        className="rounded-2xl shadow-sm border backdrop-blur-xl"
                        style={{
                            background: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                        }}
                    >
                        <div className="px-4 py-4 sm:px-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Top Products by Value</h3>
                        </div>
                        <div className="p-4 sm:p-6">
                            <div className="space-y-4">
                                {stats?.topProducts.map((product, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-indigo-500 to-purple-500 shrink-0">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{product.name}</p>
                                                <p className="text-sm" style={{ color: 'var(--muted)' }}>{product.stock} units</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold" style={{ color: 'var(--text)' }}>{formatCurrency(product.value)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Recent Activity */}
                <div
                    className="rounded-2xl shadow-sm border backdrop-blur-xl"
                    style={{
                        background: 'var(--card-bg)',
                        borderColor: 'var(--card-border)',
                    }}
                >
                    <div className="px-4 py-4 sm:px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Recent Activity</h3>
                        <button
                            onClick={() => (window.location.href = '/liff/transactions')}
                            className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                        >
                            View All
                        </button>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                        {stats?.recentTransactions.map((tx: any) => (
                            <div key={tx.id} className="px-4 py-4 sm:px-6 flex items-center justify-between transition-colors hover:bg-gray-50/20">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.transaction_type === 'stock_in'
                                        ? 'bg-green-100/50 text-green-600'
                                        : tx.transaction_type === 'stock_out'
                                            ? 'bg-red-100/50 text-red-600'
                                            : 'bg-indigo-100/50 text-indigo-600'
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
                                        <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{tx.products?.name}</p>
                                        <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>
                                            {tx.transaction_type.replace('_', ' ')} • {tx.quantity} units
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                                        {new Date(tx.created_at).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                                        {new Date(tx.created_at).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Quick Actions - Floating Bottom Bar (Mobile Only) */}
            <div
                className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:hidden transition-transform duration-300 ease-in-out"
                style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
                    backdropFilter: 'blur(10px)',
                }}
            >
                <div
                    className="grid grid-cols-3 gap-2 rounded-2xl border p-2 shadow-2xl backdrop-blur-sm"
                    style={{
                        background: 'var(--card-bg)',
                        borderColor: 'var(--card-border)',
                    }}
                >
                    <button
                        onClick={() => (window.location.href = '/liff/scanner')}
                        className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-center text-xs font-medium transition-colors"
                        style={{ color: 'var(--text)' }}
                    >
                        <ScanLineIcon className="h-5 w-5 text-indigo-600" />
                        <span className="mt-1">Scan</span>
                    </button>
                    <button
                        onClick={() => (window.location.href = '/liff/products')}
                        className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-center text-xs font-medium transition-colors"
                        style={{ color: 'var(--text)' }}
                    >
                        <PackageIcon className="h-5 w-5 text-gray-600" />
                        <span className="mt-1">Products</span>
                    </button>
                    <button
                        onClick={() => (window.location.href = '/liff/analytics')}
                        className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-center text-xs font-medium transition-colors"
                        style={{ color: 'var(--text)' }}
                    >
                        <BarChart3Icon className="h-5 w-5 text-green-600" />
                        <span className="mt-1">Analytics</span>
                    </button>
                </div>
            </div>
        </div>
    );
}