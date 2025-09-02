export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export const validateProduct = (data: {
  name: string
  cost_price: string
  selling_price: string
  current_stock: string
  min_stock_level: string
}): ValidationResult => {
  const errors: Record<string, string> = {}

  if (!data.name.trim()) {
    errors.name = 'กรุณากรอกชื่อสินค้า'
  }

  const costPrice = parseFloat(data.cost_price)
  if (!data.cost_price || isNaN(costPrice) || costPrice < 0) {
    errors.cost_price = 'กรุณากรอกราคาต้นทุนที่ถูกต้อง'
  }

  const sellingPrice = parseFloat(data.selling_price)
  if (!data.selling_price || isNaN(sellingPrice) || sellingPrice < 0) {
    errors.selling_price = 'กรุณากรอกราคาขายที่ถูกต้อง'
  }

  if (sellingPrice < costPrice) {
    errors.selling_price = 'ราคาขายต้องไม่ต่ำกว่าราคาต้นทุน'
  }

  const currentStock = parseInt(data.current_stock)
  if (!data.current_stock || isNaN(currentStock) || currentStock < 0) {
    errors.current_stock = 'กรุณากรอกจำนวนสต็อกที่ถูกต้อง'
  }

  const minStockLevel = parseInt(data.min_stock_level)
  if (!data.min_stock_level || isNaN(minStockLevel) || minStockLevel < 0) {
    errors.min_stock_level = 'กรุณากรอกระดับสต็อกต่ำสุดที่ถูกต้อง'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateTransaction = (data: {
  quantity: string
  transaction_type: string
  product_id: string
}): ValidationResult => {
  const errors: Record<string, string> = {}

  if (!data.product_id) {
    errors.product_id = 'กรุณาเลือกสินค้า'
  }

  const quantity = parseInt(data.quantity)
  if (!data.quantity || isNaN(quantity) || quantity <= 0) {
    errors.quantity = 'กรุณากรอกจำนวนที่ถูกต้อง'
  }

  if (!data.transaction_type) {
    errors.transaction_type = 'กรุณาเลือกประเภทการทำรายการ'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
