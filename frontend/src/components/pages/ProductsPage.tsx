import React, { useState, useEffect } from 'react'
import { PlusCircleIcon, SearchIcon, PackageIcon, XIcon } from 'lucide-react'
import { PageLayout } from '@/components/ui/PageLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [prefilledBarcode, setPrefilledBarcode] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    cost_price: '',
    selling_price: '',
    unit: 'pcs'
  })

  // Check for barcode parameter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const barcode = urlParams.get('barcode')
    const mode = urlParams.get('mode')
    
    if (barcode && mode === 'add') {
      setPrefilledBarcode(barcode)
      setFormData(prev => ({ ...prev, barcode }))
      setShowAddModal(true)
    }
  }, [])

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
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert([{
          business_id: business.id,
          name: formData.name.trim(),
          barcode: formData.barcode.trim(),
          cost_price: costPrice,
          selling_price: sellingPrice,
          unit: formData.unit
        }])
        .select()
        .single()

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

      // Reload products
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

      setProducts(productsData || [])
      setShowAddModal(false)
      setFormData({
        name: '',
        barcode: '',
        cost_price: '',
        selling_price: '',
        unit: 'pcs'
      })
      setPrefilledBarcode(null)

      alert('Product added successfully!')

    } catch (err) {
      console.error('[ProductsPage] Error adding product:', err)
      alert(`Failed to add product: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

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
          <Button onClick={() => setShowAddModal(true)}>
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
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{product.name}</h4>
                  <p className="text-sm text-gray-600">
                    Barcode: {product.barcode}
                  </p>
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

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setFormData({
            name: '',
            barcode: '',
            cost_price: '',
            selling_price: '',
            unit: 'pcs'
          })
          setPrefilledBarcode(null)
        }}
        title="Add New Product"
      >
        <div className="space-y-4">
          {prefilledBarcode && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                Barcode <strong>{prefilledBarcode}</strong> was scanned from the scanner. Please complete the product details below.
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barcode *
            </label>
            <Input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
              placeholder="Enter barcode"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Price
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selling Price *
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData(prev => ({ ...prev, selling_price: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

          <div className="flex gap-3 pt-4">
            <Button
              onClick={addProduct}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Adding...' : 'Add Product'}
            </Button>
            <Button
              onClick={() => {
                setShowAddModal(false)
                setFormData({
                  name: '',
                  barcode: '',
                  cost_price: '',
                  selling_price: '',
                  unit: 'pcs'
                })
                setPrefilledBarcode(null)
              }}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  )
}

export default ProductsPage