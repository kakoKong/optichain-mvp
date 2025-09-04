'use client'

import { lazy, Suspense } from 'react'
import { ScanLineIcon } from 'lucide-react'

// Lazy load the heavy scanner component
const ScannerComponent = lazy(() => import('./ScannerComponent'))

export default function LazyScanner() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <div className="flex items-center gap-2 text-gray-600">
              <ScanLineIcon className="h-5 w-5" />
              <p className="font-medium">Loading Scanner...</p>
            </div>
          </div>
        </div>
      }
    >
      <ScannerComponent />
    </Suspense>
  )
}
