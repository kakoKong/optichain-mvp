// frontend/app/liff/scanner/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  ScanLineIcon, CameraIcon, KeyboardIcon, CheckCircleIcon, PackageIcon,
  TrendingUpIcon, TrendingDownIcon, SettingsIcon, ArrowLeftIcon,
} from 'lucide-react'

// Types for better type safety
interface Product {
  id: string
  name: string
  barcode: string
  cost_price: number
  selling_price: number
  unit: string
  inventory?: Array<{
    id: string
    current_stock: number
    min_stock_level: number
  }>
}

interface Business {
  id: string
  name: string
}

interface ScanResult {
  barcode: string
  productName: string
  action: string
  quantity?: number
  scannedAt: string
}

interface TransactionForm {
  type: 'stock_in' | 'stock_out' | 'adjustment'
  quantity: number
}

// Scanner configuration for better accuracy
const SCANNER_CONFIG = {
  camera: {
    facingMode: 'environment' as const,
    width: { ideal: 1920, min: 1280 },
    height: { ideal: 1080, min: 720 },
    frameRate: { ideal: 30, min: 15 }
  },
  barcodeFormats: [
    'ean_13', 'ean_8', 'upc_a', 'upc_e', 
    'code_128', 'code_93', 'code_39', 'itf',
    'codabar', 'data_matrix', 'pdf_417'
  ],
  scanInterval: 100, // ms between scans
  confidenceThreshold: 0.8, // minimum confidence for detection
  maxRetries: 3
}

export default function BarcodeScanner() {
  // State management
  const { user, loading: authLoading } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [transactionForm, setTransactionForm] = useState<TransactionForm>({
    type: 'stock_in',
    quantity: 1
  })
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [recentScans, setRecentScans] = useState<ScanResult[]>([])
  const [scanResult, setScanResult] = useState('')
  const [scanMethod, setScanMethod] = useState<'none' | 'native' | 'zxing' | 'quagga'>('none')
  const [cameraError, setCameraError] = useState('')
  const [scanStats, setScanStats] = useState({
    attempts: 0,
    successfulScans: 0,
    failedScans: 0
  })
  const [debugMode, setDebugMode] = useState(false)
  const [videoKey, setVideoKey] = useState(0)

  // Refs for camera and scanning
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const zxingReaderRef = useRef<any>(null)
  const quaggaRef = useRef<any>(null)
  const foundBarcodeRef = useRef<string | null>(null)

  // Initialize component
  useEffect(() => {
    if (authLoading || !user) return
    initializeScanner()
    return () => {
      cleanupScanner()
    }
  }, [authLoading, user])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupScanner()
    }
  }, [])

  // Helper function to resolve app-level user ID
  const resolveAppUserId = async (u: { id: string; source: 'line' | 'dev'; databaseUid?: string }) => {
    // For dev users: use the databaseUid directly
    if (u.source === 'dev' && u.databaseUid) {
      console.log('[resolveAppUserId] Dev user detected, using databaseUid:', u.databaseUid)
      return u.databaseUid
    }

    // For LINE: map liff profile id to your app user (public.users.id)
    // NOTE: this expects `public.users.line_user_id` to exist.
    if (u.source === 'line') {
      console.log('[resolveAppUserId] LINE user detected, mapping from line_user_id:', u.id)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('line_user_id', u.id)
        .single()

      if (error) {
        console.warn('Could not map LINE user to app user:', error)
        return null
      }
      return data?.id ?? null
    }

    console.warn('[resolveAppUserId] Unknown user source:', u.source)
    return null
  }

  // Helper function to fetch business for user (same as dashboard)
  const fetchBusinessForUser = async (appUserId: string) => {
    // Try owner first
    const { data: owned, error: ownedErr } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', appUserId)
      .limit(1)

    if (ownedErr) throw ownedErr
    if (owned && owned.length > 0) {
      return owned[0]
    }

    // Fallback: first business where the user is a member
    const { data: membership, error: memErr } = await supabase
      .from('business_members')
      .select(`
        business:business_id (
          id, name
        )
      `)
      .eq('user_id', appUserId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (memErr) throw memErr
    if (!membership?.business) return null

    return membership.business
  }

  const initializeScanner = async () => {
    try {
      if (!user) {
        console.error('No user logged in')
        return
      }

      // 1) Resolve app-level user id used in your public schema
      const appUserId = await resolveAppUserId(user)
      if (!appUserId) {
        console.warn('Could not resolve app user id')
        return
      }

      // 2) Fetch business for this user (owner first, else member)
      const businessData = await fetchBusinessForUser(appUserId)
      if (!businessData) {
        console.error('No business found for this user')
        return
      }

      setBusiness(Array.isArray(businessData) ? businessData[0] : businessData)
      loadRecentScans()
    } catch (error) {
      console.error('Initialization error:', error)
    }
  }

  const loadRecentScans = () => {
    try {
      const stored = localStorage.getItem('recentScans')
      if (stored) {
        setRecentScans(JSON.parse(stored))
      } else {
        setRecentScans([{
          barcode: '1234567890123',
          productName: 'Demo Item',
          action: 'stock_in',
          quantity: 1,
          scannedAt: new Date(Date.now() - 120000).toISOString()
        }])
      }
    } catch (error) {
      console.error('Failed to load recent scans:', error)
    }
  }

  const saveRecentScan = (scanData: Omit<ScanResult, 'scannedAt'>) => {
    const newScan: ScanResult = {
      ...scanData,
      scannedAt: new Date().toISOString()
    }
    
    setRecentScans(prev => {
      const updated = [newScan, ...prev.slice(0, 9)]
      localStorage.setItem('recentScans', JSON.stringify(updated))
      return updated
    })
  }

  // Camera management
  const startCamera = async () => {
    if (!business) {
      alert('No business found for this user.')
      return
    }

    setCameraError('')
    setScanStats(prev => ({ ...prev, attempts: 0 }))
    foundBarcodeRef.current = null

    try {
      // Ensure complete cleanup before starting
      console.log('Starting camera initialization...')
      await cleanupScanner()
      
      // Additional wait to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100))

      const stream = await navigator.mediaDevices.getUserMedia({
        video: SCANNER_CONFIG.camera,
        audio: false
      })

      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.muted = true
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video load timeout')), 5000)
          
          const onLoadedMetadata = () => {
            clearTimeout(timeout)
            videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata)
            resolve(true)
          }
          
          videoRef.current?.addEventListener('loadedmetadata', onLoadedMetadata)
          
          videoRef.current?.play().catch(reject)
        })
      }

      setScanning(true)
      
      // Wait for video element to be ready before initializing scanners
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verify video element is ready
      if (!videoRef.current) {
        console.error('Video element not ready after delay')
        setCameraError('Video element not ready. Please try again.')
        await cleanupScanner()
        return
      }
      
      // Additional checks for video element
      console.log('Video element details:', {
        readyState: videoRef.current.readyState,
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
        srcObject: !!videoRef.current.srcObject
      })
      
      // Try native scanner first, fallback to ZXing, then Quagga
      if ((window as any).BarcodeDetector) {
        await startNativeScanner()
      } else {
        await startZXingScanner()
      }
    } catch (error) {
      console.error('Camera access failed:', error)
      setCameraError('Camera access denied or unavailable.')
      await cleanupScanner()
    }
  }

  const cleanupScanner = async () => {
    console.log('Cleaning up scanner...')
    // Clear any active scan intervals
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    // Stop and cleanup ZXing scanner
    if (zxingReaderRef.current) {
      try {
        if (typeof zxingReaderRef.current.stop === 'function') {
          zxingReaderRef.current.stop()
        }
        zxingReaderRef.current = null
      } catch (error) {
        console.warn('ZXing cleanup error:', error)
      }
    }

    // Stop and cleanup Quagga scanner
    if (quaggaRef.current) {
      try {
        if (typeof quaggaRef.current.stop === 'function') {
          quaggaRef.current.stop()
        }
        quaggaRef.current = null
      } catch (error) {
        console.warn('Quagga cleanup error:', error)
      }
    }

    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        track.enabled = false
      })
      streamRef.current = null
    }

    // Reset video element completely
    if (videoRef.current) {
      try {
        videoRef.current.pause()
        videoRef.current.srcObject = null
        videoRef.current.removeAttribute('src')
        videoRef.current.load()
        // Force video element to reset
        videoRef.current.currentTime = 0
        videoRef.current.playbackRate = 1
      } catch (error) {
        console.warn('Video cleanup error:', error)
      }
    }

    // Reset canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }

    // Reset scanner state
    setScanMethod('none')
    setScanning(false)
    foundBarcodeRef.current = null

    // Increment video key to force re-render
    setVideoKey(prev => prev + 1)

    // Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 300))
    console.log('Scanner cleanup complete')
  }

  // Native BarcodeDetector scanner (most accurate)
  const startNativeScanner = async () => {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: SCANNER_CONFIG.barcodeFormats
      })
      
      setScanMethod('native')
      console.log('Using native BarcodeDetector')

      const scanFrame = async () => {
        if (!scanning || !videoRef.current || foundBarcodeRef.current) return

        try {
          const video = videoRef.current
          const { videoWidth: width, videoHeight: height } = video

          if (width && height) {
            const canvas = canvasRef.current!
            if (canvas.width !== width) {
              canvas.width = width
              canvas.height = height
            }

            const ctx = canvas.getContext('2d')!
            ctx.drawImage(video, 0, 0, width, height)

            const imageBitmap = await createImageBitmap(canvas)
            
            try {
              const results = await detector.detect(imageBitmap)
              
              if (results?.length > 0) {
                const bestResult = results[0]
                const confidence = bestResult.confidence || 1.0
                
                if (confidence >= SCANNER_CONFIG.confidenceThreshold) {
                  const barcode = bestResult.rawValue
                  if (barcode && barcode.length >= 8) {
                    console.log('Native scanner detected:', barcode, 'confidence:', confidence)
                    foundBarcodeRef.current = barcode
                    await handleBarcodeResult(barcode)
                    return
                  }
                }
              }
            } finally {
              if (imageBitmap.close) {
                imageBitmap.close()
              }
            }
          }
        } catch (error) {
          console.warn('Native scanner frame error:', error)
        }

        if (scanning && !foundBarcodeRef.current) {
          scanIntervalRef.current = setTimeout(scanFrame, SCANNER_CONFIG.scanInterval)
        }
      }

      scanFrame()
    } catch (error) {
      console.warn('Native scanner failed, falling back to ZXing:', error)
      await startZXingScanner()
    }
  }

  // ZXing scanner (fallback)
  const startZXingScanner = async () => {
    try {
      setScanMethod('zxing')
      console.log('Using ZXing scanner')

      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      
      if (!videoRef.current) throw new Error('Video element not available')

      const reader = new BrowserMultiFormatReader()
      zxingReaderRef.current = reader

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result: any, error: any) => {
          if (result && !foundBarcodeRef.current) {
            const barcode = result.getText?.() || result.text || ''
            const format = result.getBarcodeFormat?.() || result.format || ''
            
            if (barcode && barcode.length >= 8 && !format.toString().toUpperCase().includes('QR')) {
              console.log('ZXing detected:', barcode, 'format:', format)
              foundBarcodeRef.current = barcode
              await handleBarcodeResult(barcode)
            }
          }
        }
      )

      zxingReaderRef.current = controls
    } catch (error) {
      console.warn('ZXing failed, trying Quagga:', error)
      await startQuaggaScanner()
    }
  }

  // Quagga scanner (last resort)
  const startQuaggaScanner = async () => {
    try {
      setScanMethod('quagga')
      console.log('Using Quagga scanner')

      // Check if video element is ready
      if (!videoRef.current) {
        console.error('Video element not ready for Quagga scanner')
        setCameraError('Video element not available. Use Manual Entry.')
        return
      }

      const Quagga = await import('quagga')
      
      // Check if Quagga is properly loaded
      if (!Quagga || typeof Quagga.init !== 'function') {
        throw new Error('Quagga library not properly loaded')
      }
      
      console.log('Quagga library loaded successfully')
      
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            width: { min: 640 },
            height: { min: 480 },
            facingMode: "environment"
          },
        },
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader", 
            "code_128_reader",
            "code_39_reader",
            "upc_reader",
            "upc_e_reader"
          ]
        },
        locate: true
      }, (err: any) => {
        if (err) {
          console.error('Quagga initialization failed:', err)
          setCameraError('Scanner not supported. Use Manual Entry.')
          return
        }

        console.log('Quagga initialized successfully')
        Quagga.start()
        quaggaRef.current = Quagga

        Quagga.onDetected((result: any) => {
          if (!foundBarcodeRef.current) {
            const barcode = result.codeResult.code
            if (barcode && barcode.length >= 8) {
              console.log('Quagga detected:', barcode)
              foundBarcodeRef.current = barcode
              handleBarcodeResult(barcode)
            }
          }
        })
      })
    } catch (error) {
      console.error('All scanners failed:', error)
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      })
      setCameraError('All scanners failed. Use Manual Entry.')
      // Automatically show manual entry option
      setTimeout(() => {
        if (confirm('All scanners failed. Would you like to enter the barcode manually?')) {
          handleManualEntry()
        }
      }, 1000)
    }
  }

  // Manual entry
  const handleManualEntry = () => {
    const barcode = prompt('Enter barcode manually:')
    if (barcode?.trim()) {
      handleBarcodeResult(barcode.trim())
    }
  }

  // Product management
  const fetchProductWithInventory = async (barcode: string): Promise<Product | null> => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, barcode, cost_price, selling_price, unit,
        inventory(id, current_stock, min_stock_level)
      `)
      .eq('business_id', business!.id)
      .eq('barcode', barcode)
      .maybeSingle()

    if (error) throw error
    return data
  }

  const createProductInSupabase = async (barcode: string, name: string): Promise<Product> => {
    const { data: inserted, error } = await supabase
      .from('products')
      .insert([{
        business_id: business!.id,
        name: name.trim(),
        barcode,
        cost_price: 0,
        selling_price: 0,
        unit: 'piece'
      }])
      .select()
      .single()

    if (error) throw error

    const { error: invError } = await supabase
      .from('inventory')
      .insert([{
        business_id: business!.id,
        product_id: inserted.id,
        current_stock: 0,
        min_stock_level: 0
      }])

    if (invError) throw invError

    const reloaded = await fetchProductWithInventory(barcode)
    return reloaded || { ...inserted, inventory: [{ current_stock: 0, min_stock_level: 0 }] }
  }

  // Handle barcode scan result
  const handleBarcodeResult = async (barcode: string) => {
    if (!business) return

    setLoading(true)
    setScanResult(barcode)
    setScanStats(prev => ({ ...prev, attempts: prev.attempts + 1 }))

    try {
      const existing = await fetchProductWithInventory(barcode)
      
      if (existing) {
        setProduct(existing)
        saveRecentScan({
          barcode,
          productName: existing.name,
          action: 'found'
        })
        setScanStats(prev => ({ ...prev, successfulScans: prev.successfulScans + 1 }))
      } else {
        const name = prompt(`Product ${barcode} not found.\nEnter product name to create:`)
        if (!name?.trim()) return

        try {
          const created = await createProductInSupabase(barcode, name.trim())
          setProduct(created)
          saveRecentScan({
            barcode,
            productName: created.name,
            action: 'created'
          })
          setScanStats(prev => ({ ...prev, successfulScans: prev.successfulScans + 1 }))
          alert('Product created successfully!')
        } catch (error: any) {
          console.error('Product creation failed:', error)
          alert('Failed to create product. Please try again.')
          setScanStats(prev => ({ ...prev, failedScans: prev.failedScans + 1 }))
        }
      }
    } catch (error: any) {
      console.error('Product lookup failed:', error)
      alert('Lookup failed. Please try again.')
      setScanStats(prev => ({ ...prev, failedScans: prev.failedScans + 1 }))
    } finally {
      setLoading(false)
      await cleanupScanner()
    }
  }

  // Record inventory transaction
  const recordTransaction = async () => {
    if (!product || !business || !user) return

    setLoading(true)
    try {
      // Get current inventory for the product
      const { data: currentInventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('current_stock, min_stock_level')
        .eq('business_id', business.id)
        .eq('product_id', product.id)
        .single()

      if (inventoryError) {
        throw new Error(`Failed to fetch current inventory: ${inventoryError.message}`)
      }

      const previousStock = currentInventory.current_stock
      let newStock = previousStock

      // Calculate new stock based on transaction type
      switch (transactionForm.type) {
        case 'stock_in':
          newStock = previousStock + transactionForm.quantity
          break
        case 'stock_out':
          newStock = previousStock - transactionForm.quantity
          if (newStock < 0) {
            throw new Error('Insufficient stock for this transaction')
          }
          break
        case 'adjustment':
          newStock = transactionForm.quantity // Direct adjustment
          break
        default:
          throw new Error('Invalid transaction type')
      }

      // Resolve app-level user ID for the transaction
      const appUserId = await resolveAppUserId(user)
      if (!appUserId) {
        throw new Error('Could not resolve user ID')
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert([{
          business_id: business.id,
          product_id: product.id,
          user_id: appUserId,
          transaction_type: transactionForm.type,
          quantity: transactionForm.quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          unit_cost: null, // Could be enhanced to include cost tracking
          reason: `${transactionForm.type.replace('_', ' ')} via scanner`,
          notes: `Transaction recorded via mobile scanner`,
          reference_number: `${transactionForm.type.toUpperCase()}-${Date.now()}`,
          metadata: { source: 'mobile_scanner', timestamp: new Date().toISOString() }
        }])

      if (transactionError) {
        throw new Error(`Failed to create transaction record: ${transactionError.message}`)
      }

      // Update inventory current_stock
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('business_id', business.id)
        .eq('product_id', product.id)

      if (updateError) {
        throw new Error(`Failed to update inventory: ${updateError.message}`)
      }

      // Update local product state with new inventory
      setProduct(prev => prev ? {
        ...prev,
        inventory: prev.inventory ? [{
          id: prev.inventory[0].id,
          current_stock: newStock,
          min_stock_level: currentInventory.min_stock_level
        }] : [{ 
          id: '', // Temporary ID for display
          current_stock: newStock, 
          min_stock_level: currentInventory.min_stock_level 
        }]
      } : null)

      setSuccess(true)
      saveRecentScan({
        barcode: product.barcode,
        productName: product.name,
        action: transactionForm.type,
        quantity: transactionForm.quantity
      })

      setTimeout(() => {
        setProduct(null)
        setTransactionForm({ type: 'stock_in', quantity: 1 })
        setSuccess(false)
        setScanResult('')
      }, 2000)
    } catch (error: any) {
      console.error('Transaction failed:', error)
      alert(`Failed to record transaction: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Reset and scan again
  const handleResetAndScanAgain = async () => {
    setProduct(null)
    setScanResult('')
    setSuccess(false)
    setTransactionForm({ type: 'stock_in', quantity: 1 })
    
    // Ensure complete reset before starting camera
    await new Promise(resolve => setTimeout(resolve, 100))
    await startCamera()
  }

  // Update transaction form
  const updateTransactionForm = (updates: Partial<TransactionForm>) => {
    setTransactionForm(prev => ({ ...prev, ...updates }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="relative z-10 p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1" />
          <div className="p-4 sm:p-6 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => window.history.back()} 
                className="p-3 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  Smart Scanner
                </h1>
                <p className="mt-1 text-sm sm:text-base text-gray-600">
                  High-accuracy barcode scanning with multiple engines
                </p>
              </div>
            </div>
            <ScanLineIcon className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        {/* Scan Results */}
        {scanResult && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-green-200 p-4 sm:p-6 flex items-center gap-4">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="font-semibold text-gray-900">Barcode Detected</h3>
              <p className="text-sm text-gray-600">
                Scanned: {scanResult} 
                {scanMethod !== 'none' && (
                  <em className="ml-2 text-xs text-gray-500">via {scanMethod}</em>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
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

        {/* Main Scanner Interface */}
        {!product && !scanning ? (
          <ScannerInterface 
            onStartCamera={startCamera}
            onManualEntry={handleManualEntry}
            recentScans={recentScans}
            scanStats={scanStats}
          />
        ) : scanning ? (
          <CameraView 
            videoRef={videoRef}
            onStop={cleanupScanner}
            method={scanMethod}
            error={cameraError}
            videoKey={videoKey}
          />
        ) : product && (
          <TransactionForm 
            product={product}
            form={transactionForm}
            onUpdateForm={updateTransactionForm}
            onRecord={recordTransaction}
            onReset={handleResetAndScanAgain}
            loading={loading}
          />
        )}

        {/* Scanner Information */}
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl border border-white/20 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Scanner Information</h3>
            <button
              onClick={() => setDebugMode(!debugMode)}
              className="px-3 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              {debugMode ? 'Hide Debug' : 'Show Debug'}
            </button>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>Native Scanner:</strong> Uses browser's BarcodeDetector API (most accurate)</p>
            <p>• <strong>ZXing Fallback:</strong> JavaScript-based barcode detection</p>
            <p>• <strong>Quagga Fallback:</strong> Legacy scanner for older devices</p>
            <p>• <strong>Supported Formats:</strong> EAN, UPC, Code128, Code39, ITF, Codabar</p>
            <p>• <strong>Camera Quality:</strong> 1920x1080 recommended for best results</p>
          </div>
          {cameraError && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg p-2">
              {cameraError}
            </div>
          )}
          
          {/* Debug Information */}
          {debugMode && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Debug Info</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <p><strong>Current Method:</strong> {scanMethod}</p>
                <p><strong>Scanning State:</strong> {scanning ? 'Active' : 'Inactive'}</p>
                <p><strong>Video Ready:</strong> {videoRef.current?.readyState === 4 ? 'Yes' : 'No'}</p>
                <p><strong>Stream Active:</strong> {streamRef.current?.active ? 'Yes' : 'No'}</p>
                <p><strong>ZXing Instance:</strong> {zxingReaderRef.current ? 'Active' : 'None'}</p>
                <p><strong>Quagga Instance:</strong> {quaggaRef.current ? 'Active' : 'None'}</p>
                <p><strong>Found Barcode:</strong> {foundBarcodeRef.current || 'None'}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => cleanupScanner()}
                  className="px-2 py-1 text-xs rounded bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                >
                  Force Cleanup
                </button>
                <button
                  onClick={() => startCamera()}
                  className="px-2 py-1 text-xs rounded bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
                >
                  Restart Camera
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Scanner Interface Component
function ScannerInterface({ 
  onStartCamera, 
  onManualEntry, 
  recentScans, 
  scanStats 
}: {
  onStartCamera: () => void
  onManualEntry: () => void
  recentScans: ScanResult[]
  scanStats: { attempts: number; successfulScans: number; failedScans: number }
}) {
  return (
    <div className="space-y-6">
      {/* Scanner Options */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-sm">
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Scan a Barcode</h2>
          <p className="text-sm text-gray-600">Choose your preferred scanning method</p>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={onStartCamera}
              className="flex items-center gap-4 p-4 rounded-xl font-medium shadow-md transform hover:scale-[1.02] hover:shadow-lg bg-gradient-to-r from-gray-600 to-gray-700 text-white transition-all"
            >
              <CameraIcon className="h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold text-lg">Camera Scanner</div>
                <div className="text-gray-200 text-sm">High-accuracy live scanning</div>
              </div>
            </button>
            <button
              onClick={onManualEntry}
              className="flex items-center gap-4 p-4 rounded-xl font-medium shadow-md transform hover:scale-[1.02] hover:shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white transition-all"
            >
              <KeyboardIcon className="h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold text-lg">Manual Entry</div>
                <div className="text-green-100 text-sm">Type barcode manually</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Scan Statistics */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-sm">
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Scan Statistics</h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">{scanStats.attempts}</div>
              <div className="text-sm text-blue-600">Total Attempts</div>
            </div>
            <div className="p-3 rounded-xl bg-green-50">
              <div className="text-2xl font-bold text-green-600">{scanStats.successfulScans}</div>
              <div className="text-sm text-green-600">Successful</div>
            </div>
            <div className="p-3 rounded-xl bg-red-50">
              <div className="text-2xl font-bold text-red-600">{scanStats.failedScans}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
          </div>
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
              <div key={index} className="px-4 py-4 sm:px-6 flex items-center justify-between">
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
                    {String(scan.action).replace('_', ' ')}
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
  )
}

// Camera View Component
function CameraView({ 
  videoRef, 
  onStop, 
  method, 
  error,
  videoKey
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  onStop: () => void
  method: string
  error: string
  videoKey: number
}) {
  const [isVideoReady, setIsVideoReady] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => setIsVideoReady(true)
    const handleError = () => setIsVideoReady(false)

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('error', handleError)
    }
  }, [videoRef])

  return (
    <div className="relative">
      <video
        key={videoKey}
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-80 rounded-2xl object-cover bg-gray-900"
        onLoadedMetadata={() => setIsVideoReady(true)}
        onError={() => setIsVideoReady(false)}
      />
      
      {/* Scanning overlay */}
      <div className="absolute inset-0 border-4 border-white/30 rounded-2xl pointer-events-none">
        <div className="absolute inset-0 grid place-items-center">
          <div className="w-64 h-28 border-4 border-blue-500 rounded bg-blue-500/10" />
        </div>
      </div>
      
      {/* Video status indicator */}
      {!isVideoReady && (
        <div className="absolute top-3 left-3 px-3 py-2 rounded-md text-sm bg-yellow-50 text-yellow-700 border border-yellow-200">
          Initializing camera...
        </div>
      )}
      
      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        <button 
          onClick={onStop} 
          className="px-6 py-3 rounded-xl font-medium shadow-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
        >
          Stop Camera {method !== 'none' && `(${method})`}
        </button>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="absolute top-3 right-3 px-3 py-2 rounded-md text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}
    </div>
  )
}

// Transaction Form Component
function TransactionForm({ 
  product, 
  form, 
  onUpdateForm, 
  onRecord, 
  onReset, 
  loading 
}: {
  product: Product
  form: TransactionForm
  onUpdateForm: (updates: Partial<TransactionForm>) => void
  onRecord: () => void
  onReset: () => void
  loading: boolean
}) {
  const transactionTypes = [
    { value: 'stock_in', label: 'Stock In', icon: TrendingUpIcon, classes: 'bg-green-100 border-green-500 text-green-700' },
    { value: 'stock_out', label: 'Stock Out', icon: TrendingDownIcon, classes: 'bg-red-100 border-red-500 text-red-700' },
    { value: 'adjustment', label: 'Adjustment', icon: SettingsIcon, classes: 'bg-blue-100 border-blue-500 text-blue-700' },
  ]

  return (
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

        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-semibold mb-3 text-gray-900">Transaction Type</label>
          <div className="grid grid-cols-3 gap-3">
            {transactionTypes.map(({ value, label, icon: Icon, classes }) => {
              const isSelected = form.type === value
              return (
                <button
                  key={value}
                  onClick={() => onUpdateForm({ type: value as any })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isSelected ? classes : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">{label}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-semibold mb-3 text-gray-900">Quantity</label>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onUpdateForm({ quantity: Math.max(1, form.quantity - 1) })} 
              className="w-12 h-12 rounded-xl font-bold bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
            >
              -
            </button>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => onUpdateForm({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              min={1}
              className="flex-1 text-center text-2xl font-bold rounded-xl py-3 px-4 bg-white border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-gray-900"
            />
            <button 
              onClick={() => onUpdateForm({ quantity: form.quantity + 1 })} 
              className="w-12 h-12 rounded-xl font-bold bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={onRecord}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <CheckCircleIcon className="h-5 w-5" />
            )}
            Record Transaction
          </button>
          <button
            onClick={onReset}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-4 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ScanLineIcon className="h-5 w-5" /> 
            Scan Another Item
          </button>
        </div>
      </div>
    </div>
  )
}
