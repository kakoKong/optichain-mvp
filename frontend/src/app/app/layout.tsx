// app/app/layout.tsx
'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/AuthContext'
import MobileBottomNav from '@/components/MobileBottomNav'
import TopNavbar from '@/components/TopNavbar'
import DevLogin from '@/components/DevLogin'
import AuthDebug from '@/components/AuthDebug'

function AuthenticatedAppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [redirecting, setRedirecting] = useState(false)

  // Allow LIFF routes to handle their own authentication
  const isLiffRoute = pathname?.startsWith('/app/liff/')
  
  // Routes that should not have navigation (onboarding flows)
  const isOnboardingRoute = pathname === '/app/onboarding' || pathname === '/app/create-business'
  
  // Handle redirect to signin for non-LIFF routes
  useEffect(() => {
    if (!loading && !user && !isLiffRoute && !redirecting) {
      setRedirecting(true)
      // Preserve the actual pathname the user was trying to access
      // Only default to dashboard if they were accessing the root /app path
      const destination = pathname === '/app' ? '/app/dashboard' : (pathname || '/app/dashboard')
      const next = encodeURIComponent(destination)
      router.replace(`/app/signin?next=${next}`)
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
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavbar />
        <div className="mobile-bottom-nav">
          {children}
          <MobileBottomNav />
        </div>
      </div>
    )
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

  // For onboarding routes, don't show navigation
  if (isOnboardingRoute) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavbar />
      <div className="mobile-bottom-nav">
        {children}
        <MobileBottomNav />
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthenticatedAppLayout>
        {children}
      </AuthenticatedAppLayout>
      <DevLogin />
      <AuthDebug />
    </AuthProvider>
  )
}