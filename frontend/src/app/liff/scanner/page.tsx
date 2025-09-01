import { useEffect, useState, useRef } from 'react'
import {
  ScanLineIcon,
  CameraIcon,
  KeyboardIcon,
  CheckCircleIcon,
  XCircleIcon,
  PackageIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  SettingsIcon,
  ArrowLeftIcon
} from 'lucide-react'

// Mock data for demonstration
const mockProducts = [
  {
    id: 1,
    name: "Sample Product A",
    barcode: "1234567890123",
    cost_price: 10.50,
    selling_price: 15.00,
    inventory: [{ current_stock: 25, min_stock_level: 5 }]
  },
  {
    id: 2,
    name: "Sample Product B", 
    barcode: "9876543210987",
    cost_price: 8.25,
    selling_price: 12.00,
    inventory: [{ current_stock: 12, min_stock_level: 3 }]
  }
]

export default function BarcodeScanner() {
  const [scanning, setScanning] = useState(false)
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [transactionType, setTransactionType] = useState('stock_in')
  const [business, setBusiness] = useState({ id: 1, name: 'Demo Business' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [recentScans, setRecentScans] = useState([])
  const [scanResult, setScanResult] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Load recent scans from memory on component mount
  useEffect(() => {
    // Initialize with some mock recent scans for demo
    setRecentScans([
      {
        barcode: "1234567890123",
        productName: "Sample Product A",
        action: "stock_in",
        quantity: 5,
        scannedAt: new Date(Date.now() - 300000).toISOString()
      }
    ])
  }, [])

  const saveToRecentScans = (scanData) => {
    const newScan = {
      ...scanData,
      scannedAt: new Date().toISOString()
    }
    setRecentScans(prev => [newScan, ...prev.slice(0, 4)])
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setScanning(true)
        
        // Start scanning for codes
        videoRef.current.onloadedmetadata = () => {
          startBarcodeDetection()
        }
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Camera access denied or not available. Please allow camera permissions and try again.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setScanning(false)
  }

  const startBarcodeDetection = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    const detectBarcode = () => {
      if (!scanning || !video.videoWidth || !video.videoHeight) {
        if (scanning) {
          requestAnimationFrame(detectBarcode)
        }
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      // Try to use native BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new window.BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upca', 'upce']
        })
        
        barcodeDetector.detect(canvas)
          .then(barcodes => {
            if (barcodes.length > 0) {
              const barcode = barcodes[0].rawValue
              handleBarcodeResult(barcode)
              stopCamera()
              return
            }
            if (scanning) {
              requestAnimationFrame(detectBarcode)
            }
          })
          .catch(() => {
            // Fallback: continue scanning without detection
            if (scanning) {
              requestAnimationFrame(detectBarcode)
            }
          })
      } else {
        // Simple pattern matching fallback for demo
        // In a real app, you'd use a library like jsQR or QuaggaJS
        if (scanning) {
          requestAnimationFrame(detectBarcode)
        }
      }
    }

    detectBarcode()
  }

  const scanWithLiffScanner = async () => {
    setLoading(true)
    try {
      // Check if LIFF is available
      if (typeof window !== 'undefined' && window.liff && window.liff.scanCode) {
        try {
          const result = await window.liff.scanCode()
          await handleBarcodeResult(result.value)
        } catch (liffError) {
          console.error('LIFF scanner error:', liffError)
          // Fallback to manual input
          fallbackToManualEntry()
        }
      } else {
        // LIFF not available, fallback to manual entry
        fallbackToManualEntry()
      }
    } catch (error) {
      console.error('Error scanning barcode:', error)
      fallbackToManualEntry()
    } finally {
      setLoading(false)
    }
  }

  const fallbackToManualEntry = () => {
    const barcode = prompt('LIFF scanner not available. Enter barcode manually:')
    if (barcode && barcode.trim()) {
      handleBarcodeResult(barcode.trim())
    }
  }

  const handleBarcodeResult = async (barcode) => {
    if (!business) return
    setLoading(true)
    setScanResult(barcode)
    
    try {
      // Mock product lookup - replace with actual Supabase call
      const foundProduct = mockProducts.find(p => p.barcode === barcode)
      
      if (foundProduct) {
        setProduct(foundProduct)
        saveToRecentScans({ barcode, productName: foundProduct.name, action: 'found' })
      } else {
        // Product not found, offer to create new one
        const productName = prompt(`Product with barcode ${barcode} not found. Enter product name to create:`)
        if (productName && productName.trim()) {
          await createNewProduct(barcode, productName.trim())
        }
      }
    } catch (error) {
      console.error('Error looking up product:', error)
      alert('Error looking up product. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const createNewProduct = async (barcode, name) => {
    if (!business) return

    setLoading(true)
    try {
      // Mock product creation - replace with actual API call
      const newProduct = {
        id: Date.now(), // Mock ID
        name,
        barcode,
        cost_price: 0,
        selling_price: 0,
        inventory: [{ current_stock: 0, min_stock_level: 0 }]
      }
      
      // Add to mock products for demo
      mockProducts.push(newProduct)
      
      setProduct(newProduct)
      saveToRecentScans({ barcode, productName: name, action: 'created' })
      alert('New product created successfully!')
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Failed to create product')
    } finally {
      setLoading(false)
    }
  }

  const recordTransaction = async () => {
    if (!product || !business) return

    setLoading(true)
    try {
      // Mock transaction recording - replace with actual API call
      console.log('Recording transaction:', {
        business_id: business.id,
        product_id: product.id,
        transaction_type: transactionType,
        quantity: quantity,
        reason: `${transactionType.replace('_', ' ')} via scanner`
      })

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      setSuccess(true)
      saveToRecentScans({
        barcode: product.barcode,
        productName: product.name,
        action: transactionType,
        quantity
      })

      // Reset form after success
      setTimeout(() => {
        setProduct(null)
        setQuantity(1)
        setSuccess(false)
        setScanResult('')
      }, 2000)
    } catch (error) {
      console.error('Error recording transaction:', error)
      alert('Failed to record transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Hidden canvas for barcode detection */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="relative z-10 p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1"></div>
          <div className="p-4 sm:p-6 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-200"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  Smart Scanner
                </h1>
                <p className="mt-1 text-sm sm:text-base text-gray-600">
                  Scan to update inventory instantly
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <ScanLineIcon className="h-10 w-10 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Scan Result Display */}
        {scanResult && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-green-200 p-4 sm:p-6 flex items-center gap-4">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="font-semibold text-gray-900">Barcode Detected!</h3>
              <p className="text-sm text-gray-600">Scanned: {scanResult}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-green-200 p-4 sm:p-6 flex items-center gap-4">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="font-semibold text-gray-900">Transaction Recorded!</h3>
              <p className="text-sm text-gray-600">
                Your inventory has been updated successfully.
              </p>
            </div>
          </div>
        )}

        {!product ? (
          <div className="space-y-6">
            {/* Scanning Options */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-sm">
              <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Choose Scanning Method
                </h2>
                <p className="text-sm text-gray-600">Select the best option for your device</p>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {scanning ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-80 rounded-2xl object-cover bg-gray-900"
                    />
                    
                    {/* Scanner overlay */}
                    <div className="absolute inset-0 border-4 border-white/30 rounded-2xl pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-48 h-32 border-4 border-blue-500 rounded-lg bg-blue-500/10">
                          {/* Corner indicators */}
                          <div className="absolute -top-2 -left-2 w-6 h-6 border-l-4 border-t-4 border-blue-500"></div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 border-r-4 border-t-4 border-blue-500"></div>
                          <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-4 border-b-4 border-blue-500"></div>
                          <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-4 border-b-4 border-blue-500"></div>
                        </div>
                      </div>
                      
                      {/* Scanning line animation */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 overflow-hidden">
                        <div className="absolute w-full h-0.5 bg-blue-500 shadow-lg animate-pulse" 
                             style={{ 
                               top: '50%',
                               animation: 'scan-line 2s linear infinite'
                             }}>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
                      <button
                        onClick={stopCamera}
                        className="px-6 py-3 rounded-xl font-medium transition-colors shadow-lg bg-red-500 hover:bg-red-600 text-white"
                      >
                        Stop Camera
                      </button>
                      <button
                        onClick={() => {
                          // Simulate barcode detection for demo
                          const demoBarcode = "1234567890123"
                          handleBarcodeResult(demoBarcode)
                          stopCamera()
                        }}
                        className="px-6 py-3 rounded-xl font-medium transition-colors shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Demo Scan
                      </button>
                    </div>

                    <div className="absolute top-6 left-6 bg-black/60 text-white px-3 py-2 rounded-lg text-sm">
                      Position barcode in the center frame
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={scanWithLiffScanner}
                      disabled={loading}
                      className="flex items-center gap-4 p-4 rounded-xl font-medium transition-all shadow-md transform hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 bg-gradient-to-r from-indigo-500 to-blue-600 text-white"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <ScanLineIcon className="h-6 w-6" />
                      )}
                      <div className="text-left">
                        <div className="font-semibold text-lg">LINE Scanner</div>
                        <div className="text-indigo-200 text-sm">Use built-in LINE camera</div>
                      </div>
                    </button>

                    <button
                      onClick={startCamera}
                      className="flex items-center gap-4 p-4 rounded-xl font-medium transition-all shadow-md transform hover:scale-[1.02] hover:shadow-lg bg-gradient-to-r from-gray-600 to-gray-700 text-white"
                    >
                      <CameraIcon className="h-6 w-6" />
                      <div className="text-left">
                        <div className="font-semibold text-lg">Camera Scanner</div>
                        <div className="text-gray-300 text-sm">Use device camera</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const barcode = prompt('Enter barcode manually:')
                        if (barcode && barcode.trim()) {
                          handleBarcodeResult(barcode.trim())
                        }
                      }}
                      className="flex items-center gap-4 p-4 rounded-xl font-medium transition-all shadow-md transform hover:scale-[1.02] hover:shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white"
                    >
                      <KeyboardIcon className="h-6 w-6" />
                      <div className="text-left">
                        <div className="font-semibold text-lg">Manual Entry</div>
                        <div className="text-green-200 text-sm">Type barcode number</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Scans */}
            {recentScans.length > 0 && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-sm">
                <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Scans</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {recentScans.map((scan, index) => (
                    <div key={index} className="px-4 py-4 sm:px-6 flex items-center justify-between transition-colors hover:bg-gray-50/50">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          scan.action === 'created' ? 'bg-blue-100 text-blue-600' :
                          scan.action === 'stock_in' ? 'bg-green-100 text-green-600' :
                          scan.action === 'stock_out' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <PackageIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium truncate text-gray-900">{scan.productName}</p>
                          <p className="text-sm truncate text-gray-500">{scan.barcode}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium capitalize text-gray-900">
                          {scan.action.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(scan.scannedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-sm">
            <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Record Transaction</h2>
              <p className="text-sm text-gray-600">Update inventory for scanned product</p>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Product Info */}
              <div className="p-4 sm:p-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-500 text-white">
                    <PackageIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {product.name}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">Barcode:</span> {product.barcode}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">Current Stock:</span> {product.inventory?.[0]?.current_stock || 0} units
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">Min. Level:</span> {product.inventory?.[0]?.min_stock_level || 0} units
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">Price:</span> ${product.selling_price || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-900">
                  Transaction Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'stock_in', label: 'Stock In', icon: TrendingUpIcon, color: 'green' },
                    { value: 'stock_out', label: 'Stock Out', icon: TrendingDownIcon, color: 'red' },
                    { value: 'adjustment', label: 'Adjustment', icon: SettingsIcon, color: 'blue' }
                  ].map((type) => {
                    const Icon = type.icon
                    const isSelected = transactionType === type.value
                    return (
                      <button
                        key={type.value}
                        onClick={() => setTransactionType(type.value)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? type.color === 'green' ? 'bg-green-100 border-green-500 text-green-700' :
                              type.color === 'red' ? 'bg-red-100 border-red-500 text-red-700' :
                              'bg-blue-100 border-blue-500 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-6 w-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">{type.label}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-900">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 rounded-xl font-bold transition-colors bg-gray-200 hover:bg-gray-300 text-gray-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="flex-1 text-center text-2xl font-bold rounded-xl py-3 px-4 bg-white border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-gray-900"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 rounded-xl font-bold transition-colors bg-gray-200 hover:bg-gray-300 text-gray-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={recordTransaction}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <CheckCircleIcon className="h-5 w-5" />
                  )}
                  Record Transaction
                </button>
                <button
                  onClick={() => {
                    setProduct(null)
                    setScanResult('')
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-4 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <XCircleIcon className="h-5 w-5" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/20 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-3">How to Use</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>LINE Scanner:</strong> Uses LINE's built-in camera (recommended for LINE users)</p>
            <p>• <strong>Camera Scanner:</strong> Uses your device's camera with live detection</p>
            <p>• <strong>Manual Entry:</strong> Type the barcode number directly</p>
            <p>• Point the camera at the barcode and hold steady for best results</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan-line {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `}</style>
    </div>
  )
}