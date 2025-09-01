// app/(protected)/layout.tsx
'use client'

import { ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Allow LIFF routes to handle their own authentication
  const isLiffRoute = pathname?.startsWith('/liff/')
  
  // For LIFF routes, don't redirect to signin - let LIFF handle auth
  if (isLiffRoute) {
    // Show loading spinner while checking authentication
    if (loading) {
      return (
        <div className="min-h-screen grid place-items-center">
          <div className="text-center">
            <div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-600">Initializing LIFF...</p>
          </div>
        </div>
      )
    }
    
    // For LIFF routes, always render children (auth will be handled by individual pages)
    return <>{children}</>
  }

  // For non-LIFF routes, use the existing protected logic
  if (!loading && !user) {
    const next = encodeURIComponent(pathname || '/dashboard')
    router.replace(`/signin?next=${next}`)
    return null
  }

  // Show loading spinner while checking authentication
  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">
            {loading ? 'Checking authentication...' : 'Redirecting to sign in...'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Using LINE authentication
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
