import React, { useState, useEffect } from 'react'
import { PlusCircleIcon, SearchIcon, PackageIcon } from 'lucide-react'
import { PageLayout } from '@/components/ui/PageLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export const ProductsPageSimple: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debug logging
  console.log('[ProductsPageSimple] Render - user:', user?.id, 'authLoading:', authLoading)

  useEffect(() => {
    if (authLoading || !user) return

    const loadProducts = async () => {
      console.log('[ProductsPageSimple] Loading products for user:', user)
      setLoading(true)
      setError(null)

      try {
        // Resolve app user ID
        let appUserId = null
        if (user.source === 'dev' && user.databaseUid) {
          appUserId = user.databaseUid
        } else if (user.source === 'line') {
          const { data: userData, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('line_user_id', user.id)
            .single()
          
          if (error || !userData) {
            throw new Error('Unable to resolve user ID')
          }
          appUserId = userData.id
        }

        if (!appUserId) {
          throw new Error('Unable to resolve user ID')
        }

        console.log('[ProductsPageSimple] Resolved app user ID:', appUserId)

        // Get business
        const { data: owned, error: ownedErr } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', appUserId)
          .limit(1)

        if (ownedErr) throw ownedErr

        let business = null
        if (owned && owned.length > 0) {
          business = owned[0]
        } else {
          // Check memberships
          const { data: membership, error: memErr } = await supabase
            .from('business_members')
            .select(`
              business:business_id (
                *
              )
            `)
            .eq('user_id', appUserId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (memErr) throw memErr
          if (membership?.business) {
            business = membership.business
          }
        }

        if (!business) {
          throw new Error('No business found')
        }

        console.log('[ProductsPageSimple] Found business:', business)

        // Get products
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

        console.log('[ProductsPageSimple] Loaded products:', productsData)
        setProducts(productsData || [])
      } catch (err) {
        console.error('[ProductsPageSimple] Error loading products:', err)
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <PageLayout>
        <LoadingSpinner size="lg" text="กำลังโหลดสินค้า..." />
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <Card className="p-8 text-center">
          <PackageIcon className="h-12 w-12 mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-gray-600">{error}</p>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Product Management"
        subtitle={`${products.length} products in inventory`}
        onBack={() => window.history.back()}
        action={
          <Button onClick={() => alert('Add product functionality not implemented in simple version')}>
            <PlusCircleIcon className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
            <PackageIcon className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Alert</p>
              <p className="text-2xl font-bold text-red-600">
                {products.filter(p => (p.inventory?.[0]?.current_stock || 0) <= 5).length}
              </p>
            </div>
            <PackageIcon className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">
                {products.reduce((sum, p) => {
                  const stock = p.inventory?.[0]?.current_stock || 0
                  return sum + (stock * p.selling_price)
                }, 0).toLocaleString()}
              </p>
            </div>
            <PackageIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Products List */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Products</h3>
        {products.length === 0 ? (
          <div className="text-center py-8">
            <PackageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No products found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{product.name}</h4>
                  <p className="text-sm text-gray-600">
                    Stock: {product.inventory?.[0]?.current_stock || 0} {product.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ฿{product.selling_price.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    ฿{((product.inventory?.[0]?.current_stock || 0) * product.selling_price).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageLayout>
  )
}

export default ProductsPageSimple
