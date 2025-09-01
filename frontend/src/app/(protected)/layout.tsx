// app/(protected)/layout.tsx
'use client'

import { ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading, authSource } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Redirect to signin if not authenticated
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
          {authSource && (
            <p className="text-sm text-gray-500 mt-2">
              Using {authSource === 'line' ? 'LINE' : 'Supabase'} authentication
            </p>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
