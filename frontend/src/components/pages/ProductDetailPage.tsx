import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon, PackageIcon, EditIcon, TrashIcon, AlertTriangleIcon, TrendingUpIcon, BarcodeIcon, DollarSignIcon } from 'lucide-react'
import { PageLayout } from '@/components/ui/PageLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useBusiness } from '@/hooks/useBusiness'
import { Product } from '@/hooks/useProducts'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/utils/formatters'

export const ProductDetailPage: React.FC = () => {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  
  const { user, loading: authLoading } = useAuth()
  const { business, loading: businessLoading } = useBusiness()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [imageError, setImageError] = useState(false)

  // Load product data
  useEffect(() => {
    if (authLoading || businessLoading || !user || !business || !productId) return

    const loadProduct = async () => {
      console.log('[ProductDetailPage] Loading product:', productId)
      setLoading(true)
      setError(null)

      try {
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            inventory (
              current_stock,
              min_stock_level
            )
          `)
          .eq('id', productId)
          .eq('business_id', business.id)
          .single()

        if (productError) {
          throw productError
        }

        if (!productData) {
          throw new Error('Product not found')
        }

        console.log('[ProductDetailPage] Loaded product:', productData)
        setProduct(productData)
        setImageError(false) // Reset image error state for new product
      } catch (err) {
        console.error('[ProductDetailPage] Error loading product:', err)
        setError(err instanceof Error ? err.message : 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [user, business, authLoading, businessLoading, productId])

  const handleEditProduct = () => {
    if (product) {
      router.push(`/liff/products/edit/${product.id}`)
    }
  }

  const handleDeleteProduct = () => {
    if (product) {
      // TODO: Implement delete functionality
      console.log('Delete product:', product)
      alert('Delete functionality not implemented yet')
    }
  }

  if (authLoading || businessLoading || loading) {
    return (
      <PageLayout>
        <LoadingSpinner size="lg" text="Loading product..." />
      </PageLayout>
    )
  }

  if (error || !product) {
    return (
      <PageLayout>
        <Card className="p-8 text-center">
          <PackageIcon className="h-12 w-12 mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error || 'Product not found'}</p>
          <Button onClick={() => router.push('/liff/products')}>
            Back to Products
          </Button>
        </Card>
      </PageLayout>
    )
  }

  const currentStock = product.inventory?.[0]?.current_stock || 0
  const minStockLevel = product.inventory?.[0]?.min_stock_level || 0
  const totalValue = currentStock * product.selling_price
  const isLowStock = currentStock <= minStockLevel

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <PageHeader
          title={product.name}
          subtitle="Product Details"
          onBack={() => router.push('/liff/products')}
          action={
            <div className="flex gap-2">
              <Button
                onClick={handleEditProduct}
                variant="outline"
                className="flex items-center gap-2"
              >
                <EditIcon className="h-4 w-4" />
                Edit
              </Button>
              <Button
                onClick={handleDeleteProduct}
                variant="outline"
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </Button>
            </div>
          }
        />

        {/* Product Image */}
        <Card className="p-6">
          <div className="flex justify-center">
            <div className="w-64 h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
              {product.image_url && !imageError ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={() => {
                    console.error('Product image failed to load:', product.image_url)
                    setImageError(true)
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PackageIcon className="h-20 w-20 text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Product Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Product Name</label>
                <p className="text-gray-900 text-lg font-medium">{product.name}</p>
              </div>

              {product.barcode && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Barcode</label>
                  <div className="flex items-center gap-2">
                    <BarcodeIcon className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 font-mono">{product.barcode}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">Unit</label>
                <p className="text-gray-900">{product.unit}</p>
              </div>
            </div>
          </Card>

          {/* Pricing & Stock */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Stock</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Cost Price</label>
                <p className="text-gray-900 text-lg">{formatCurrency(product.cost_price)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Selling Price</label>
                <p className="text-gray-900 text-xl font-semibold">{formatCurrency(product.selling_price)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Current Stock</label>
                <div className="flex items-center gap-2">
                  {isLowStock ? (
                    <AlertTriangleIcon className="h-5 w-5 text-red-500" />
                  ) : (
                    <TrendingUpIcon className="h-5 w-5 text-green-500" />
                  )}
                  <p className={`text-lg font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                    {currentStock} {product.unit}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Minimum Stock Level</label>
                <p className="text-gray-900">{minStockLevel} {product.unit}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Total Value</label>
                <div className="flex items-center gap-2">
                  <DollarSignIcon className="h-5 w-5 text-green-500" />
                  <p className="text-green-600 text-xl font-semibold">{formatCurrency(totalValue)}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Stock Status Alert */}
        {isLowStock && (
          <Card className="p-6 bg-red-50 border-red-200">
            <div className="flex items-center gap-3">
              <AlertTriangleIcon className="h-6 w-6 text-red-500" />
              <div>
                <h4 className="text-lg font-medium text-red-800">Low Stock Alert</h4>
                <p className="text-red-700">
                  Current stock ({currentStock} {product.unit}) is below the minimum level ({minStockLevel} {product.unit}).
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <Card className="p-6">
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleEditProduct}
              className="flex items-center gap-2"
            >
              <EditIcon className="h-4 w-4" />
              Edit Product
            </Button>
            <Button
              onClick={() => router.push('/liff/products')}
              variant="outline"
            >
              Back to Products
            </Button>
          </div>
        </Card>
      </div>
    </PageLayout>
  )
}

export default ProductDetailPage
