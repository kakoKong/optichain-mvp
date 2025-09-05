import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useBusiness } from './useBusiness'

export interface Product {
  id: string
  name: string
  barcode?: string
  cost_price: number
  selling_price: number
  unit: string
  image_url?: string
  inventory?: {
    current_stock: number
    min_stock_level?: number
  }[]
}

export const useProducts = () => {
  const { user, resolveAppUserId } = useAuth()
  const { business } = useBusiness()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    if (!user || !business) return

    console.log('[useProducts] Loading products for business:', business)
    setLoading(true)
    setError(null)

    try {
      const appUserId = await resolveAppUserId(user)
      if (!appUserId) {
        throw new Error('Unable to resolve user ID')
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          inventory (
            current_stock,
            min_stock_level
          )
        `)
        .eq('business_id', business.id)

      if (productsError) {
        throw productsError
      }

      console.log('[useProducts] Loaded products:', productsData)
      setProducts(productsData || [])
    } catch (err) {
      console.error('Error loading products:', err)
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [user, business, resolveAppUserId])

  const addProduct = async (productData: Partial<Product>) => {
    if (!business) throw new Error('No business found')

    const { data, error } = await supabase
      .from('products')
      .insert([{
        ...productData,
        business_id: business.id
      }])
      .select()
      .single()

    if (error) throw error

    // Reload products
    await loadProducts()
    return data
  }

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Reload products
    await loadProducts()
    return data
  }

  const deleteProduct = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Reload products
    await loadProducts()
  }

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    refetch: loadProducts
  }
}

export default useProducts
