// components/SupabaseSignIn.tsx
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignInWithGoogle({ label = 'Continue with Google' }) {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Redirect to dashboard or stored redirect path
        const redirectTo = sessionStorage.getItem('postLoginRedirect') || '/dashboard'
        sessionStorage.removeItem('postLoginRedirect')
        router.replace(redirectTo)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const signIn = async () => {
    try {
      // Store current path for post-login redirect
      const currentPath = window.location.pathname + window.location.search
      if (currentPath !== '/signin') {
        sessionStorage.setItem('postLoginRedirect', currentPath)
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) {
        console.error('Sign in error:', error)
        alert('Failed to sign in. Please try again.')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      alert('An unexpected error occurred. Please try again.')
    }
  }

  return (
    <button
      onClick={signIn}
      className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 bg-black text-white hover:opacity-90 transition-opacity"
    >
      {label}
    </button>
  )
}
