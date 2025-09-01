// frontend/app/liff/scanner/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { resolveOwnerId } from '@/lib/userhelper'
import {
  ScanLineIcon, CameraIcon, KeyboardIcon, CheckCircleIcon, XCircleIcon, PackageIcon,
  TrendingUpIcon, TrendingDownIcon, SettingsIcon, ArrowLeftIcon
} from 'lucide-react'

declare global {
  interface Window {
    liff: any
    BarcodeDetector?: any
  }
}

export default function BarcodeScanner() {
  const [scanning, setScanning] = useState(false)
  const [product, setProduct] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [transactionType, setTransactionType] = useState<'stock_in'|'stock_out'|'adjustment'>('stock_in')
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [recentScans, setRecentScans] = useState<any[]>([])
  const [scanResult, setScanResult] = useState('')
  const [method, setMethod] = useState<'none'|'native'|'zxing'>('none')
  const [cameraError, setCameraError] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const zxingStopRef = useRef<null | (() => void)>(null)
  const foundOnceRef = useRef(false)

  // Load the current user's business (first one)
  useEffect(() => {
    (async () => {
      const ownerId = await resolveOwnerId()
      if (!ownerId) return
      const { data, error } = await supabase
        .from('businesses')
        .select('id,name')
        .eq('owner_id', ownerId)
        .limit(1)
      if (error) {
        console.error('Load business error:', error)
        return
      }
      setBusiness(data?.[0] || null)
    })()

    // seed recent scans (optional)
    setRecentScans(prev => prev.length ? prev : [{
      barcode: '1234567890123', productName: 'Demo Item', action: 'stock_in', quantity: 1,
      scannedAt: new Date(Date.now() - 120000).toISOString()
    }])

    return () => stopAll()
  }, [])

  const saveToRecentScans = (scanData: any) => {
    const newScan = { ...scanData, scannedAt: new Date().toISOString() }
    setRecentScans(prev => [newScan, ...prev.slice(0,4)])
  }

  // ---- Camera start/stop
  const startCamera = async () => {
    if (!business) {
      alert('No business found for this user.')
      return
    }
    setCameraError('')
    foundOnceRef.current = false
    try {
      stopAll()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      streamRef.current = stream
      const v = videoRef.current
      if (v) {
        v.srcObject = stream
        v.setAttribute('playsinline', 'true')
        v.muted = true
        await v.play()
      }
      setScanning(true)

      if (window.BarcodeDetector) {
        startNativeLoop()
      } else {
        await startZXing()
      }
    } catch (e) {
      console.error(e)
      setCameraError('Camera access denied or unavailable.')
      stopAll()
    }
  }

  const stopAll = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (zxingStopRef.current) { zxingStopRef.current(); zxingStopRef.current = null }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    const v = videoRef.current
    if (v) v.srcObject = null
    setMethod('none')
    setScanning(false)
  }

  // ---- Decoders (barcode only)
  const startNativeLoop = () => {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_93','code_39','itf']
      })
      setMethod('native')

      let last = 0
      const loop = async (ts: number) => {
        if (!scanning || !videoRef.current) return
        if (ts - last < 100) { rafRef.current = requestAnimationFrame(loop); return } // ~10fps
        last = ts
        try {
          // draw to canvas and detect from bitmap (more consistent)
          const v = videoRef.current
          const w = v.videoWidth, h = v.videoHeight
          if (w && h) {
            const c = canvasRef.current!
            if (c.width !== w) { c.width = w; c.height = h }
            const ctx = c.getContext('2d')!
            ctx.drawImage(v, 0, 0, w, h)
            const bmp = await createImageBitmap(c)
            const results = await detector.detect(bmp)
            if (results?.length && !foundOnceRef.current) {
              const value = results[0]?.rawValue || ''
              if (value) {
                foundOnceRef.current = true
                stopAll()
                await handleBarcodeResult(value)
                return
              }
            }
          }
        } catch (err) {
          console.warn('Native failed → ZXing', err)
          startZXing().catch(() => setCameraError('Scanner not supported. Use Manual Entry.'))
          return
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch (err) {
      console.warn('BarcodeDetector not usable → ZXing', err)
      startZXing().catch(() => setCameraError('Scanner not supported. Use Manual Entry.'))
    }
  }

  const startZXing = async () => {
    setMethod('zxing')
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    if (!videoRef.current) throw new Error('no video')
    const reader = new BrowserMultiFormatReader()
    const controls = reader.decodeFromVideoDevice(undefined, videoRef.current, async (result, err, _controls) => {
      if (result && !foundOnceRef.current) {
        const fmt = (result as any).getBarcodeFormat?.()
        if (fmt && String(fmt).toUpperCase().includes('QR')) return // ignore QR entirely
        const value = (result as any).getText?.() || ''
        if (value) {
          foundOnceRef.current = true
          _controls.stop()
          zxingStopRef.current = null
          stopAll()
          await handleBarcodeResult(value)
        }
      }
    })
    zxingStopRef.current = async () => (await controls).stop()
  }

  // ---- LIFF (optional)
  const scanWithLiffScanner = async () => {
    if (!business) {
      alert('No business found for this user.')
      return
    }
    setLoading(true)
    try {
      if (window?.liff?.scanCode) {
        const res = await window.liff.scanCode()
        await handleBarcodeResult(res.value)
      } else {
        const barcode = prompt('Enter barcode manually:')
        if (barcode?.trim()) await handleBarcodeResult(barcode.trim())
      }
    } finally {
      setLoading(false)
    }
  }

  // ---- Supabase: lookup product by barcode for this business
  const fetchProductWithInventory = async (barcode: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,barcode,cost_price,selling_price,unit, inventory(id,current_stock,min_stock_level)')
      .eq('business_id', business.id)
      .eq('barcode', barcode)
      .maybeSingle()
    if (error) throw error
    return data
  }

  // ---- Supabase: create product and initial inventory (your pattern)
  const createProductInSupabase = async (barcode: string, name: string) => {
    // Feel free to replace defaults with your own UI/inputs
    const unit = 'piece'
    const cost_price = 0
    const selling_price = 0

    const { data: inserted, error } = await supabase
      .from('products')
      .insert([{ business_id: business.id, name, barcode, cost_price, selling_price, unit }])
      .select()
      .single()
    if (error) throw error

    // initial inventory row
    const { error: invErr } = await supabase
      .from('inventory')
      .insert([{ business_id: business.id, product_id: inserted.id, current_stock: 0, min_stock_level: 0 }])
    if (invErr) throw invErr

    // fetch with inventory to show in UI
    const reloaded = await fetchProductWithInventory(barcode)
    return reloaded || { ...inserted, inventory: [{ current_stock: 0, min_stock_level: 0 }] }
  }

  // ---- Handle a scanned barcode
  const handleBarcodeResult = async (barcode: string) => {
    if (!business) return
    setLoading(true)
    setScanResult(barcode)
    try {
      const existing = await fetchProductWithInventory(barcode)
      if (existing) {
        setProduct(existing)
        saveToRecentScans({ barcode, productName: existing.name, action: 'found' })
      } else {
        const name = prompt(`Product ${barcode} not found.\nEnter product name to create:`)
        if (!name || !name.trim()) return
        try {
          const created = await createProductInSupabase(barcode, name.trim())
          setProduct(created)
          saveToRecentScans({ barcode, productName: created.name, action: 'created' })
          alert('Product created.')
        } catch (e: any) {
          console.error('Create product error:', e?.message || e)
          alert('Failed to create product')
        }
      }
    } catch (e: any) {
      console.error('Lookup error:', e?.message || e)
      alert('Lookup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ---- (Optional) Record transaction to your backend API; unchanged logic
  const recordTransaction = async () => {
    if (!product || !business) return
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/inventory/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          product_id: product.id,
          transaction_type: transactionType,
          quantity,
          reason: `${transactionType.replace('_',' ')} via scanner`
        })
      })
      if (!res.ok) throw new Error('Failed to record transaction')
      setSuccess(true)
      saveToRecentScans({ barcode: product.barcode, productName: product.name, action: transactionType, quantity })
      setTimeout(() => { setProduct(null); setQuantity(1); setSuccess(false); setScanResult('') }, 1500)
    } catch (e) {
      console.error('Transaction error:', e)
      alert('Failed to record transaction')
    } finally {
      setLoading(false)
    }
  }

  // ---- UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
      {/* hidden canvas for native path */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative z-10 p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1" />
          <div className="p-4 sm:p-6 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => window.history.back()} className="p-3 rounded-xl bg-gray-100 border border-gray-200">
                <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Smart Scanner</h1>
                <p className="mt-1 text-sm sm:text-base text-gray-600">Barcode-only, in-page camera</p>
              </div>
            </div>
            <ScanLineIcon className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        {/* Scan result banner */}
        {scanResult && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-green-200 p-4 sm:p-6 flex items-center gap-4">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="font-semibold text-gray-900">Barcode Detected</h3>
              <p className="text-sm text-gray-600">Scanned: {scanResult} {method !== 'none' && <em className="ml-2 text-xs text-gray-500">via {method}</em>}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-green-200 p-4 sm:p-6 flex items-center gap-4">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="font-semibold text-gray-900">Transaction Recorded!</h3>
              <p className="text-sm text-gray-600">Your inventory has been updated successfully.</p>
            </div>
          </div>
        )}

        {!product ? (
          <div className="space-y-6">
            {/* Scanner card */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-sm">
              <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Scan a Barcode</h2>
                <p className="text-sm text-gray-600">Stays inside this page</p>
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
                    {/* overlay */}
                    <div className="absolute inset-0 border-4 border-white/30 rounded-2xl pointer-events-none">
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="w-64 h-28 border-4 border-blue-500 rounded bg-blue-500/10" />
                      </div>
                    </div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                      <button onClick={stopAll} className="px-6 py-3 rounded-xl font-medium shadow-lg bg-red-500 hover:bg-red-600 text-white">
                        Stop Camera {method !== 'none' ? `(${method})` : ''}
                      </button>
                    </div>

                    {cameraError && (
                      <div className="absolute top-3 right-3 px-3 py-2 rounded-md text-sm bg-red-50 text-red-700 border border-red-200">
                        {cameraError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={startCamera}
                      className="flex items-center gap-4 p-4 rounded-xl font-medium shadow-md transform hover:scale-[1.02] hover:shadow-lg bg-gradient-to-r from-gray-600 to-gray-700 text-white"
                    >
                      <CameraIcon className="h-6 w-6" />
                      <div className="text-left">
                        <div className="font-semibold text-lg">Camera Scanner</div>
                        <div className="text-gray-200 text-sm">Live barcode decoding</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const barcode = prompt('Enter barcode manually:')
                        if (barcode?.trim()) handleBarcodeResult(barcode.trim())
                      }}
                      className="flex items-center gap-4 p-4 rounded-xl font-medium shadow-md transform hover:scale-[1.02] hover:shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white"
                    >
                      <KeyboardIcon className="h-6 w-6" />
                      <div className="text-left">
                        <div className="font-semibold text-lg">Manual Entry</div>
                        <div className="text-green-100 text-sm">Type barcode number</div>
                      </div>
                    </button>

                    <button
                      onClick={scanWithLiffScanner}
                      className="flex items-center gap-4 p-4 rounded-xl font-medium shadow-md transform hover:scale-[1.02] hover:shadow-lg bg-gradient-to-r from-indigo-500 to-blue-600 text-white"
                    >
                      <ScanLineIcon className="h-6 w-6" />
                      <div className="text-left">
                        <div className="font-semibold text-lg">LINE Scanner (Optional)</div>
                        <div className="text-indigo-200 text-sm">Use LINE’s built-in camera</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent scans */}
            {recentScans.length > 0 && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-sm">
                <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Scans</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {recentScans.map((scan, index) => (
                    <div key={index} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          scan.action === 'created' ? 'bg-blue-100 text-blue-600' :
                          scan.action === 'stock_in' ? 'bg-green-100 text-green-600' :
                          scan.action === 'stock_out' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <PackageIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium truncate text-gray-900">{scan.productName}</p>
                          <p className="text-sm truncate text-gray-500">{scan.barcode}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium capitalize text-gray-900">{String(scan.action).replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500">{new Date(scan.scannedAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Record transaction
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-sm">
            <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Record Transaction</h2>
              <p className="text-sm text-gray-600">Update inventory for scanned product</p>
            </div>
            <div className="p-4 sm:p-6 space-y-6">
              <div className="p-4 sm:p-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-500 text-white">
                    <PackageIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                      <p><span className="font-medium text-gray-900">Barcode:</span> {product.barcode}</p>
                      <p><span className="font-medium text-gray-900">Current Stock:</span> {product.inventory?.[0]?.current_stock ?? 0} units</p>
                      <p><span className="font-medium text-gray-900">Min. Level:</span> {product.inventory?.[0]?.min_stock_level ?? 0} units</p>
                      <p><span className="font-medium text-gray-900">Price:</span> ${product.selling_price ?? 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-900">Transaction Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'stock_in', label: 'Stock In', icon: TrendingUpIcon, classes: 'bg-green-100 border-green-500 text-green-700' },
                    { value: 'stock_out', label: 'Stock Out', icon: TrendingDownIcon, classes: 'bg-red-100 border-red-500 text-red-700' },
                    { value: 'adjustment', label: 'Adjustment', icon: SettingsIcon, classes: 'bg-blue-100 border-blue-500 text-blue-700' },
                  ].map(t => {
                    const Icon = t.icon
                    const sel = transactionType === t.value
                    return (
                      <button
                        key={t.value}
                        onClick={() => setTransactionType(t.value as any)}
                        className={`p-4 rounded-xl border-2 transition-all ${sel ? t.classes : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                      >
                        <Icon className="h-6 w-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">{t.label}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Qty */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-900">Quantity</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 rounded-xl font-bold bg-gray-200 hover:bg-gray-300 text-gray-700">-</button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    className="flex-1 text-center text-2xl font-bold rounded-xl py-3 px-4 bg-white border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-gray-900"
                  />
                  <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 rounded-xl font-bold bg-gray-200 hover:bg-gray-300 text-gray-700">+</button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={recordTransaction}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <CheckCircleIcon className="h-5 w-5" />}
                  Record Transaction
                </button>
                <button onClick={() => { setProduct(null); setScanResult('') }} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-4 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                  <XCircleIcon className="h-5 w-5" /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/20 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Inserts into <code>products</code> then creates an <code>inventory</code> row if not found.</p>
            <p>• Barcode-only: EAN/UPC/Code128/39/93/ITF. QR is ignored.</p>
            <p>• HTTPS required for camera (localhost is fine in dev).</p>
          </div>
          {cameraError && <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg p-2">{cameraError}</div>}
        </div>
      </div>
    </div>
  )
}
