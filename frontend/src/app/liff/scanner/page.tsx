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
import { resolveOwnerId } from '@/lib/userhelper';

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

  const initializeAndLoad = async () => {
    setLoading(true)
    try {
      const ownerId = await resolveOwnerId()
      if (!ownerId) { setLoading(false); return }

      // fetch 1st business owned by this user
      const { data: bizRows, error: bizErr } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', ownerId)
        .limit(1)

      if (bizErr) throw bizErr
      const biz = bizRows?.[0]
      if (!biz) { setBusiness(null); setLoading(false); return }

      setBusiness(biz)
    } catch (e) {
      console.error('Scanner init failed:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    initializeAndLoad()
    loadRecentScans()
  }, [])

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
      const { data: productData } = await supabase
        .from('products')
        .select('id, name, barcode, cost_price, selling_price, inventory(id, current_stock, min_stock_level)')
        .eq('business_id', business.id)
        .eq('barcode', barcode)
        .single()

      if (productData) {
        setProduct(productData)
        saveToRecentScans({ barcode, productName: productData.name, action: 'found' })
      } else {
        const productName = prompt('Product not found. Enter product name to create:')
        if (productName) await createNewProduct(barcode, productName)
      }
    } catch (e) {
      console.error('Error looking up product:', e)
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
    // TODO: Make it call backend
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
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage:
          'linear-gradient(to bottom right, var(--bg-from), var(--bg-via), var(--bg-to))',
      }}
    >
      {/* Animated background blobs, tinted by theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply blur-xl opacity-40 animate-blob"
          style={{ background: 'var(--accentA)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply blur-xl opacity-40 animate-blob animation-delay-2000"
          style={{ background: 'var(--accentB)' }}
        />
        <div
          className="absolute top-40 left-40 w-80 h-80 rounded-full mix-blend-multiply blur-xl opacity-40 animate-blob animation-delay-4000"
          style={{ background: 'var(--accentC)' }}
        />
      </div>
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative z-10 p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div
          className="relative overflow-hidden rounded-2xl border shadow-xl backdrop-blur-lg"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
        >
          {/* Accent bar */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-60"
            style={{ background: 'linear-gradient(90deg, transparent, var(--accentA), var(--accentB), transparent)' }}
          />
          <div className="p-4 sm:p-6 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="p-3 rounded-xl transition-colors"
                style={{
                  background: 'var(--card-border)',
                  color: 'var(--text)',
                  border: '1px solid var(--card-border)',
                }}
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                  Smart Scanner
                </h1>
                <p className="mt-1 text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
                  Scan to update inventory instantly
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <ScanLineIcon className="h-10 w-10" style={{ color: 'var(--accentA)' }} />
            </div>
          </div>
        </div>

        {success && (
          <div
            className="rounded-2xl border p-4 sm:p-6 backdrop-blur-xl flex items-center gap-4"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--accentA)' }}
          >
            <CheckCircleIcon className="h-8 w-8" style={{ color: 'var(--accentA)' }} />
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Transaction Recorded!</h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Your inventory has been updated successfully.
              </p>
            </div>
          </div>
        )}

        {!product ? (
          <div className="space-y-6">
            {/* Scanning Options */}
            <div
              className="rounded-2xl border shadow-sm backdrop-blur-xl"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            >
              <div className="px-4 py-4 sm:px-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                  Choose Scanning Method
                </h2>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Select the best option for your device</p>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {scanning ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-80 rounded-2xl object-cover"
                      style={{ backgroundColor: 'var(--muted)' }}
                    />
                    <div className="absolute inset-0 border-4 border-white/30 rounded-2xl pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-48 h-32 border-4 rounded-lg bg-red-500/10" style={{ borderColor: 'var(--accentB)' }}>
                          <div className="absolute -top-2 -left-2 w-6 h-6 border-l-4 border-t-4" style={{ borderColor: 'var(--accentB)' }}></div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 border-r-4 border-t-4" style={{ borderColor: 'var(--accentB)' }}></div>
                          <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-4 border-b-4" style={{ borderColor: 'var(--accentB)' }}></div>
                          <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-4 border-b-4" style={{ borderColor: 'var(--accentB)' }}></div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={stopCamera}
                      className="absolute bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl font-medium transition-colors shadow-lg"
                      style={{ background: 'var(--accentB)', color: 'white' }}
                    >
                      Stop Camera
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={scanWithLiffScanner}
                      disabled={loading}
                      className="flex items-center gap-4 p-4 rounded-xl font-medium transition-all shadow-md transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(to right, #6366f1, #4f46e5)',
                        color: 'white',
                      }}
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
                      className="flex items-center gap-4 p-4 rounded-xl font-medium transition-all shadow-md transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                      style={{
                        background: 'linear-gradient(to right, #6b7280, #4b5563)',
                        color: 'white',
                      }}
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
                      className="flex items-center gap-4 p-4 rounded-xl font-medium transition-all shadow-md transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                      style={{
                        background: 'linear-gradient(to right, #22c55e, #16a34a)',
                        color: 'white',
                      }}
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
              <div
                className="rounded-2xl border shadow-sm backdrop-blur-xl"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
              >
                <div className="px-4 py-4 sm:px-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Recent Scans</h3>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {recentScans.map((scan, index) => (
                    <div key={index} className="px-4 py-4 sm:px-6 flex items-center justify-between transition-colors hover:bg-gray-50/20">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${scan.action === 'created' ? 'bg-blue-100/50 text-blue-600' :
                          scan.action === 'stock_in' ? 'bg-green-100/50 text-green-600' :
                            scan.action === 'stock_out' ? 'bg-red-100/50 text-red-600' :
                              'bg-gray-100/50 text-gray-600'
                          }`}>
                          <PackageIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{scan.productName}</p>
                          <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>{scan.barcode}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium capitalize" style={{ color: 'var(--text)' }}>
                          {scan.action.replace('_', ' ')}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
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
          <div
            className="rounded-2xl border shadow-sm backdrop-blur-xl"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
          >
            <div className="px-4 py-4 sm:px-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Record Transaction</h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Update inventory for scanned product</p>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Product Info */}
              <div
                className="p-4 sm:p-6 rounded-2xl border"
                style={{ background: 'var(--bg-from)', borderColor: 'var(--card-border)' }}
              >
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--accentA)', color: 'white' }}
                  >
                    <PackageIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
                      {product.name}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        <span className="font-medium" style={{ color: 'var(--text)' }}>Barcode:</span> {product.barcode}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        <span className="font-medium" style={{ color: 'var(--text)' }}>Current Stock:</span> {product.inventory?.[0]?.current_stock || 0} units
                      </p>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        <span className="font-medium" style={{ color: 'var(--text)' }}>Min. Level:</span> {product.inventory?.[0]?.min_stock_level || 0} units
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
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
                    const baseStyle = { color: 'var(--text)', background: 'var(--card-bg)', borderColor: 'var(--card-border)' };
                    const selectedStyle = {
                      background: `var(--${type.color}-100/50)`,
                      color: `var(--${type.color}-600)`,
                      borderColor: `var(--${type.color}-600)`
                    };
                    return (
                      <button
                        key={type.value}
                        onClick={() => setTransactionType(type.value)}
                        className={`p-4 rounded-xl border-2 transition-all`}
                        style={isSelected ? selectedStyle : baseStyle}
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
                <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 rounded-xl font-bold transition-colors"
                    style={{ background: 'var(--card-border)', color: 'var(--text)' }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="flex-1 text-center text-2xl font-bold rounded-xl py-3 px-4 focus:outline-none"
                    style={{ background: 'var(--card-bg)', color: 'var(--text)', border: '2px solid var(--card-border)' }}
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 rounded-xl font-bold transition-colors"
                    style={{ background: 'var(--card-border)', color: 'var(--text)' }}
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
                  onClick={() => setProduct(null)}
                  className="flex-1 text-white py-4 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  style={{ background: 'var(--muted)', color: 'var(--text)' }}
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