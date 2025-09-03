// app/(protected)/layout.tsx
'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [redirecting, setRedirecting] = useState(false)

  // Allow LIFF routes to handle their own authentication
  const isLiffRoute = pathname?.startsWith('/liff/')
  
  // Handle redirect to signin for non-LIFF routes
  useEffect(() => {
    if (!loading && !user && !isLiffRoute && !redirecting) {
      setRedirecting(true)
      const next = encodeURIComponent(pathname || '/dashboard')
      router.replace(`/signin?next=${next}`)
    }
  }, [loading, user, isLiffRoute, pathname, router, redirecting])
  
  // For LIFF routes, show loading while auth is being checked
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
    
    // For LIFF routes, render children (auth will be handled by individual pages)
    // If user is not authenticated, the LIFF pages will handle the login flow
    return <>{children}</>
  }

  // For non-LIFF routes, show loading while redirecting
  if (redirecting) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to sign in...</p>
          <p className="text-sm text-gray-500 mt-2">
            Using LINE authentication
          </p>
        </div>
      </div>
    )
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
