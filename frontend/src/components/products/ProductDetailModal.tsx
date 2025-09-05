import React from 'react'
import { XIcon, PackageIcon, BarcodeIcon, DollarSignIcon, TrendingUpIcon, AlertTriangleIcon } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/formatters'
import { Product } from '@/hooks/useProducts'

interface ProductDetailModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product
}) => {
  if (!product) return null

  const currentStock = product.inventory?.[0]?.current_stock || 0
  const minStockLevel = product.inventory?.[0]?.min_stock_level || 0
  const totalValue = currentStock * product.selling_price
  const isLowStock = currentStock <= minStockLevel

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PackageIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
              <p className="text-sm text-gray-500">Product Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Product Image */}
        <div className="flex justify-center">
          <div className="w-48 h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
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
              <PackageIcon className="h-16 w-16 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Product Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Product Name</label>
                <p className="text-gray-900">{product.name}</p>
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
          </div>

          {/* Pricing & Stock */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Pricing & Stock</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Cost Price</label>
                <p className="text-gray-900">{formatCurrency(product.cost_price)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Selling Price</label>
                <p className="text-gray-900 font-semibold">{formatCurrency(product.selling_price)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Current Stock</label>
                <div className="flex items-center gap-2">
                  {isLowStock ? (
                    <AlertTriangleIcon className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingUpIcon className="h-4 w-4 text-green-500" />
                  )}
                  <p className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
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
                  <DollarSignIcon className="h-4 w-4 text-green-500" />
                  <p className="text-green-600 font-semibold">{formatCurrency(totalValue)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Status Alert */}
        {isLowStock && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-red-500" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Low Stock Alert</h4>
                <p className="text-sm text-red-700">
                  Current stock ({currentStock} {product.unit}) is below the minimum level ({minStockLevel} {product.unit}).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ProductDetailModal
