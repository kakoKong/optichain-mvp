// frontend/app/liff/scanner/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
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

declare global {
  interface Window {
    liff: any;
  }
}

export default function BarcodeScanner() {
  const [scanning, setScanning] = useState(false)
  const [product, setProduct] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [transactionType, setTransactionType] = useState('stock_in')
  const [user, setUser] = useState<any>(null)
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [recentScans, setRecentScans] = useState<any[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    initializeLiff()
    loadRecentScans()
  }, [])

  const initializeLiff = async () => {
    if (typeof window !== 'undefined' && window.liff) {
      try {
        await window.liff.init({ liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID })

        if (window.liff.isLoggedIn()) {
          const profile = await window.liff.getProfile()
          setUser(profile)
          await loadUserBusiness(profile.userId)
        } else {
          window.liff.login()
        }
      } catch (error) {
        console.error('LIFF initialization failed:', error)
      }
    }
  }

  const loadUserBusiness = async (lineUserId: string) => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*, businesses(*)')
        .eq('line_user_id', lineUserId)
        .single()

      if (userData?.businesses?.[0]) {
        setBusiness(userData.businesses[0])
      }
    } catch (error) {
      console.error('Error loading user business:', error)
    }
  }

  const loadRecentScans = () => {
    const recent = localStorage.getItem('recentScans')
    if (recent) {
      setRecentScans(JSON.parse(recent).slice(0, 5))
    }
  }

  const saveToRecentScans = (scanData: any) => {
    const recent = JSON.parse(localStorage.getItem('recentScans') || '[]')
    const newScan = {
      ...scanData,
      scannedAt: new Date().toISOString()
    }
    const updated = [newScan, ...recent.slice(0, 4)]
    localStorage.setItem('recentScans', JSON.stringify(updated))
    setRecentScans(updated)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setScanning(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Camera access denied or not available')
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setScanning(false)
  }

  const scanWithLiffScanner = async () => {
    setLoading(true)
    try {
      if (window.liff.scanCode) {
        const result = await window.liff.scanCode()
        await handleBarcodeResult(result.value)
      } else {
        // Fallback to manual input
        const barcode = prompt('Enter barcode manually:')
        if (barcode) {
          await handleBarcodeResult(barcode)
        }
      }
    } catch (error) {
      console.error('Error scanning barcode:', error)
      alert('Scanning failed. Try manual entry.')
    } finally {
      setLoading(false)
    }
  }

  const handleBarcodeResult = async (barcode: string) => {
    if (!business) return

    setLoading(true)
    try {
      // Look up product by barcode
      const { data: productData } = await supabase
        .from('products')
        .select('*, inventory(*)')
        .eq('business_id', business.id)
        .eq('barcode', barcode)
        .single()

      if (productData) {
        setProduct(productData)
        saveToRecentScans({ barcode, productName: productData.name, action: 'found' })
      } else {
        // Product not found, offer to create
        const productName = prompt('Product not found. Enter product name to create:')
        if (productName) {
          await createNewProduct(barcode, productName)
        }
      }
    } catch (error) {
      console.error('Error looking up product:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewProduct = async (barcode: string, name: string) => {
    if (!business) return

    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id,
          name,
          barcode,
          unit: 'piece',
          cost_price: 0,
          selling_price: 0
        })
      })

      if (response.ok) {
        const newProduct = await response.json()
        setProduct(newProduct)
        saveToRecentScans({ barcode, productName: name, action: 'created' })
        alert('New product created successfully!')
      } else {
        throw new Error('Failed to create product')
      }
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id,
          product_id: product.id,
          transaction_type: transactionType,
          quantity: quantity,
          reason: `${transactionType.replace('_', ' ')} via LINE scanner`
        })
      })

      if (response.ok) {
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
        }, 2000)
      } else {
        throw new Error('Failed to record transaction')
      }
    } catch (error) {
      console.error('Error recording transaction:', error)
      alert('Failed to record transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 shadow-lg">
        <div className="px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 bg-white/20 rounded-xl text-white hover:bg-white/30 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <ScanLineIcon className="h-8 w-8" />
                Smart Scanner
              </h1>
              <p className="text-indigo-100 mt-1">Scan to update inventory instantly</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {success && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 flex items-center gap-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Transaction Recorded!</h3>
              <p className="text-green-700">Your inventory has been updated successfully.</p>
            </div>
          </div>
        )}

        {!product ? (
          <div className="space-y-6">
            {/* Scanning Options */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Choose Scanning Method</h2>
                <p className="text-gray-600 text-sm mt-1">Select the best option for your device</p>
              </div>

              <div className="p-6 space-y-4">
                {scanning ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-80 bg-black rounded-2xl object-cover"
                    />
                    <div className="absolute inset-0 border-4 border-white/30 rounded-2xl pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-48 h-32 border-4 border-red-500 rounded-lg bg-red-500/10">
                          <div className="absolute -top-2 -left-2 w-6 h-6 border-l-4 border-t-4 border-red-500"></div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 border-r-4 border-t-4 border-red-500"></div>
                          <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-4 border-b-4 border-red-500"></div>
                          <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-4 border-b-4 border-red-500"></div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={stopCamera}
                      className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg"
                    >
                      Stop Camera
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={scanWithLiffScanner}
                      disabled={loading}
                      className="flex items-center justify-center gap-4 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50"
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
                      className="flex items-center justify-center gap-4 p-6 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-2xl font-medium hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg"
                    >
                      <CameraIcon className="h-6 w-6" />
                      <div className="text-left">
                        <div className="font-semibold text-lg">Camera Scanner</div>
                        <div className="text-gray-300 text-sm">Use device camera (fallback)</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const barcode = prompt('Enter barcode manually:')
                        if (barcode) handleBarcodeResult(barcode)
                      }}
                      className="flex items-center justify-center gap-4 p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Scans</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {recentScans.map((scan, index) => (
                    <div key={index} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          scan.action === 'created' ? 'bg-blue-100 text-blue-600' :
                          scan.action === 'stock_in' ? 'bg-green-100 text-green-600' :
                          scan.action === 'stock_out' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <PackageIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{scan.productName}</p>
                          <p className="text-sm text-gray-500">{scan.barcode}</p>
                        </div>
                      </div>
                      <div className="text-right">
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Record Transaction</h2>
              <p className="text-gray-600 text-sm mt-1">Update inventory for scanned product</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Product Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
                    <PackageIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Barcode:</span> {product.barcode}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Current Stock:</span> {product.inventory?.[0]?.current_stock || 0} units
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Min. Level:</span> {product.inventory?.[0]?.min_stock_level || 0} units
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                            ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
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
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold text-gray-700 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="flex-1 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl py-3 px-4 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold text-gray-700 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
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
                  onClick={() => setProduct(null)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-4 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <XCircleIcon className="h-5 w-5" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}