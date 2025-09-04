import React, { useState, useEffect } from 'react'
import { PlusCircleIcon, SearchIcon, PackageIcon, XIcon } from 'lucide-react'
import { PageLayout } from '@/components/ui/PageLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

import { useAuth } from '@/hooks/useAuth'
import { useBusiness } from '@/hooks/useBusiness'
import { supabase } from '@/lib/supabase'

interface Product {
  id: string
  name: string
  barcode: string
  cost_price: number
  selling_price: number
  unit: string
  image_url?: string
  inventory?: Array<{
    id: string
    current_stock: number
    min_stock_level: number
  }>
}

export const ProductsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const { business, loading: businessLoading } = useBusiness()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')






  // Load products
  useEffect(() => {
    if (authLoading || businessLoading || !user || !business) return

    const loadProducts = async () => {
      console.log('[ProductsPage] Loading products for business:', business)
      setLoading(true)
      setError(null)

      try {
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

        console.log('[ProductsPage] Loaded products:', productsData)
        setProducts(productsData || [])
      } catch (err) {
        console.error('[ProductsPage] Error loading products:', err)
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [user, business, authLoading, businessLoading])



  // Filter products
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm)
  )

  if (authLoading || businessLoading || loading) {
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
          <Button onClick={() => window.location.href = '/liff/products/add'}>
            <PlusCircleIcon className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        }
      />

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products by name or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

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
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8">
            <PackageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              {searchTerm ? 'No products found matching your search' : 'No products found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Product Image */}
                <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${product.image_url ? 'hidden' : ''}`}>
                    <PackageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 text-lg line-clamp-2">{product.name}</h4>
                  
                  <p className="text-xs text-gray-500">
                    Barcode: {product.barcode}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Stock: {product.inventory?.[0]?.current_stock || 0} {product.unit}
                    </span>
                    <span className="font-medium text-gray-900">
                      ฿{product.selling_price.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Value:</span>
                      <span className="font-semibold text-green-600">
                        ฿{((product.inventory?.[0]?.current_stock || 0) * product.selling_price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>


    </PageLayout>
  )
}

export default ProductsPage