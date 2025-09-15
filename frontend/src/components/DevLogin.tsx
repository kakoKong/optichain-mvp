'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserIcon, CodeIcon, PlayIcon, LogOutIcon } from 'lucide-react'

export default function DevLogin() {
  const { signInDev, isDevMode, user, signOut } = useAuth()
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isDevMode) {
    return null // Don't show in production
  }

  if (user) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-green-100 border border-green-300 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <UserIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Dev Mode: {user.displayName}</span>
          </div>
          <div className="text-xs text-green-700 mb-2">
            ID: {user.id}
          </div>
          {user.databaseUid && (
            <div className="text-xs text-green-700 mb-2">
              DB UID: {user.databaseUid}
            </div>
          )}
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
          >
            <LogOutIcon className="h-3 w-3" />
            Logout
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsLoading(true)
    setError('')

    try {
      await signInDev(username.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 shadow-lg max-w-xs">
        <div className="flex items-center gap-2 mb-3">
          <CodeIcon className="h-5 w-5 text-yellow-700" />
          <h3 className="text-sm font-semibold text-yellow-800">Dev Login</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            disabled={isLoading}
          />
          
          <button
            type="submit"
            disabled={isLoading || !username.trim()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white text-sm font-medium rounded-md transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {error && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2">
            {error}
          </div>
        )}

        <div className="mt-2 text-xs text-yellow-700">
          This is a development-only feature for local testing.
        </div>
        
        <button
          onClick={() => {
            localStorage.clear()
            window.location.reload()
          }}
          className="mt-2 w-full px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Clear All & Reload
        </button>
      </div>
    </div>
  )
}
