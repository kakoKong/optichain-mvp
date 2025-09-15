import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { validateProduct } from '@/utils/validation'
import { PRODUCT_UNITS } from '@/utils/constants'
import { Product } from '@/hooks/useProducts'

interface ProductFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  product?: Product | null
  loading?: boolean
}

export const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  product,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    cost_price: '',
    selling_price: '',
    unit: 'piece',
    current_stock: '',
    min_stock_level: '',
    image_url: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        barcode: product.barcode || '',
        cost_price: product.cost_price.toString(),
        selling_price: product.selling_price.toString(),
        unit: product.unit,
        current_stock: product.inventory?.[0]?.current_stock?.toString() || '0',
        min_stock_level: '5', // Default value
        image_url: product.image_url || ''
      })
    } else {
      setFormData({
        name: '',
        barcode: '',
        cost_price: '',
        selling_price: '',
        unit: 'piece',
        current_stock: '',
        min_stock_level: '',
        image_url: ''
      })
    }
    setErrors({})
    setUploadError(null)
  }, [product, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = validateProduct(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    try {
      await onSubmit({
        ...formData,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        current_stock: parseInt(formData.current_stock),
        min_stock_level: parseInt(formData.min_stock_level)
      })
      onClose()
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleImageChange = (url: string | null) => {
    setFormData(prev => ({ ...prev, image_url: url || '' }))
    setUploadError(null)
  }

  const handleImageError = (error: string) => {
    setUploadError(error)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="ชื่อสินค้า *"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          placeholder="กรอกชื่อสินค้า"
        />

        <Input
          label="บาร์โค้ด"
          value={formData.barcode}
          onChange={(e) => handleChange('barcode', e.target.value)}
          error={errors.barcode}
          placeholder="กรอกบาร์โค้ด (ไม่บังคับ)"
        />

        <ImageUpload
          value={formData.image_url}
          onChange={handleImageChange}
          onError={handleImageError}
          disabled={loading}
          bucketType="product_images"
        />
        
        {uploadError && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {uploadError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="ราคาต้นทุน *"
            type="number"
            value={formData.cost_price}
            onChange={(e) => handleChange('cost_price', e.target.value)}
            error={errors.cost_price}
            placeholder="0"
          />

          <Input
            label="ราคาขาย *"
            type="number"
            value={formData.selling_price}
            onChange={(e) => handleChange('selling_price', e.target.value)}
            error={errors.selling_price}
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              หน่วย *
            </label>
            <select
              value={formData.unit}
              onChange={(e) => handleChange('unit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              {PRODUCT_UNITS.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>

          <Input
            label="จำนวนสต็อก *"
            type="number"
            value={formData.current_stock}
            onChange={(e) => handleChange('current_stock', e.target.value)}
            error={errors.current_stock}
            placeholder="0"
          />
        </div>

        <Input
          label="ระดับสต็อกต่ำสุด *"
          type="number"
          value={formData.min_stock_level}
          onChange={(e) => handleChange('min_stock_level', e.target.value)}
          error={errors.min_stock_level}
          placeholder="5"
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            loading={loading}
          >
            {product ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default ProductForm
