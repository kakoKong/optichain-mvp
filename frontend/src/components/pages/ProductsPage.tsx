import React, { useState, useEffect } from 'react'
import { PlusCircleIcon, SearchIcon, FilterIcon, SortAscIcon, SortDescIcon, PackageIcon } from 'lucide-react'
import { PageLayout } from '@/components/ui/PageLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProductCard } from '@/components/products/ProductCard'
import { ProductForm } from '@/components/products/ProductForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useProducts } from '@/hooks/useProducts'
import { SORT_OPTIONS, FILTER_OPTIONS } from '@/utils/constants'
import { formatNumber } from '@/utils/formatters'

export const ProductsPage: React.FC = () => {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useProducts()
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterBy, setFilterBy] = useState<'all' | 'low_stock' | 'no_stock'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Debug logging
  console.log('[ProductsPage] Render - products:', products.length, 'loading:', loading)

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply stock filter
    if (filterBy === 'low_stock') {
      filtered = filtered.filter(product => 
        (product.inventory?.[0]?.current_stock || 0) <= 5
      )
    } else if (filterBy === 'no_stock') {
      filtered = filtered.filter(product => 
        (product.inventory?.[0]?.current_stock || 0) === 0
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'stock':
          aValue = a.inventory?.[0]?.current_stock || 0
          bValue = b.inventory?.[0]?.current_stock || 0
          break
        case 'value':
          aValue = (a.inventory?.[0]?.current_stock || 0) * a.selling_price
          bValue = (b.inventory?.[0]?.current_stock || 0) * b.selling_price
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredProducts(filtered)
  }, [products, searchTerm, sortBy, sortOrder, filterBy])

  const handleAddProduct = async (data: any) => {
    setFormLoading(true)
    try {
      await addProduct(data)
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding product:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateProduct = async (data: any) => {
    if (!editingProduct) return
    
    setFormLoading(true)
    try {
      await updateProduct(editingProduct.id, data)
      setEditingProduct(null)
    } catch (error) {
      console.error('Error updating product:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteProduct = async (product: any) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบสินค้า "${product.name}"?`)) {
      try {
        await deleteProduct(product.id)
      } catch (error) {
        console.error('Error deleting product:', error)
      }
    }
  }

  const totalValue = products.reduce((sum, product) => {
    const stock = product.inventory?.[0]?.current_stock || 0
    return sum + (stock * product.selling_price)
  }, 0)

  const lowStockCount = products.filter(product => 
    (product.inventory?.[0]?.current_stock || 0) <= 5
  ).length

  if (loading) {
    return (
      <PageLayout>
        <LoadingSpinner size="lg" text="กำลังโหลดสินค้า..." />
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
              <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
            </div>
            <PackageIcon className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">{formatNumber(totalValue)}</p>
            </div>
            <PackageIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="ค้นหาสินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<SearchIcon className="h-4 w-4 text-gray-400" />}
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(FILTER_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAscIcon className="h-4 w-4" /> : <SortDescIcon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={setEditingProduct}
            onDelete={handleDeleteProduct}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="p-8 text-center">
          <PackageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบสินค้า</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'ไม่พบสินค้าที่ตรงกับการค้นหา' : 'ยังไม่มีสินค้าในระบบ'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowAddModal(true)}>
              <PlusCircleIcon className="h-4 w-4 mr-2" />
              เพิ่มสินค้าแรก
            </Button>
          )}
        </Card>
      )}

      {/* Modals */}
      <ProductForm
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddProduct}
        loading={formLoading}
      />

      <ProductForm
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        onSubmit={handleUpdateProduct}
        product={editingProduct}
        loading={formLoading}
      />
    </PageLayout>
  )
}

export default ProductsPage
