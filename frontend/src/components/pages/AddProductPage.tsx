import React, { useState, useEffect } from 'react'
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
import { supabase } from '@/lib/supabase'

export const AddProductPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const { business, loading: businessLoading } = useBusiness()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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

  // Check for barcode parameter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const barcode = urlParams.get('barcode')
    
    if (barcode) {
      setFormData(prev => ({ ...prev, barcode }))
    }
  }, [])

  // Add product function
  const addProduct = async () => {
    if (!business || !user) return

    // Validate form
    if (!formData.name.trim() || !formData.barcode.trim()) {
      alert('Please fill in product name and barcode')
      return
    }

    const costPrice = parseFloat(formData.cost_price) || 0
    const sellingPrice = parseFloat(formData.selling_price) || 0

    if (sellingPrice <= 0) {
      alert('Selling price must be greater than 0')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Resolve user ID
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

      // Create product
      console.log('[AddProductPage] Creating product with data:', {
        business_id: business.id,
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        cost_price: costPrice,
        selling_price: sellingPrice,
        unit: formData.unit,
        image_url: formData.image_url || null
      })

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert([{
          business_id: business.id,
          name: formData.name.trim(),
          barcode: formData.barcode.trim(),
          cost_price: costPrice,
          selling_price: sellingPrice,
          unit: formData.unit,
          image_url: formData.image_url || null
        }])
        .select()
        .single()

      console.log('[AddProductPage] Product creation result:', { product, productError }) 

      if (productError) {
        throw productError
      }

      // Create inventory record
      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert([{
          business_id: business.id,
          product_id: product.id,
          current_stock: 0,
          min_stock_level: 0
        }])

      if (inventoryError) {
        throw inventoryError
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.href = '/liff/products'
      }, 2000)

    } catch (err) {
      console.error('[AddProductPage] Error adding product:', err)
      setError(err instanceof Error ? err.message : 'Failed to add product')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (url: string | null) => {
    console.log('[AddProductPage] Image URL changed:', url)
    setFormData(prev => ({ ...prev, image_url: url || '' }))
    setUploadError(null)
  }

  const handleImageError = (error: string) => {
    setUploadError(error)
  }

  if (authLoading || businessLoading) {
    return (
      <PageLayout>
        <LoadingSpinner size="lg" text="Loading..." />
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Added!</h2>
            <p className="text-gray-600 mb-6">
              {formData.name} has been successfully added to your inventory.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to products page...
            </p>
          </Card>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
        <PageHeader
          title="Add New Product"
          subtitle="Create a new product in your inventory"
          onBack={() => window.history.back()}
        />

        {/* Barcode Info */}
        {formData.barcode && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <PackageIcon className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-blue-900">Scanned Barcode</p>
                <p className="text-xs text-blue-700">Barcode: {formData.barcode}</p>
              </div>
            </div>
          </Card>
        )}

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

            {/* Barcode */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Barcode *
              </label>
              <Input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                placeholder="Enter barcode"
                className="w-full"
              />
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
                onClick={addProduct}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Adding Product...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <SaveIcon className="h-4 w-4" />
                    Add Product
                  </div>
                )}
              </Button>
              <Button
                onClick={() => window.history.back()}
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

export default AddProductPage
