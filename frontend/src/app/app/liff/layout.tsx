'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useBusiness } from '@/hooks/useBusiness'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function LiffLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const { business, loading: businessLoading } = useBusiness()

  // Skip auth checks for login page
  const isLoginPage = pathname === '/app/liff/login'

  useEffect(() => {
    if (isLoginPage) return
    if (authLoading || businessLoading) return

    // Redirect to login if not authenticated
    if (!user) {
      router.replace('/app/liff/login')
      return
    }

    // Only redirect to onboarding if user has no business AND we're not already on a specific page
    // This prevents redirect loops when OnboardingPage tries to redirect back to dashboard
    if (!business && pathname === '/app/liff') {
      router.replace('/app/onboarding')
    }
  }, [authLoading, businessLoading, user, business, router, pathname, isLoginPage])

  // Show loading while checking authentication
  if (!isLoginPage && (authLoading || businessLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    )
  }

  // Render children (navigation is handled by parent app layout)
  return <>{children}</>
}
