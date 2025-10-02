'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { CodeIcon } from 'lucide-react'

export default function DevModeBanner() {
  const { isDevMode, user } = useAuth()

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
