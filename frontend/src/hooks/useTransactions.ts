import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useBusiness } from './useBusiness'

export interface Transaction {
  id: string
  transaction_type: 'stock_in' | 'stock_out' | 'adjustment'
  quantity: number
  notes?: string
  created_at: string
  products: {
    id: string
    name: string
    barcode?: string
    selling_price: number
    cost_price: number
  } | null
}

export const useTransactions = () => {
  const { user, resolveAppUserId } = useAuth()
  const { business } = useBusiness()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTransactions = useCallback(async (dateRange: string = '7d') => {
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
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

      const { data: transactionsData, error: transactionsError } = await supabase
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
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (transactionsError) {
        throw transactionsError
      }

      setTransactions(transactionsData || [])
    } catch (err) {
      console.error('Error loading transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [user, business, resolveAppUserId])

  const addTransaction = async (transactionData: Partial<Transaction>) => {
    if (!business) throw new Error('No business found')

    const { data, error } = await supabase
      .from('inventory_transactions')
      .insert([{
        ...transactionData,
        business_id: business.id
      }])
      .select()
      .single()

    if (error) throw error

    // Reload transactions
    await loadTransactions()
    return data
  }

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  return {
    transactions,
    loading,
    error,
    addTransaction,
    refetch: loadTransactions
  }
}

export default useTransactions
