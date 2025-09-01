'use client'
import { useEffect, useRef, useState } from 'react'
import {
  ScanLineIcon, CameraIcon, KeyboardIcon, CheckCircleIcon, XCircleIcon, PackageIcon,
  TrendingUpIcon, TrendingDownIcon, SettingsIcon, ArrowLeftIcon
} from 'lucide-react'

// --- mock data (unchanged) ---
const mockProducts = [
  { id: 1, name: 'Sample Product A', barcode: '1234567890123', cost_price: 10.5, selling_price: 15, inventory: [{ current_stock: 25, min_stock_level: 5 }] },
  { id: 2, name: 'Sample Product B', barcode: '9876543210987', cost_price: 8.25, selling_price: 12, inventory: [{ current_stock: 12, min_stock_level: 3 }] },
]

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
  const [business] = useState({ id: 1, name: 'Demo Business' }) // mock
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

  // demo: seed a recent scan
  useEffect(() => {
    setRecentScans([
      { barcode: '1234567890123', productName: 'Sample Product A', action: 'stock_in', quantity: 5, scannedAt: new Date(Date.now()-300000).toISOString() },
    ])
    return () => stopAll()
  }, [])

  const saveToRecentScans = (scanData: any) => {
    const newScan = { ...scanData, scannedAt: new Date().toISOString() }
    setRecentScans(prev => [newScan, ...prev.slice(0,4)])
  }

  // ---------- camera ----------
  const startCamera = async () => {
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
        v.setAttribute('playsinline', 'true') // iOS inline
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

  // ---------- decoders (barcode only) ----------
  // 1) Native BarcodeDetector with only 1D formats
  const startNativeLoop = () => {
    try {
      const formats = [
        'ean_13','ean_8','upc_a','upc_e',
        'code_128','code_93','code_39','itf'
      ] // no QR here
      const detector = new (window as any).BarcodeDetector({ formats })
      setMethod('native')

      let last = 0
      const loop = async (ts: number) => {
        if (!scanning || !videoRef.current) return
        if (ts - last < 100) { rafRef.current = requestAnimationFrame(loop); return } // ~10fps
        last = ts
        try {
          // draw to canvas -> detect on ImageBitmap (reliable across UA)
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

  // 2) ZXing fallback; ignore QR_CODE results
  const startZXing = async () => {
    setMethod('zxing')
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    // (We’ll filter QR below; hints optional)
    if (!videoRef.current) throw new Error('no video')
    const reader = new BrowserMultiFormatReader()
    const controls = reader.decodeFromVideoDevice(undefined, videoRef.current, async (result, err, _controls) => {
      // ZXing calls back on every decode; keep running unless we accept a result
      if (result && !foundOnceRef.current) {
        const fmt = (result as any).getBarcodeFormat?.()
        // If library returns QR_CODE, ignore it to stay "barcode-only"
        if (fmt && String(fmt).toUpperCase().includes('QR')) return
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

  // ---------- LIFF (optional) ----------
  const scanWithLiffScanner = async () => {
    setLoading(true)
    try {
      if (window?.liff?.scanCode) {
        const result = await window.liff.scanCode()
        // If LIFF returns a QR string, you can decide to ignore;
        // here we accept whatever comes from LIFF (or add your own filter).
        await handleBarcodeResult(result.value)
      } else {
        const barcode = prompt('Enter barcode manually:')
        if (barcode?.trim()) handleBarcodeResult(barcode.trim())
      }
    } catch (e) {
      const barcode = prompt('Enter barcode manually:')
      if (barcode?.trim()) handleBarcodeResult(barcode.trim())
    } finally {
      setLoading(false)
    }
  }

  // ---------- business logic (mock) ----------
  const handleBarcodeResult = async (barcode: string) => {
    if (!business) return
    setLoading(true)
    setScanResult(barcode)
    try {
      const found = mockProducts.find(p => p.barcode === barcode)
      if (found) {
        setProduct(found)
        saveToRecentScans({ barcode, productName: found.name, action: 'found' })
      } else {
        const name = prompt(`Product ${barcode} not found. Enter name to create:`)
        if (name?.trim()) await createNewProduct(barcode, name.trim())
      }
    } finally {
      setLoading(false)
    }
  }

  const createNewProduct = async (barcode: string, name: string) => {
    setLoading(true)
    try {
      const newProduct = { id: Date.now(), name, barcode, cost_price: 0, selling_price: 0, inventory: [{ current_stock: 0, min_stock_level: 0 }] }
      mockProducts.push(newProduct as any)
      setProduct(newProduct)
      saveToRecentScans({ barcode, productName: name, action: 'created' })
      alert('New product created.')
    } finally {
      setLoading(false)
    }
  }

  const recordTransaction = async () => {
    if (!product || !business) return
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 700)) // mock
      setSuccess(true)
      saveToRecentScans({ barcode: product.barcode, productName: product.name, action: transactionType, quantity })
      setTimeout(() => { setProduct(null); setQuantity(1); setSuccess(false); setScanResult('') }, 1500)
    } finally {
      setLoading(false)
    }
  }

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
      {/* hidden canvas for native path */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative z-10 p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* header */}
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

        {/* banner */}
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
            {/* scanner card */}
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
                      <button
                        onClick={stopAll}
                        className="px-6 py-3 rounded-xl font-medium shadow-lg bg-red-500 hover:bg-red-600 text-white"
                      >
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
                      onClick={async () => {
                        // optional: LIFF scanner if available (you can remove this button entirely)
                        try {
                          if (window?.liff?.scanCode) {
                            const res = await window.liff.scanCode()
                            await handleBarcodeResult(res.value)
                          } else {
                            alert('LIFF scanner not available.')
                          }
                        } catch {}
                      }}
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

            {/* recent scans */}
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
          // record transaction
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
                      <p><span className="font-medium text-gray-900">Current Stock:</span> {product.inventory?.[0]?.current_stock || 0} units</p>
                      <p><span className="font-medium text-gray-900">Min. Level:</span> {product.inventory?.[0]?.min_stock_level || 0} units</p>
                      <p><span className="font-medium text-gray-900">Price:</span> ${product.selling_price || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

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

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={recordTransaction}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <CheckCircleIcon className="h-5 w-5" />}
                  Record Transaction
                </button>
                <button onClick={() => { setProduct(null); setScanResult('') }} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2">
                  <XCircleIcon className="h-5 w-5" /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* notes */}
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/20 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• **Barcode-only**: EAN-13/8, UPC-A/E, Code128/39/93, ITF.</p>
            <p>• Uses Native `BarcodeDetector` when available; otherwise **ZXing**.</p>
            <p>• HTTPS required on real devices (localhost is okay for dev).</p>
            <p>• iOS: `playsInline` + `muted` prevents auto-fullscreen camera.</p>
          </div>
          {cameraError && <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg p-2">{cameraError}</div>}
        </div>
      </div>
    </div>
  )
}
