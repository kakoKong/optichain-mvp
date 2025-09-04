import React from 'react'
import { EditIcon, TrashIcon, AlertTriangleIcon, TrendingUpIcon, TrendingDownIcon, BarcodeIcon, DollarSignIcon, PackageIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/formatters'
import { Product } from '@/hooks/useProducts'

interface ProductCardProps {
  product: Product
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete }) => {
  const currentStock = product.inventory?.[0]?.current_stock || 0
  const totalValue = currentStock * product.selling_price
  const isLowStock = currentStock <= 5 // Assuming low stock threshold

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        {/* Product Image */}
        <div className="flex-shrink-0">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-16 h-16 rounded-lg object-cover border border-gray-200"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <div className={`w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center ${product.image_url ? 'hidden' : ''}`}>
            <PackageIcon className="h-6 w-6 text-gray-400" />
          </div>
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
              {product.barcode && (
                <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                  <BarcodeIcon className="h-3 w-3" />
                  <span className="truncate">{product.barcode}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={() => onEdit(product)}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              >
                <EditIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(product)}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">สต็อก:</span>
          <div className="flex items-center gap-1">
            {isLowStock ? (
              <AlertTriangleIcon className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingUpIcon className="h-4 w-4 text-green-500" />
            )}
            <span className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
              {currentStock} {product.unit}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">ราคาขาย:</span>
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(product.selling_price)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">มูลค่ารวม:</span>
          <div className="flex items-center gap-1">
            <DollarSignIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              {formatCurrency(totalValue)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default ProductCard
