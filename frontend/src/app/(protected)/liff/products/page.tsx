// frontend/app/liff/products/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    PackageIcon,
    PlusCircleIcon,
    SearchIcon,
    EditIcon,
    TrashIcon,
    AlertTriangleIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    FilterIcon,
    SortAscIcon,
    SortDescIcon,
    ArrowLeftIcon,
    BarcodeIcon,
    DollarSignIcon
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

declare global {
    interface Window {
        liff: any;
    }
}

interface Product {
    id: string
    name: string
    barcode?: string
    cost_price: number
    selling_price: number
    unit: string
    inventory: {
        current_stock: number
        min_stock_level: number
    }[]
}

export default function ProductsPage() {
    const { user, loading: authLoading } = useAuth()
    const [products, setProducts] = useState<Product[]>([])
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value'>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [filterBy, setFilterBy] = useState<'all' | 'low_stock' | 'no_stock'>('all')
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [business, setBusiness] = useState<any>(null)

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        barcode: '',
        cost_price: '',
        selling_price: '',
        unit: 'piece',
        current_stock: '',
        min_stock_level: ''
    })

    useEffect(() => {
        if (authLoading || !user) return
        initializeAndLoad()
    }, [authLoading, user])

    useEffect(() => {
        filterAndSortProducts()
    }, [products, searchTerm, sortBy, sortOrder, filterBy])

    const initializeAndLoad = async () => {
        setLoading(true)
        try {
            if (!user) { setLoading(false); return }

            const { data: bizRows, error: bizErr } = await supabase
                .from('businesses')
                .select(`
          id,
          name,
          products (
            *,
            inventory (*)
          )
        `)
                .eq('owner_id', user.id)
                .limit(1)

            if (bizErr) throw bizErr
            const biz = bizRows?.[0]
            if (!biz) { setBusiness(null); setProducts([]); setLoading(false); return }

            setBusiness({ id: biz.id, name: biz.name })
            setProducts(biz.products || [])
        } catch (e) {
            console.error('LIFF products init failed:', e)
        } finally {
            setLoading(false)
        }
    }


    const loadUserBusinessAndProducts = async (lineUserId: string) => {
        try {
            const { data: userData } = await supabase
                .from('profiles')
                .select(`
          *,
          businesses (
            id,
            name,
            products (
              *,
              inventory (*)
            )
          )
        `)
                .eq('line_user_id', lineUserId)
                .single()

            if (userData?.businesses?.[0]) {
                setBusiness(userData.businesses[0])
                setProducts(userData.businesses[0].products || [])
            }
        } catch (error) {
            console.error('Error loading products:', error)
        } finally {
            setLoading(false)
        }
    }

    const filterAndSortProducts = () => {
        let filtered = [...products]

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (product.barcode && product.barcode.includes(searchTerm))
            )
        }

        // Apply category filter
        if (filterBy === 'low_stock') {
            filtered = filtered.filter(product => {
                const current = product.inventory?.[0]?.current_stock || 0
                const minimum = product.inventory?.[0]?.min_stock_level || 0
                return current <= minimum && minimum > 0
            })
        } else if (filterBy === 'no_stock') {
            filtered = filtered.filter(product => {
                const current = product.inventory?.[0]?.current_stock || 0
                return current === 0
            })
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue

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
                    const aStock = a.inventory?.[0]?.current_stock || 0
                    const bStock = b.inventory?.[0]?.current_stock || 0
                    aValue = aStock * (Number(a.selling_price) || 0)
                    bValue = bStock * (Number(b.selling_price) || 0)
                    break
                default:
                    aValue = a.name
                    bValue = b.name
            }

            if (sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
            }
        })

        setFilteredProducts(filtered)
    }

    const resetForm = () => {
        setFormData({
            name: '',
            barcode: '',
            cost_price: '',
            selling_price: '',
            unit: 'piece',
            current_stock: '',
            min_stock_level: ''
        })
    }

    const handleAddProduct = async (e: React.FormEvent) => {
        // TODO: Change to calling backend API
        e.preventDefault()
        if (!business) return

        try {
            const { data: product, error } = await supabase
                .from('products')
                .insert([
                    {
                        business_id: business.id,
                        name: formData.name,
                        barcode: formData.barcode || null,
                        cost_price: Number(formData.cost_price) || 0,
                        selling_price: Number(formData.selling_price) || 0,
                        unit: formData.unit
                    }
                ])
                .select()
                .single()

            if (error) throw error

            // Create initial inventory record
            if (product) {
                await supabase
                    .from('inventory')
                    .insert([
                        {
                            business_id: business.id,
                            product_id: product.id,
                            current_stock: Number(formData.current_stock) || 0,
                            min_stock_level: Number(formData.min_stock_level) || 0
                        }
                    ])

                // Reload products
                await loadUserBusinessAndProducts(business.line_user_id || '')
                setShowAddModal(false)
                resetForm()
            }
        } catch (error) {
            console.error('Error adding product:', error)
            alert('Failed to add product')
        }
    }

    const handleEditProduct = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingProduct || !business) return

        try {
            const { error: productError } = await supabase
                .from('products')
                .update({
                    name: formData.name,
                    barcode: formData.barcode || null,
                    cost_price: Number(formData.cost_price) || 0,
                    selling_price: Number(formData.selling_price) || 0,
                    unit: formData.unit
                })
                .eq('id', editingProduct.id)

            if (productError) throw productError

            // Update inventory
            const { error: inventoryError } = await supabase
                .from('inventory')
                .update({
                    current_stock: Number(formData.current_stock) || 0,
                    min_stock_level: Number(formData.min_stock_level) || 0
                })
                .eq('product_id', editingProduct.id)

            if (inventoryError) throw inventoryError

            // Reload products
            await loadUserBusinessAndProducts(business.line_user_id || '')
            setEditingProduct(null)
            resetForm()
        } catch (error) {
            console.error('Error updating product:', error)
            alert('Failed to update product')
        }
    }

    const handleDeleteProduct = async (productId: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId)

            if (error) throw error

            // Reload products
            setProducts(products.filter(p => p.id !== productId))
        } catch (error) {
            console.error('Error deleting product:', error)
            alert('Failed to delete product')
        }
    }

    const startEdit = (product: Product) => {
        setEditingProduct(product)
        setFormData({
            name: product.name,
            barcode: product.barcode || '',
            cost_price: product.cost_price.toString(),
            selling_price: product.selling_price.toString(),
            unit: product.unit,
            current_stock: (product.inventory?.[0]?.current_stock || 0).toString(),
            min_stock_level: (product.inventory?.[0]?.min_stock_level || 0).toString()
        })
    }

    const getStockStatus = (product: Product) => {
        const current = product.inventory?.[0]?.current_stock || 0
        const minimum = product.inventory?.[0]?.min_stock_level || 0

        if (current === 0) {
            return { status: 'out', color: 'red', text: 'Out of Stock' }
        } else if (current <= minimum && minimum > 0) {
            return { status: 'low', color: 'yellow', text: 'Low Stock' }
        } else {
            return { status: 'good', color: 'green', text: 'In Stock' }
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto"></div>
                    <p className="mt-6 text-gray-600 font-medium">Loading products...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-blue-700 shadow-lg">
                <div className="px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => window.history.back()}
                                className="p-2 bg-white/20 rounded-xl text-white hover:bg-white/30 transition-colors"
                            >
                                <ArrowLeftIcon className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <PackageIcon className="h-8 w-8" />
                                    Product Management
                                </h1>
                                <p className="text-green-100 mt-1">{products.length} products in inventory</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                resetForm()
                                setShowAddModal(true)
                            }}
                            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
                        >
                            <PlusCircleIcon className="h-5 w-5" />
                            Add Product
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 space-y-6">
                {/* Search and Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                placeholder="Search products or barcodes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        {/* Filter */}
                        <div className="flex items-center gap-3">
                            <select
                                value={filterBy}
                                onChange={(e) => setFilterBy(e.target.value as any)}
                                className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                            >
                                <option value="all">All Products</option>
                                <option value="low_stock">Low Stock</option>
                                <option value="no_stock">Out of Stock</option>
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                            >
                                <option value="name">Sort by Name</option>
                                <option value="stock">Sort by Stock</option>
                                <option value="value">Sort by Value</option>
                            </select>

                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                {sortOrder === 'asc' ? (
                                    <SortAscIcon className="h-5 w-5 text-gray-600" />
                                ) : (
                                    <SortDescIcon className="h-5 w-5 text-gray-600" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => {
                        const stockStatus = getStockStatus(product)
                        const currentStock = product.inventory?.[0]?.current_stock || 0
                        const stockValue = currentStock * (Number(product.selling_price) || 0)

                        return (
                            <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                {/* Header */}
                                <div className="p-6 pb-4">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 text-lg mb-1">{product.name}</h3>
                                            {product.barcode && (
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                                    <BarcodeIcon className="h-4 w-4" />
                                                    <span>{product.barcode}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => startEdit(product)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <EditIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProduct(product.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stock Status */}
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${stockStatus.status === 'good' ? 'bg-green-100 text-green-700' :
                                            stockStatus.status === 'low' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                        }`}>
                                        {stockStatus.status === 'good' && <TrendingUpIcon className="h-4 w-4" />}
                                        {stockStatus.status === 'low' && <AlertTriangleIcon className="h-4 w-4" />}
                                        {stockStatus.status === 'out' && <TrendingDownIcon className="h-4 w-4" />}
                                        {stockStatus.text}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="px-6 pb-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-3 rounded-xl">
                                            <p className="text-xs text-gray-600 font-medium">Current Stock</p>
                                            <p className="text-xl font-bold text-gray-900">{currentStock}</p>
                                            <p className="text-xs text-gray-500">{product.unit}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl">
                                            <p className="text-xs text-gray-600 font-medium">Stock Value</p>
                                            <p className="text-xl font-bold text-green-600">฿{stockValue.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-600 font-medium">Cost Price</p>
                                            <p className="text-gray-900">฿{Number(product.cost_price).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600 font-medium">Sell Price</p>
                                            <p className="text-gray-900">฿{Number(product.selling_price).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-gray-100">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Min. Level: {product.inventory?.[0]?.min_stock_level || 0}</span>
                                            <span className="text-gray-600">
                                                Margin: {product.cost_price > 0 ?
                                                    Math.round(((Number(product.selling_price) - Number(product.cost_price)) / Number(product.selling_price)) * 100)
                                                    : 0}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                        <PackageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                        <p className="text-gray-500 mb-6">
                            {searchTerm || filterBy !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'Get started by adding your first product'
                            }
                        </p>
                        {!searchTerm && filterBy === 'all' && (
                            <button
                                onClick={() => {
                                    resetForm()
                                    setShowAddModal(true)
                                }}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
                            >
                                <PlusCircleIcon className="h-5 w-5" />
                                Add Your First Product
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Add/Edit Product Modal */}
            {(showAddModal || editingProduct) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </h2>
                        </div>

                        <form onSubmit={editingProduct ? handleEditProduct : handleAddProduct} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Product Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter product name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Barcode
                                </label>
                                <input
                                    type="text"
                                    value={formData.barcode}
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter barcode (optional)"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cost Price
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">฿</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.cost_price}
                                            onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Selling Price
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">฿</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.selling_price}
                                            onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                                            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Unit
                                </label>
                                <select
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="piece">Piece</option>
                                    <option value="kg">Kilogram</option>
                                    <option value="gram">Gram</option>
                                    <option value="liter">Liter</option>
                                    <option value="ml">Milliliter</option>
                                    <option value="box">Box</option>
                                    <option value="pack">Pack</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current Stock
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.current_stock}
                                        onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Min. Stock Level
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.min_stock_level}
                                        onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false)
                                        setEditingProduct(null)
                                        resetForm()
                                    }}
                                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-medium transition-colors"
                                >
                                    {editingProduct ? 'Update Product' : 'Add Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}