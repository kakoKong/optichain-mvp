'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { CodeIcon } from 'lucide-react'

export default function DevModeBanner() {
  // Check if we're in development mode without using AuthContext
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       process.env.NEXT_PUBLIC_DEV_MODE === 'true' ||
                       (typeof window !== 'undefined' && window.location.hostname === 'localhost')

  // Try to use AuthContext, but handle case where it's not available
  let authContext = null
  try {
    authContext = useAuth()
  } catch (error) {
    // AuthContext not available, which is fine for landing page
    authContext = null
  }

  const { isDevMode, user } = authContext || { isDevMode: isDevelopment, user: null }

  if (!isDevMode || user) {
    return null // Don't show when logged in or not in dev mode
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium shadow-lg">
      <div className="flex items-center justify-center gap-2">
        <CodeIcon className="h-4 w-4" />
        <span>🚧 DEVELOPMENT MODE - LINE Authentication Disabled 🚧</span>
        <CodeIcon className="h-4 w-4" />
      </div>
    </div>
  )
}
