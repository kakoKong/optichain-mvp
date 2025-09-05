import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircleIcon, SearchIcon, PackageIcon, XIcon } from 'lucide-react'
import { PageLayout } from '@/components/ui/PageLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ProductCard } from '@/components/products/ProductCard'

import { useAuth } from '@/hooks/useAuth'
import { useBusiness } from '@/hooks/useBusiness'
import { Product } from '@/hooks/useProducts'
import { supabase } from '@/lib/supabase'

export const ProductsPage: React.FC = () => {
  const router = useRouter()
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
    (product.barcode && product.barcode.includes(searchTerm))
  )

  // Handler functions
  const handleViewProduct = (product: Product) => {
    router.push(`/liff/products/${product.id}`)
  }

  const handleEditProduct = (product: Product) => {
    router.push(`/liff/products/edit/${product.id}`)
  }

  const handleDeleteProduct = (product: Product) => {
    // TODO: Implement delete functionality
    console.log('Delete product:', product)
    alert('Delete functionality not implemented yet')
  }


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
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <PageHeader
          title="Product Management"
          subtitle={`${products.length} products in inventory`}
          onBack={() => window.history.back()}
          action={
            <Button 
              onClick={() => window.location.href = '/liff/products/add'}
              className="min-h-[48px] px-6 py-3 text-base"
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Add Product
            </Button>
          }
        />

        {/* Search */}
        <Card className="p-4 sm:p-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products by name or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 min-h-[48px] text-base"
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
        <Card>
          <div className="px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Products</h3>
          </div>
          <div className="p-4 sm:p-6">
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
                  <ProductCard
                    key={product.id}
                    product={product}
                    onView={handleViewProduct}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

    </PageLayout>
  )
}

export default ProductsPage