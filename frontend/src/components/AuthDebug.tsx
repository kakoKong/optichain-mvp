'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthDebug() {
  const { user, loading, isDevMode } = useAuth()

  // Only show in development mode
  if (!isDevMode) {
    return null
  }

  return (
    <div className="fixed top-16 left-4 z-50 bg-gray-900 text-white p-3 rounded-lg text-xs max-w-xs opacity-75 hover:opacity-100 transition-opacity">
      <div className="font-mono">
        <div><strong>Auth Debug:</strong></div>
        <div>Dev Mode: {isDevMode ? '✅' : '❌'}</div>
        <div>Loading: {loading ? '🔄' : '✅'}</div>
        <div>User: {user ? '✅' : '❌'}</div>
        {user && (
          <>
            <div>ID: {user.id}</div>
            <div>Name: {user.displayName}</div>
            <div>Source: {user.source}</div>
          </>
        )}
        <div className="mt-2 text-gray-400">
          {process.env.NODE_ENV} | {process.env.NEXT_PUBLIC_DEV_MODE || 'undefined'}
        </div>
      </div>
    </div>
  )
}
