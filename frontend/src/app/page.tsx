// app/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useHybridAuth } from '@/hooks/useHybridAuth'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const { user, loading } = useHybridAuth()
  const router = useRouter()
  const search = useSearchParams()

  // Normalize Supabase hash tokens once, then clean the URL
  useEffect(() => {
    supabase.auth.getSession().finally(() => {
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search
        )
      }
    })
  }, [])

  useEffect(() => {
    if (loading) return
    const next = search.get('next')
    if (user) {
      router.replace(next || '/dashboard')
    } else {
      router.replace(`/signin${next ? `?next=${encodeURIComponent(next)}` : ''}`)
    }
  }, [loading, user, router, search])

  // Tiny spinner while deciding
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent" />
    </div>
  )
}
