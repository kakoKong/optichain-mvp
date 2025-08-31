// components/SupabaseSignIn.tsx
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SignInWithGoogle({ label = 'Continue with Google' }) {
  const router = useRouter()
  const winRef = useRef<Window | null>(null)
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // go back where we started
        const to = sessionStorage.getItem('postLoginRedirect') || '/dashboard'
        sessionStorage.removeItem('postLoginRedirect')
        winRef.current?.close()
        router.replace(to)
      }
    })

    const onMessage = (e: MessageEvent) => {
      if (typeof window === 'undefined') return
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'oauth:complete') {
        const to = sessionStorage.getItem('postLoginRedirect') || '/dashboard'
        sessionStorage.removeItem('postLoginRedirect')
        winRef.current?.close()
        router.replace(to)
      }
    }
    window.addEventListener('message', onMessage)
    return () => {
      sub.subscription?.unsubscribe?.()
      window.removeEventListener('message', onMessage)
    }
  }, [router])

  const signIn = async () => {
    // remember current page for the original tab
    const returnTo = window.location.pathname + window.location.search || '/dashboard'
    sessionStorage.setItem('postLoginRedirect', returnTo)

    // pre-open a NEW TAB (not a sized popup) to avoid popup blockers
    winRef.current = window.open('about:blank', '_blank')

    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${base}/auth/callback`, skipBrowserRedirect: true },
    })

    if (data?.url) {
      // send the new tab to Google
      if (winRef.current) winRef.current.location.href = data.url
      else window.location.href = data.url // extreme fallback
    } else {
      // fallback: same-tab
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${base}/auth/callback` },
      })
    }
  }

  return (
    <button
      onClick={signIn}
      className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 bg-black text-white hover:opacity-90"
    >
      {label}
    </button>
  )
}
