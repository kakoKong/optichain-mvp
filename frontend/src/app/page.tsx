// app/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useHybridAuth } from '@/hooks/useHybridAuth'

export const dynamic = 'force-dynamic'  // or: export const revalidate = 0

export default function Home() {
  const { user, loading } = useHybridAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user ? '/dashboard' : '/signin')
  }, [loading, user, router])

  return null
}