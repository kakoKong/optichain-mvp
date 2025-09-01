// frontend/app/liff/transactions/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    History as HistoryIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Settings as SettingsIcon,
    Search as SearchIcon,
    Package as PackageIcon,
    ArrowLeft as ArrowLeftIcon,
    Download as DownloadIcon,
    Eye as EyeIcon,
    User as UserIcon,
    Calendar as CalendarIcon,
    X as XIcon
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

declare global {
    interface Window {
        liff: any;
    }
}

interface Transaction {
    id: string
    transaction_type: 'stock_in' | 'stock_out' | 'adjustment'
    quantity: number
    reason: string
    created_at: string
    products: {
        name: string
        barcode?: string
        selling_price: number
        cost_price: number
    } | null
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<'all' | 'stock_in' | 'stock_out' | 'adjustment'>('all')
    const [dateRange, setDateRange] = useState('7d')
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
    const [business, setBusiness] = useState<any>(null)

    // Summary stats
    const [stats, setStats] = useState({
        totalTransactions: 0,
        stockIn: 0,
        stockOut: 0,
        adjustments: 0,
        totalValue: 0
    })



    useEffect(() => {
        if (authLoading || !user) return
        initializeAndLoad()
    }, [authLoading, user, dateRange])

    useEffect(() => {
        filterTransactions()
        calculateStats()
    }, [transactions, searchTerm, filterType])

    // Helper function to resolve app-level user ID
    const resolveAppUserId = async (u: { id: string; source: 'line' }) => {
        // For LINE: map liff profile id to your app user (public.users.id)
        // NOTE: this expects `public.users.line_user_id` to exist.
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

            // 2) Fetch business for this user (owner first, else member)
            const businessData = await fetchBusinessForUser(appUserId)
            if (!businessData) {
                setBusiness(null)
                setTransactions([])
                setLoading(false)
                return
            }

            const biz = Array.isArray(businessData) ? businessData[0] : businessData
            setBusiness(biz)

            const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365
            const startDate = new Date(); startDate.setDate(startDate.getDate() - daysBack)

            const { data: transactionData, error: txErr } = await supabase
                .from('inventory_transactions')
                .select(`
          id,
          transaction_type,
          quantity,
          reason,
          created_at,
          products (name, barcode, selling_price, cost_price)
        `)
                .eq('business_id', biz.id)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false })
            if (txErr) throw txErr

            setTransactions((transactionData as any[]) || [])
        } catch (e) {
            console.error('Error loading transactions:', e)
        } finally {
            setLoading(false)
        }
    }

    const filterTransactions = () => {
        let filtered = [...transactions]

        // Apply search filter
        if (searchTerm) {
            const q = searchTerm.toLowerCase()
            filtered = filtered.filter(tx =>
                (tx.products?.name || '').toLowerCase().includes(q) ||
                (tx.reason || '').toLowerCase().includes(q) ||
                (!!tx.products?.barcode && tx.products.barcode.includes(searchTerm))
            )
        }

        // Apply type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(tx => tx.transaction_type === filterType)
        }

        setFilteredTransactions(filtered)
    }

    const calculateStats = () => {
        const stockIn = transactions.filter(t => t.transaction_type === 'stock_in').length
        const stockOut = transactions.filter(t => t.transaction_type === 'stock_out').length
        const adjustments = transactions.filter(t => t.transaction_type === 'adjustment').length

        const totalValue = transactions
            .filter(t => t.transaction_type === 'stock_out')
            .reduce((sum, t) => sum + (t.quantity * (Number(t.products?.selling_price) || 0)), 0)

        setStats({
            totalTransactions: transactions.length,
            stockIn,
            stockOut,
            adjustments,
            totalValue
        })
    }

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'stock_in':
                return <TrendingUpIcon className="h-5 w-5 text-green-600" />
            case 'stock_out':
                return <TrendingDownIcon className="h-5 w-5 text-red-600" />
            case 'adjustment':
                return <SettingsIcon className="h-5 w-5 text-blue-600" />
            default:
                return <PackageIcon className="h-5 w-5 text-gray-600" />
        }
    }

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'stock_in':
                return 'bg-green-100 text-green-700 border-green-200'
            case 'stock_out':
                return 'bg-red-100 text-red-700 border-red-200'
            case 'adjustment':
                return 'bg-blue-100 text-blue-700 border-blue-200'
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    const formatTransactionType = (type: string) => {
        return type.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
    }

    const exportTransactions = () => {
        const csvData = [
            ['Date', 'Product', 'Type', 'Quantity', 'Reason', 'Value'],
            ...filteredTransactions.map(tx => [
                new Date(tx.created_at).toLocaleString(),
                tx.products?.name || '',
                formatTransactionType(tx.transaction_type),
                tx.quantity,
                tx.reason || '',
                tx.transaction_type === 'stock_out'
                    ? (tx.quantity * (Number(tx.products?.selling_price) || 0)).toFixed(2)
                    : ''
            ])
        ]

        const csvContent = csvData.map(row => row.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `transactions-${dateRange}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const closeModal = () => setSelectedTransaction(null)

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto"></div>
                    <p className="mt-6 text-gray-600 font-medium">Loading transactions...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-700 shadow-lg">
                <div className="px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => window.history.back()}
                                className="p-2 bg-white/20 rounded-xl text-white hover:bg-white/30 transition-colors"
                            >
                                <ArrowLeftIcon className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <HistoryIcon className="h-8 w-8" />
                                    Transaction History
                                </h1>
                                <p className="text-orange-100 mt-1">{stats.totalTransactions} transactions in {dateRange}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="bg-white/20 text-white border border-white/30 rounded-xl px-4 py-2 focus:outline-none focus:bg-white/30"
                            >
                                <option value="7d" className="text-gray-900">Last 7 days</option>
                                <option value="30d" className="text-gray-900">Last 30 days</option>
                                <option value="90d" className="text-gray-900">Last 90 days</option>
                                <option value="1y" className="text-gray-900">Last year</option>
                            </select>
                            <button
                                onClick={exportTransactions}
                                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
                            >
                                <DownloadIcon className="h-4 w-4" />
                                Export
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <HistoryIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Total</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-3 rounded-xl">
                                <TrendingUpIcon className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Stock In</p>
                                <p className="text-2xl font-bold text-green-600">{stats.stockIn}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 p-3 rounded-xl">
                                <TrendingDownIcon className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Stock Out</p>
                                <p className="text-2xl font-bold text-red-600">{stats.stockOut}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-3 rounded-xl">
                                <SettingsIcon className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Revenue</p>
                                <p className="text-2xl font-bold text-purple-600">฿{stats.totalValue.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                placeholder="Search products or reasons..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500"
                            >
                                <option value="all">All Types</option>
                                <option value="stock_in">Stock In</option>
                                <option value="stock_out">Stock Out</option>
                                <option value="adjustment">Adjustments</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Transactions List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Recent Transactions ({filteredTransactions.length})
                        </h3>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {filteredTransactions.map((transaction) => (
                            <div
                                key={transaction.id}
                                className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => setSelectedTransaction(transaction)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${getTransactionColor(transaction.transaction_type)}`}>
                                            {getTransactionIcon(transaction.transaction_type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-medium text-gray-900">{transaction.products?.name || 'Unknown product'}</h4>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTransactionColor(transaction.transaction_type)}`}>
                                                    {formatTransactionType(transaction.transaction_type)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">{transaction.reason || '-'}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <span>Quantity: {transaction.quantity}</span>
                                                {!!transaction.products?.barcode && (
                                                    <span>Barcode: {transaction.products.barcode}</span>
                                                )}
                                                {transaction.transaction_type === 'stock_out' && (
                                                    <span>Value: ฿{(transaction.quantity * Number(transaction.products?.selling_price || 0)).toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">
                                            {new Date(transaction.created_at).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(transaction.created_at).toLocaleTimeString()}
                                        </p>
                                        <button className="mt-2 text-orange-600 hover:text-orange-700">
                                            <EyeIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredTransactions.length === 0 && (
                        <div className="px-6 py-12 text-center">
                            <HistoryIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                            <p className="text-gray-500">
                                {searchTerm || filterType !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'No transactions recorded yet'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={(e) => {
                        // close when clicking backdrop only
                        if (e.target === e.currentTarget) closeModal()
                    }}
                >
                    <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTransactionColor(selectedTransaction.transaction_type)}`}>
                                        {formatTransactionType(selectedTransaction.transaction_type)}
                                    </span>
                                </div>
                                <h4 className="text-lg font-semibold text-gray-900">
                                    {selectedTransaction.products?.name || 'Unknown product'}
                                </h4>
                                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                    <CalendarIcon className="h-4 w-4" />
                                    {new Date(selectedTransaction.created_at).toLocaleString()}
                                </p>
                            </div>

                            <button
                                onClick={closeModal}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                                aria-label="Close"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getTransactionColor(selectedTransaction.transaction_type)}`}>
                                    {getTransactionIcon(selectedTransaction.transaction_type)}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <div>Quantity: <span className="font-medium text-gray-900">{selectedTransaction.quantity}</span></div>
                                    {selectedTransaction.products?.barcode && (
                                        <div>Barcode: <span className="font-medium text-gray-900">{selectedTransaction.products.barcode}</span></div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500">Selling Price</p>
                                    <p className="text-base font-semibold text-gray-900">
                                        ฿{Number(selectedTransaction.products?.selling_price || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500">Cost Price</p>
                                    <p className="text-base font-semibold text-gray-900">
                                        ฿{Number(selectedTransaction.products?.cost_price || 0).toLocaleString()}
                                    </p>
                                </div>
                                {selectedTransaction.transaction_type === 'stock_out' && (
                                    <>
                                        <div className="bg-orange-50 rounded-xl p-4">
                                            <p className="text-xs text-orange-700">Total Revenue</p>
                                            <p className="text-base font-semibold text-orange-700">
                                                ฿{(Number(selectedTransaction.products?.selling_price || 0) * selectedTransaction.quantity).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="bg-green-50 rounded-xl p-4">
                                            <p className="text-xs text-green-700">Est. Gross Profit</p>
                                            <p className="text-base font-semibold text-green-700">
                                                ฿{(
                                                    (Number(selectedTransaction.products?.selling_price || 0) - Number(selectedTransaction.products?.cost_price || 0)) *
                                                    selectedTransaction.quantity
                                                ).toLocaleString()}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div>
                                <p className="text-xs text-gray-500 mb-1">Reason</p>
                                <p className="text-sm text-gray-800">{selectedTransaction.reason || '-'}</p>
                            </div>

                            {business && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <UserIcon className="h-4 w-4" />
                                    <span>Business ID: {business.id}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
