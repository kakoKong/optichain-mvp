// app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useHybridAuth } from '@/hooks/useHybridAuth'

export const dynamic = 'force-dynamic'

export default function Home() {
  const { user, loading } = useHybridAuth()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (loading) return
    
    if (!redirecting) {
      setRedirecting(true)
      const target = user ? '/dashboard' : '/signin'
      console.log('Redirecting to:', target, 'User:', user?.id)
      router.replace(target)
    }
  }, [loading, user, router, redirecting])

  // Show loading state while checking authentication
  if (loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">OptiChain</h1>
          <p className="text-gray-600">
            {loading ? 'Checking authentication...' : 'Redirecting...'}
          </p>
        </div>
      </div>
    )
  }

  // This should never be reached, but just in case
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">OptiChain</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}