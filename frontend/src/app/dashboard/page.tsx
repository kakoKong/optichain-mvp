// frontend/app/liff/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalProducts: number
  lowStockItems: number
  totalValue: number
  recentTransactions: any[]
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    initializeLiff()
  }, [])

  const initializeLiff = async () => {
    if (typeof window !== 'undefined' && window.liff) {
      try {
        await window.liff.init({ liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID })

        if (window.liff.isLoggedIn()) {
          const profile = await window.liff.getProfile()
          setUser(profile)
          await loadDashboardData(profile.userId)
        } else {
          window.liff.login()
        }
      } catch (error) {
        console.error('LIFF initialization failed:', error)
      }
    }
  }

  const loadDashboardData = async (lineUserId: string) => {
    try {
      // Get user's businesses
      const { data: userData } = await supabase
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
              inventory (
                current_stock,
                min_stock_level
              )
            )
          )
        `)
        .eq('line_user_id', lineUserId)
        .single()

      if (userData?.businesses?.[0]) {
        const business = userData.businesses[0]
        const products = business.products || []

        // Calculate stats
        const totalProducts = products.length
        const lowStockItems = products.filter((p: any) =>
          p.inventory?.[0]?.current_stock <= p.inventory?.[0]?.min_stock_level
        ).length

        const totalValue = products.reduce((sum: number, p: any) => {
          const stock = p.inventory?.[0]?.current_stock || 0
          const cost = p.cost_price || 0
          return sum + (stock * cost)
        }, 0)

        // Get recent transactions
        const { data: transactions } = await supabase
          .from('inventory_transactions')
          .select(`
            *,
            products (name)
          `)
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(5)

        setStats({
          totalProducts,
          lowStockItems,
          totalValue,
          recentTransactions: transactions || []
        })
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">📦 Inventory Dashboard</h1>
        <p className="text-blue-100">Welcome, {user?.displayName}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-600">Total Products</h3>
            <p className="text-2xl font-bold text-blue-600">{stats?.totalProducts || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-600">Low Stock</h3>
            <p className="text-2xl font-bold text-red-600">{stats?.lowStockItems || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow col-span-2">
            <h3 className="text-sm text-gray-600">Inventory Value</h3>
            <p className="text-2xl font-bold text-green-600">
              ฿{stats?.totalValue.toLocaleString() || 0}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Quick Actions</h2>
          </div>
          <div className="p-4 space-y-3">
            <button
              onClick={() => window.location.href = '/liff/scanner'}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium"
            >
              📱 Scan Barcode
            </button>
            <button
              onClick={() => window.location.href = '/liff/products'}
              className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg font-medium"
            >
              📦 View Products
            </button>
            <button
              onClick={() => window.location.href = '/liff/transactions'}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-medium"
            >
              📊 View Transactions
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Recent Activity</h2>
          </div>
          <div className="divide-y">
            {stats?.recentTransactions.map((transaction: any) => (
              <div key={transaction.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{transaction.products?.name}</p>
                  <p className="text-sm text-gray-600">
                    {transaction.transaction_type.replace('_', ' ')} • {transaction.quantity} units
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.created_at).toLocaleDateString()}
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
