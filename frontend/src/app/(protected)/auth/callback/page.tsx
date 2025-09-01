// app/auth/callback/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Let Supabase handle the OAuth callback
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setStatus('error')
          setTimeout(() => router.replace('/signin'), 2000)
          return
        }

        if (session?.user) {
          setStatus('success')
          // Redirect to dashboard or stored redirect path
          const redirectTo = sessionStorage.getItem('postLoginRedirect') || '/dashboard'
          sessionStorage.removeItem('postLoginRedirect')
          router.replace(redirectTo)
        } else {
          setStatus('error')
          setTimeout(() => router.replace('/signin'), 2000)
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error)
        setStatus('error')
        setTimeout(() => router.replace('/signin'), 2000)
      }
    }

    handleCallback()
  }, [router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Completing sign in...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in failed</h2>
          <p className="text-gray-600 mb-4">There was a problem completing your sign in.</p>
          <p className="text-sm text-gray-500">Redirecting to sign in page...</p>
        </div>
      </div>
    )
  }

  return null
}
