'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useHybridAuth } from '@/hooks/useHybridAuth'

export default function HomeGate({ initialQuery = '' }: { initialQuery?: string }) {
  const { user, loading } = useHybridAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user ? '/dashboard' : `/signin${initialQuery}`)
  }, [loading, user, initialQuery, router])

  return null
}
