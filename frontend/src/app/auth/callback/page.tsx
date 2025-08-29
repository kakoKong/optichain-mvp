'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // This makes supabase-js parse the fragment and persist the session
    supabase.auth.getSession().finally(() => {
      // remove the fragment and forward to dashboard
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname)
      }
      router.replace('/dashboard')
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Signing you in…</p>
    </div>
  )
}
