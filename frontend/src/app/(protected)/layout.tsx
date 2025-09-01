// app/(protected)/layout.tsx
'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useHybridAuth } from '@/hooks/useHybridAuth'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useHybridAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) {
      // preserve where the user was going
      const next = encodeURIComponent(pathname || '/dashboard')
      router.replace(`/signin?next=${next}`)
    }
  }, [loading, user, router, pathname])

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
