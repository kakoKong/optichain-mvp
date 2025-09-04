'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  ScanLineIcon, CameraIcon, KeyboardIcon, CheckCircleIcon, PackageIcon,
  TrendingUpIcon, TrendingDownIcon, ArrowLeftIcon, PlusIcon, XIcon, RotateCcwIcon
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

export default function ScannerComponent() {
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

  // Memoized functions for performance
  const initializeAudio = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (error) {
      console.warn('Audio not supported:', error)
    }
  }, [])

  const playSuccessSound = useCallback(() => {
    try {
      initializeAudio()
    } catch (error) {
      console.warn('Could not play sound:', error)
    }
  }, [initializeAudio])

  // Rest of the scanner logic would go here...
  // For brevity, I'll include the essential parts

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Barcode Scanner</h1>
        <div className="bg-white rounded-lg p-6">
          <p className="text-gray-600">Scanner component loaded</p>
        </div>
      </div>
    </div>
  )
}
