import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon, PackageIcon, SaveIcon } from 'lucide-react'
import { PageLayout } from '@/components/ui/PageLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useAuth } from '@/hooks/useAuth'
import { useBusiness } from '@/hooks/useBusiness'
import { useProducts, Product } from '@/hooks/useProducts'
import { supabase } from '@/lib/supabase'

export const EditProductPage: React.FC = () => {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  
  const { user, loading: authLoading } = useAuth()
  const { business, loading: businessLoading } = useBusiness()
  const { updateProduct } = useProducts()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [productLoading, setProductLoading] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    cost_price: '',
    selling_price: '',
    unit: 'pcs',
    image_url: ''
  })
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Load product data
  useEffect(() => {
    if (authLoading || businessLoading || !user || !business || !productId) return

    const loadProduct = async () => {
      console.log('[EditProductPage] Loading product:', productId)
      setProductLoading(true)
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

        console.log('[EditProductPage] Loaded product:', productData)
        setProduct(productData)
        
        // Prefill form
        setFormData({
          name: productData.name,
          barcode: productData.barcode || '',
          cost_price: productData.cost_price.toString(),
          selling_price: productData.selling_price.toString(),
          unit: productData.unit,
          image_url: productData.image_url || ''
        })
      } catch (err) {
        console.error('[EditProductPage] Error loading product:', err)
        setError(err instanceof Error ? err.message : 'Failed to load product')
      } finally {
        setProductLoading(false)
      }
    }

    loadProduct()
  }, [user, business, authLoading, businessLoading, productId])

  // Update product function
  const handleUpdateProduct = async () => {
    if (!business || !user || !product) return

    // Validate form
    if (!formData.name.trim()) {
      setError('Please fill in product name')
      return
    }

    const costPrice = parseFloat(formData.cost_price) || 0
    const sellingPrice = parseFloat(formData.selling_price) || 0

    if (sellingPrice <= 0) {
      setError('Selling price must be greater than 0')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('[EditProductPage] Updating product with data:', {
        id: product.id,
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        cost_price: costPrice,
        selling_price: sellingPrice,
        unit: formData.unit,
        image_url: formData.image_url || null
      })

      await updateProduct(product.id, {
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        cost_price: costPrice,
        selling_price: sellingPrice,
        unit: formData.unit,
        image_url: formData.image_url || null
      })

      setSuccess(true)
      setTimeout(() => {
        router.push('/liff/products')
      }, 2000)

    } catch (err) {
      console.error('[EditProductPage] Error updating product:', err)
      setError(err instanceof Error ? err.message : 'Failed to update product')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (url: string | null) => {
    console.log('[EditProductPage] Image URL changed:', url)
    setFormData(prev => ({ ...prev, image_url: url || '' }))
    setUploadError(null)
  }

  const handleImageError = (error: string) => {
    setUploadError(error)
  }

  if (authLoading || businessLoading || productLoading) {
    return (
      <PageLayout>
        <LoadingSpinner size="lg" text="Loading..." />
      </PageLayout>
    )
  }

  if (error && !product) {
    return (
      <PageLayout>
        <Card className="p-8 text-center">
          <PackageIcon className="h-12 w-12 mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/liff/products')}>
            Back to Products
          </Button>
        </Card>
      </PageLayout>
    )
  }

  if (success) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <PackageIcon className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Updated!</h2>
            <p className="text-gray-600 mb-6">
              {formData.name} has been successfully updated.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to products page...
            </p>
          </Card>
        </div>
      </PageLayout>
    )
  }

  if (!product) {
    return (
      <PageLayout>
        <LoadingSpinner size="lg" text="Loading product..." />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
        <PageHeader
          title="Edit Product"
          subtitle={`Update ${product.name}`}
          onBack={() => router.push('/liff/products')}
        />

        {/* Error Message */}
        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </Card>
        )}

        {/* Product Form */}
        <Card className="p-6">
          <div className="space-y-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Product Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
                className="w-full"
              />
            </div>

            {/* Barcode - Disabled */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Barcode
              </label>
              <Input
                type="text"
                value={formData.barcode}
                disabled={true}
                className="w-full bg-gray-100 cursor-not-allowed"
                placeholder="Barcode cannot be changed"
              />
              <p className="text-xs text-gray-500 mt-1">Barcode cannot be modified after creation</p>
            </div>

            {/* Product Image */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Product Image
              </label>
              <ImageUpload
                value={formData.image_url}
                onChange={handleImageChange}
                onError={handleImageError}
                disabled={loading}
                bucketType="product_images"
              />
              
              {uploadError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  {uploadError}
                </div>
              )}
            </div>

            {/* Price Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Cost Price
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                  placeholder="0.00"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Selling Price *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, selling_price: e.target.value }))}
                  placeholder="0.00"
                  className="w-full"
                />
              </div>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Unit
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="pcs">Pieces</option>
                <option value="kg">Kilograms</option>
                <option value="g">Grams</option>
                <option value="l">Liters</option>
                <option value="ml">Milliliters</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleUpdateProduct}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Updating Product...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <SaveIcon className="h-4 w-4" />
                    Update Product
                  </div>
                )}
              </Button>
              <Button
                onClick={() => router.push('/liff/products')}
                variant="secondary"
                className="px-6"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  )
}

export default EditProductPage
