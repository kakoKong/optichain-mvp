export const TIME_RANGES = [
  { value: '7d', label: '7 วัน' },
  { value: '30d', label: '30 วัน' },
  { value: '90d', label: '90 วัน' }
] as const

export const TRANSACTION_TYPES = {
  stock_in: 'รับสินค้าเข้า',
  stock_out: 'ขายสินค้า',
  adjustment: 'ปรับปรุงสต็อก'
} as const

export const PRODUCT_UNITS = [
  'piece',
  'kg',
  'g',
  'liter',
  'ml',
  'box',
  'pack',
  'dozen'
] as const

export const SORT_OPTIONS = {
  name: 'ชื่อสินค้า',
  stock: 'จำนวนสต็อก',
  value: 'มูลค่า'
} as const

export const FILTER_OPTIONS = {
  all: 'ทั้งหมด',
  low_stock: 'สต็อกต่ำ',
  no_stock: 'หมดสต็อก'
} as const

export const SCANNER_CONFIG = {
  camera: {
    facingMode: 'environment',
    aspectRatio: 16 / 9,
    resizeMode: 'crop-and-scale'
  },
  quagga: {
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: '#scanner-container',
      constraints: {
        width: 640,
        height: 480,
        facingMode: 'environment'
      }
    },
    locator: {
      patchSize: 'medium',
      halfSample: true
    },
    numOfWorkers: 2,
    frequency: 10,
    decoder: {
      readers: ['code_128_reader', 'ean_reader', 'ean_8_reader', 'code_39_reader', 'code_39_vin_reader', 'codabar_reader', 'upc_reader', 'upc_e_reader', 'i2of5_reader']
    },
    locate: true
  },
  scanInterval: 200,
  confidenceThreshold: 0.6
} as const
