// components/SupabaseSignIn.tsx
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SignInWithGoogle({ label = 'Continue with Google' }) {
  const router = useRouter()
  const popupRef = useRef<Window | null>(null)
  const base =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');

  useEffect(() => {
    // If the session changes (popup finished), navigate and close popup
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        popupRef.current?.close()
        router.replace('/dashboard')
      }
    })

    // Fallback: explicit postMessage from callback page
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'oauth:complete') {
        popupRef.current?.close()
        router.replace('/dashboard')
      }
    }
    window.addEventListener('message', onMessage)

    return () => {
      sub.subscription?.unsubscribe?.()
      window.removeEventListener('message', onMessage)
    }
  }, [router])

  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${base}/auth/callback`,
        skipBrowserRedirect: true, // <-- don't redirect current tab
      },
    })

    if (error || !data?.url) {
      // Popup blocked or something went wrong → full redirect as a last resort
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${base}/auth/callback` },
      })
      return
    }

    const url = data.url
    const w = 480, h = 700
    const y = (window.top?.outerHeight ?? h) / 2 + (window.top?.screenY ?? 0) - h / 2
    const x = (window.top?.outerWidth ?? w) / 2 + (window.top?.screenX ?? 0) - w / 2
    popupRef.current = window.open(
      url,
      'supabase-oauth',
      `width=${w},height=${h},left=${Math.max(0, x)},top=${Math.max(0, y)}`
    )

    // If popup blocked, fallback to same-tab redirect
    if (!popupRef.current) window.location.href = url
  }

  return (
    <button onClick={signIn} className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 bg-black text-white hover:opacity-90">
      {/* your Google icon here */}
      {label}
    </button>
  )
}
