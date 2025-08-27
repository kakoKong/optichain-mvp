// frontend/app/liff/scanner/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

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
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    initializeLiff()
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
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
    }
  }

  const handleBarcodeResult = async (barcode: string) => {
    if (!business) return

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
      } else {
        // Product not found, offer to create
        const productName = prompt('Product not found. Enter product name to create:')
        if (productName) {
          await createNewProduct(barcode, productName)
        }
      }
    } catch (error) {
      console.error('Error looking up product:', error)
    }
  }

  const createNewProduct = async (barcode: string, name: string) => {
    if (!business) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // We'll add auth headers here later
        },
        body: JSON.stringify({
          business_id: business.id,
          name,
          barcode,
          unit: 'piece'
        })
      })

      if (response.ok) {
        const newProduct = await response.json()
        setProduct(newProduct)
        alert('New product created!')
      } else {
        throw new Error('Failed to create product')
      }
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Failed to create product')
    }
  }

  const recordTransaction = async () => {
    if (!product || !business) return

    try {
      const currentStock = product.inventory?.[0]?.current_stock || 0

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // We'll add auth headers here later
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
        alert('Transaction recorded successfully!')
        setProduct(null)
        setQuantity(1)
      } else {
        throw new Error('Failed to record transaction')
      }
    } catch (error) {
      console.error('Error recording transaction:', error)
      alert('Failed to record transaction')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">📱 Barcode Scanner</h1>
        <p className="text-blue-100">Scan products to manage inventory</p>
      </div>

      <div className="p-4 space-y-4">
        {!product ? (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-4">Scan Product</h2>

            <div className="space-y-4">
              {scanning ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 bg-black rounded-lg"
                  />
                  <div className="absolute inset-0 border-2 border-red-500 rounded-lg pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-red-500"></div>
                  </div>
                  <button
                    onClick={stopCamera}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg"
                  >
                    Stop Camera
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={scanWithLiffScanner}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium"
                  >
                    📷 Scan Barcode (LINE Scanner)
                  </button>
                  <button
                    onClick={startCamera}
                    className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg font-medium"
                  >
                    📹 Use Camera (Fallback)
                  </button>
                  <button
                    onClick={() => {
                      const barcode = prompt('Enter barcode manually:')
                      if (barcode) handleBarcodeResult(barcode)
                    }}
                    className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-medium"
                  >
                    ⌨️ Manual Entry
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-4">Record Transaction</h2>

            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-gray-600">Barcode: {product.barcode}</p>
                <p className="text-sm text-gray-600">
                  Current Stock: {product.inventory?.[0]?.current_stock || 0}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Type
                </label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="stock_in">Stock In</option>
                  <option value="stock_out">Stock Out</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={recordTransaction}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-medium"
                >
                  Record Transaction
                </button>
                <button
                  onClick={() => setProduct(null)}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-medium"
                >
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
