'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import ResponsiveNav from '@/components/ResponsiveNav'
import {
  ScanLineIcon, CameraIcon, KeyboardIcon, CheckCircleIcon, PackageIcon,
  TrendingUpIcon, TrendingDownIcon, PlusIcon, XIcon, RotateCcwIcon
} from 'lucide-react'

// Types
interface Product {
  id: string
  name: string
  barcode: string
  cost_price: number
  selling_price: number
  unit: string
  image_url?: string
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

interface TransactionForm {
  type: 'stock_in' | 'stock_out' | 'adjustment'
  quantity: number
}

// Scanner configuration
const SCANNER_CONFIG = {
  camera: {
    facingMode: 'environment' as const,
    width: { ideal: 1920, min: 1280 },
    height: { ideal: 1080, min: 720 },
    frameRate: { ideal: 30, min: 15 },
    aspectRatio: { ideal: 16/9 },
    resizeMode: 'crop-and-scale' as any
  },
  barcodeFormats: [
    'ean_13', 'ean_8', 'upc_a', 'upc_e', 
    'code_128', 'code_93', 'code_39', 'itf',
    'codabar', 'data_matrix', 'pdf_417'
  ],
  scanInterval: 200,
  confidenceThreshold: 0.6,
  maxRetries: 3
}

export default function BarcodeScanner() {
  // Core state
  const { user, loading: authLoading } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [transactionForm, setTransactionForm] = useState<TransactionForm>({
    type: 'stock_in',
    quantity: 1
  })
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanResult, setScanResult] = useState('')
  const [scanMethod, setScanMethod] = useState<'none' | 'native' | 'zxing' | 'quagga'>('none')
  const [cameraError, setCameraError] = useState('')
  const [isQuickMode, setIsQuickMode] = useState(false)
  const [quickActionType, setQuickActionType] = useState<'stock_in' | 'stock_out'>('stock_in')
  const [showSuccess, setShowSuccess] = useState(false)
  const [undoTransaction, setUndoTransaction] = useState<{
    productId: string
    transactionId: string
    quantity: number
  } | null>(null)
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null)
  const [lastScanTime, setLastScanTime] = useState<number>(0)
  const [isModeChanging, setIsModeChanging] = useState(false)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const zxingReaderRef = useRef<any>(null)
  const quaggaRef = useRef<any>(null)
  const foundBarcodeRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isQuickModeRef = useRef<boolean>(false)
  const quickActionTypeRef = useRef<'stock_in' | 'stock_out'>('stock_in')

  // Initialize component
  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      window.location.href = '/liff/login'
      return
    }
    
    initializeScanner()
    return () => {
      cleanupScanner()
    }
  }, [authLoading, user])

  useEffect(() => {
    if (business && !scanning && !product) {
      const timer = setTimeout(() => {
        startCamera()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [business, scanning, product])

  // Debug effect to track mode changes
  useEffect(() => {
    console.log('[Scanner] Mode state changed:', { isQuickMode, quickActionType, scanning })
    // Keep refs in sync with state
    isQuickModeRef.current = isQuickMode
    quickActionTypeRef.current = quickActionType
  }, [isQuickMode, quickActionType, scanning])

  // Initialize audio for success sound
  const initializeAudio = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime) // 800Hz frequency
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (error) {
      console.warn('Audio not supported:', error)
    }
  }

  // Play success sound
  const playSuccessSound = () => {
    try {
      initializeAudio() // Create the sound each time
    } catch (error) {
      console.warn('Could not play sound:', error)
    }
  }

  useEffect(() => {
    return () => {
      cleanupScanner()
    }
  }, [])

  // Helper functions
  const resolveAppUserId = async (u: { id: string; source: 'line' | 'line_browser' | 'dev'; databaseUid?: string }) => {
    if (u.source === 'dev' && u.databaseUid) {
      return u.databaseUid
    }

    if (u.source === 'line' || u.source === 'line_browser') {
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

    return null
  }

  const fetchBusinessForUser = async (appUserId: string) => {
    const { data: owned, error: ownedErr } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', appUserId)
      .limit(1)

    if (ownedErr) throw ownedErr
    if (owned && owned.length > 0) {
      return owned[0]
    }

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
      if (!user) return

      const appUserId = await resolveAppUserId(user)
      if (!appUserId) return

      const businessData = await fetchBusinessForUser(appUserId)
      if (!businessData) return

      setBusiness(Array.isArray(businessData) ? businessData[0] : businessData)
    } catch (error) {
      console.error('Initialization error:', error)
    }
  }

  // Camera management
  const startCamera = async () => {
    if (!business) {
      alert('No business found')
      return
    }

    setCameraError('')
    foundBarcodeRef.current = null

    try {
      await cleanupScanner()
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
      await new Promise(resolve => setTimeout(resolve, 300))
      
      if ((window as any).BarcodeDetector) {
        await startNativeScanner()
      } else {
        await startZXingScanner()
      }
    } catch (error) {
      console.error('Camera access failed:', error)
      setCameraError('Camera unavailable')
      await cleanupScanner()
    }
  }

  const cleanupScanner = async () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

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

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        track.enabled = false
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause()
        videoRef.current.srcObject = null
        videoRef.current.removeAttribute('src')
        videoRef.current.load()
      } catch (error) {
        console.warn('Video cleanup error:', error)
      }
    }

    setScanMethod('none')
    setScanning(false)
    foundBarcodeRef.current = null
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  const startNativeScanner = async () => {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: SCANNER_CONFIG.barcodeFormats
      })
      
      setScanMethod('native')

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
      console.error('Native scanner failed:', error)
      await startZXingScanner()
    }
  }

  const startZXingScanner = async () => {
    try {
      setScanMethod('zxing')
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      
      if (!videoRef.current) {
        throw new Error('Video element not available')
      }

      const reader = new BrowserMultiFormatReader()
      zxingReaderRef.current = reader

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result: any, error: any) => {
          if (error) return
          
          if (result && !foundBarcodeRef.current) {
            const barcode = result.getText?.() || result.text || ''
            
            if (barcode && barcode.length >= 8) {
              foundBarcodeRef.current = barcode
              await handleBarcodeResult(barcode)
            }
          }
        }
      )

      zxingReaderRef.current = controls
    } catch (error) {
      console.error('ZXing scanner failed:', error)
      setCameraError('Scanner not supported')
    }
  }

  const handleManualEntry = () => {
    const barcode = prompt('Enter barcode:')
    if (barcode?.trim()) {
      handleBarcodeResult(barcode.trim())
    }
  }

  const fetchProductWithInventory = async (barcode: string): Promise<Product | null> => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, barcode, cost_price, selling_price, unit, image_url,
        inventory(id, current_stock, min_stock_level)
      `)
      .eq('business_id', business!.id)
      .eq('barcode', barcode)
      .maybeSingle()

    if (error) throw error
    return data
  }

  const handleBarcodeResult = async (barcode: string) => {
    if (!business) return

    const now = Date.now()
    if (barcode === lastScannedBarcode && (now - lastScanTime) < 3000) {
      return
    }

    setLastScannedBarcode(barcode)
    setLastScanTime(now)
    setLoading(true)
    setScanResult(barcode)

    // Debug logging to track mode state
    console.log('[Scanner] Barcode scanned, current mode:', { isQuickMode, quickActionType })

    try {
      const existing = await fetchProductWithInventory(barcode)
      
      if (existing) {
        playSuccessSound() // Play sound when barcode is found
        
        // Use ref to get the current mode state at the time of processing
        const currentMode = isQuickModeRef.current
        console.log('[Scanner] Processing barcode with mode:', currentMode)
        
        if (currentMode) {
          await handleQuickAdd(existing, barcode)
        } else {
          setProduct(existing)
        }
      } else {
        window.location.href = `/liff/products/add?barcode=${barcode}`
      }
    } catch (error: any) {
      alert('Lookup failed. Try again.')
    } finally {
      setLoading(false)
      // Only cleanup scanner if in manual mode
      if (!isQuickModeRef.current) {
        await cleanupScanner()
      }
    }
  }

  const handleQuickAdd = async (product: Product, barcode: string) => {
    try {
      const appUserId = await resolveAppUserId(user!)
      if (!appUserId) throw new Error('Could not resolve user ID')
      
      foundBarcodeRef.current = null

      const currentStock = product.inventory?.[0]?.current_stock || 0
      const quantity = 1
      let newStock = currentStock
      
      // Use ref to get current action type
      const currentActionType = quickActionTypeRef.current
      console.log('[Scanner] Quick add action type:', currentActionType)
      
      if (currentActionType === 'stock_in') {
        newStock = currentStock + quantity
      } else {
        if (currentStock < quantity) {
          throw new Error('Insufficient stock')
        }
        newStock = currentStock - quantity
      }

      const { data: transaction, error } = await supabase
        .from('inventory_transactions')
      .insert([{
        business_id: business!.id,
        product_id: product.id,
        user_id: appUserId,
        transaction_type: currentActionType,
        quantity: quantity,
        previous_stock: currentStock,
        new_stock: newStock,
        reason: `Quick ${currentActionType}`,
        notes: `Quick scan ${currentActionType}`
      }])
      .select()
      .single()

    if (error) throw error

      const { error: updateError } = await supabase
      .from('inventory')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('product_id', product.id)
        .eq('business_id', business!.id)
        
      if (updateError) throw updateError

      // Store the product information for the popup
      setProduct(product)

      setUndoTransaction({
        productId: product.id,
        transactionId: transaction.id,
        quantity: 1
      })

      setShowSuccess(true)
      playSuccessSound() // Play success sound
      setTimeout(() => {
        setShowSuccess(false)
        setScanResult('')
        setProduct(null) // Clear product after popup
      }, 2000)

    } catch (error: any) {
      alert(`Failed: ${error.message}`)
    }
  }

  const handleUndoTransaction = async () => {
    if (!undoTransaction || !business) return

    try {
      await supabase
        .from('inventory_transactions')
        .delete()
        .eq('id', undoTransaction.transactionId)

      const { data: inventory } = await supabase
        .from('inventory')
        .select('current_stock')
        .eq('product_id', undoTransaction.productId)
        .eq('business_id', business.id)
        .single()

      if (inventory) {
        await supabase
          .from('inventory')
          .update({ 
            current_stock: Math.max(0, inventory.current_stock - undoTransaction.quantity),
            updated_at: new Date().toISOString()
          })
          .eq('product_id', undoTransaction.productId)
          .eq('business_id', business.id)
      }

      setShowSuccess(false)
      setUndoTransaction(null)
      alert('Undone successfully!')

    } catch (error: any) {
      alert('Undo failed')
    }
  }

  const recordTransaction = async () => {
    if (!product || !business || !user) return

    setLoading(true)
    try {
      const { data: currentInventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('current_stock, min_stock_level')
        .eq('business_id', business.id)
        .eq('product_id', product.id)
        .single()

      if (inventoryError) throw new Error('Failed to fetch inventory')

      const previousStock = currentInventory.current_stock
      let newStock = previousStock

      switch (transactionForm.type) {
        case 'stock_in':
          newStock = previousStock + transactionForm.quantity
          break
        case 'stock_out':
          newStock = previousStock - transactionForm.quantity
          if (newStock < 0) throw new Error('Insufficient stock')
          break
        case 'adjustment':
          newStock = transactionForm.quantity
          break
      }

      const appUserId = await resolveAppUserId(user)
      if (!appUserId) throw new Error('Could not resolve user ID')

      const { data: transaction, error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert([{
          business_id: business.id,
          product_id: product.id,
          user_id: appUserId,
          transaction_type: transactionForm.type,
          quantity: transactionForm.quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reason: `${transactionForm.type.replace('_', ' ')} via scanner`,
          notes: `Mobile scanner transaction`
        }])
        .select()
        .single()

      if (transactionError) throw new Error('Failed to create transaction')

      const { error: updateError } = await supabase
        .from('inventory')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('business_id', business.id)
        .eq('product_id', product.id)

      if (updateError) throw new Error('Failed to update inventory')

      // Store undo information
      setUndoTransaction({
        productId: product.id,
        transactionId: transaction.id,
        quantity: transactionForm.quantity
      })

      setProduct(prev => prev ? {
        ...prev,
        inventory: prev.inventory ? [{
          id: prev.inventory[0].id,
          current_stock: newStock,
          min_stock_level: currentInventory.min_stock_level
        }] : [{ 
          id: '',
          current_stock: newStock, 
          min_stock_level: currentInventory.min_stock_level 
        }]
      } : null)

      setShowSuccess(true)
      playSuccessSound() // Play success sound

      setTimeout(() => {
        setProduct(null)
        setTransactionForm({ type: 'stock_in', quantity: 1 })
        setShowSuccess(false)
        setScanResult('')
      }, 2000)
    } catch (error: any) {
      alert(`Transaction failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResetAndScanAgain = async () => {
    setProduct(null)
    setScanResult('')
    setShowSuccess(false)
    setTransactionForm({ type: 'stock_in', quantity: 1 })
    
    await new Promise(resolve => setTimeout(resolve, 100))
    await startCamera()
  }

  const handleModeChange = async (newMode: boolean) => {
    console.log('[Scanner] Mode change requested:', { from: isQuickMode, to: newMode })
    setIsModeChanging(true)
    
    // Update the mode state immediately
    setIsQuickMode(newMode)
    isQuickModeRef.current = newMode // Update ref for immediate access
    
    // Clear any existing product state when switching modes
    setProduct(null)
    setShowSuccess(false)
    setScanResult('')
    
    // If scanner is currently running, restart it with the new mode
    if (scanning) {
      await cleanupScanner()
      await new Promise(resolve => setTimeout(resolve, 300)) // Slightly longer delay
      await startCamera()
    }
    
    // Add a small delay to ensure state is fully updated
    await new Promise(resolve => setTimeout(resolve, 100))
    setIsModeChanging(false)
    
    console.log('[Scanner] Mode change completed:', { isQuickMode: newMode })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Loading overlay */}
      {authLoading && (
        <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-3"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )}

      {/* Mode changing overlay */}
      {isModeChanging && (
        <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-3"></div>
            <p className="text-gray-600">Switching mode...</p>
          </div>
        </div>
      )}
      
        {/* Page Header */}
        <ResponsiveNav
          title="Scanner"
          action={
            <div className="flex items-center gap-2">
              {/* Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleModeChange(false)}
                  disabled={isModeChanging}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    !isQuickMode 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  } ${isModeChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Manual
                </button>
                <button
                  onClick={() => handleModeChange(true)}
                  disabled={isModeChanging}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isQuickMode 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  } ${isModeChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Quick
                </button>
              </div>
            </div>
          }
        />

       {/* Quick Mode Action Selector */}
       {isQuickMode && (
         <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-green-200 px-4 py-3">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-sm font-medium text-gray-700">Quick Mode Active</span>
              </div>
             
             {/* Action Toggle */}
             <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                <button
                 onClick={() => setQuickActionType('stock_in')}
                 className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all min-h-[48px] ${
                   quickActionType === 'stock_in'
                     ? 'bg-green-500 text-white shadow-sm'
                     : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                 }`}
               >
                 <TrendingUpIcon className="h-5 w-5" />
                 <span>Add Stock</span>
                </button>
                <button
                 onClick={() => setQuickActionType('stock_out')}
                 className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all min-h-[48px] ${
                   quickActionType === 'stock_out'
                     ? 'bg-red-500 text-white shadow-sm'
                     : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                 }`}
               >
                 <TrendingDownIcon className="h-5 w-5" />
                 <span>Remove Stock</span>
                </button>
             </div>
           </div>
           
           {/* Quick Mode Description */}
           <div className="mt-2 text-xs text-gray-600">
             {quickActionType === 'stock_in' 
               ? '📦 Each scan will add 1 item to inventory' 
               : '🛒 Each scan will remove 1 item from inventory'
             }
              </div>
            </div>
          )}

       {/* Manual Mode Indicator */}
       {!isQuickMode && (
         <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-3">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
             <span className="text-sm font-medium text-gray-700">Manual Mode Active</span>
        </div>
           <div className="mt-1 text-xs text-gray-600">
             📝 Choose transaction type and quantity for each scan
      </div>
    </div>
       )}

      {/* Main content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Success message */}
        {(showSuccess || scanResult) && (
          <div className={`p-3 rounded-lg border flex items-center gap-3 ${
            showSuccess 
              ? 'bg-green-50 border-green-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <CheckCircleIcon className={`h-5 w-5 ${
              showSuccess ? 'text-green-500' : 'text-blue-500'
            }`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                showSuccess ? 'text-green-800' : 'text-blue-800'
              }`}>
                {showSuccess ? 'Transaction recorded!' : `Scanned: ${scanResult}`}
              </p>
        </div>
            {showSuccess && undoTransaction && (
            <button
                onClick={handleUndoTransaction}
                className="p-1 rounded bg-red-100 hover:bg-red-200 text-red-600"
                title="Undo"
              >
                <RotateCcwIcon className="h-4 w-4" />
              </button>
            )}
              </div>
        )}

        {/* Scanner interface */}
        {!product && !scanning ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={startCamera}
                className="flex flex-col items-center gap-3 p-8 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors min-h-[120px]"
              >
                <CameraIcon className="h-10 w-10" />
                <span className="font-medium text-base">Camera</span>
            </button>
            <button
                onClick={handleManualEntry}
                className="flex flex-col items-center gap-3 p-8 rounded-xl bg-gray-500 hover:bg-gray-600 text-white transition-colors min-h-[120px]"
              >
                <KeyboardIcon className="h-10 w-10" />
                <span className="font-medium text-base">Manual</span>
            </button>
      </div>

            {cameraError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{cameraError}</p>
        </div>
      )}
    </div>
        ) : scanning ? (
          /* Camera view */
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
              className="w-full h-64 rounded-xl object-cover bg-gray-900"
            />
            
            {/* Scanning frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-20 border-2 border-white rounded-lg shadow-lg" />
      </div>
      
            {/* Stop button */}
        <button 
              onClick={cleanupScanner} 
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-8 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors min-h-[48px] text-base"
        >
              Stop
        </button>
            
            {/* Method indicator */}
            <div className="absolute top-3 left-3 px-2 py-1 rounded bg-white/90 text-xs font-medium text-gray-700">
              {scanMethod}
            </div>
            
            {/* Mode indicator */}
            <div className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-medium ${
              isQuickMode 
                ? 'bg-green-500 text-white' 
                : 'bg-blue-500 text-white'
            }`}>
              {isQuickMode ? `Quick ${quickActionType}` : 'Manual'}
            </div>
    </div>
        ) : product && (
          /* Transaction form */
          <div className="space-y-4">
            {/* Product info */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                {/* Product Image */}
                <div className="flex-shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`w-12 h-12 rounded-lg bg-gray-200 border border-gray-300 flex items-center justify-center ${product.image_url ? 'hidden' : ''}`}>
                    <PackageIcon className="h-6 w-6 text-gray-400" />
      </div>
            </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-600">Stock: {product.inventory?.[0]?.current_stock ?? 0}</p>
          </div>
        </div>

              {/* Transaction type selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                <div className="grid grid-cols-3 gap-2">
                <button
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'stock_in' }))}
                    className={`p-4 rounded-lg border-2 transition-all min-h-[80px] ${
                      transactionForm.type === 'stock_in'
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <TrendingUpIcon className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">Stock In</div>
                </button>
                  <button
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'stock_out' }))}
                    className={`p-4 rounded-lg border-2 transition-all min-h-[80px] ${
                      transactionForm.type === 'stock_out'
                        ? 'bg-red-100 border-red-500 text-red-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <TrendingDownIcon className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">Stock Out</div>
                  </button>
                  <button
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'adjustment' }))}
                    className={`p-4 rounded-lg border-2 transition-all min-h-[80px] ${
                      transactionForm.type === 'adjustment'
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <PackageIcon className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">Adjust</div>
                  </button>
          </div>
        </div>

              {/* Quantity input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center gap-2">
            <button 
                    onClick={() => setTransactionForm(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))} 
                    className="w-12 h-12 rounded-lg font-bold bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors text-lg min-h-[48px]"
            >
              -
            </button>
            <input
              type="number"
                    value={transactionForm.quantity}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
              min={1}
                    className="flex-1 text-center text-xl font-bold rounded-lg py-3 px-4 bg-white border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-gray-900 min-h-[48px]"
            />
            <button 
                    onClick={() => setTransactionForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))} 
                    className="w-12 h-12 rounded-lg font-bold bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors text-lg min-h-[48px]"
            >
              +
            </button>
          </div>
        </div>

              {/* Action buttons */}
              <div className="flex gap-3">
          <button
                  onClick={recordTransaction}
            disabled={loading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-4 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 min-h-[52px] text-base"
          >
            {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
                    <CheckCircleIcon className="h-5 w-5" />
            )}
                  Record
          </button>
          <button
                  onClick={handleResetAndScanAgain}
                  className="bg-gray-500 hover:bg-gray-600 text-white py-4 px-6 rounded-lg font-medium transition-colors min-h-[52px] min-w-[52px] flex items-center justify-center"
          >
                  <ScanLineIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
        )}
      </div>

      {/* Quick success toast */}
      {showSuccess && isQuickMode && (
        <div className="fixed top-20 left-4 right-4 z-50">
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4 flex items-center gap-3 animate-slide-down">
            {/* Product Image */}
            <div className="flex-shrink-0">
              {product?.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              ) : null}
              <div className={`w-12 h-12 rounded-lg bg-gray-200 border border-gray-300 flex items-center justify-center ${product?.image_url ? 'hidden' : ''}`}>
                <PackageIcon className="h-6 w-6 text-gray-400" />
              </div>
            </div>

            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              quickActionType === 'stock_in' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {quickActionType === 'stock_in' ? (
                <TrendingUpIcon className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDownIcon className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {quickActionType === 'stock_in' ? '✅ Stock Added' : '✅ Stock Removed'}
              </p>
              <p className="text-sm text-gray-600">
                {product?.name || 'Product'} - {quickActionType === 'stock_in' ? '1 item added' : '1 item removed'}
              </p>
              <p className="text-xs text-blue-600 mt-1">📷 Ready for next scan</p>
            </div>
            {undoTransaction && (
              <button
                onClick={handleUndoTransaction}
                className="p-2 rounded bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
              >
                <RotateCcwIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setShowSuccess(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}