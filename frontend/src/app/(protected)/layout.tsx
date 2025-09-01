// app/(protected)/layout.tsx
'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useHybridAuth } from '@/hooks/useHybridAuth'
import { supabase } from '@/lib/supabase'
import liff from '@line/liff'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useHybridAuth()
  const [liffChecking, setLiffChecking] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Check for LINE LIFF authentication if no Supabase session exists
  useEffect(() => {
    const checkLiffAuth = async () => {
      if (loading || user) return // Skip if still loading or user exists
      
      // Check if we're in a LINE LIFF context
      const params = new URLSearchParams(window.location.search)
      const isLiffContext = params.has('liff.state') || /liff\.line\.me/i.test(document.referrer)
      
      if (isLiffContext && process.env.NEXT_PUBLIC_LINE_LIFF_ID) {
        try {
          setLiffChecking(true)
          
          // Initialize LIFF
          await liff.init({
            liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID,
            withLoginOnExternalBrowser: true,
          })
          
          if (liff.isLoggedIn()) {
            // User is logged in to LINE, try to authenticate with Supabase
            const idToken = liff.getIDToken()
            if (idToken) {
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'line',
                token: idToken,
              })
              
              if (data.session) {
                // Successfully authenticated, the useHybridAuth hook will pick this up
                return
              }
            }
          }
        } catch (error) {
          console.error('LIFF authentication check failed:', error)
        } finally {
          setLiffChecking(false)
        }
      }
    }

    checkLiffAuth()
  }, [loading, user])

  // Redirect to signin if not authenticated
  if (!loading && !liffChecking && !user) {
    const next = encodeURIComponent(pathname || '/dashboard')
    router.replace(`/signin?next=${next}`)
    return null
  }

  // Show loading spinner while checking authentication
  if (loading || liffChecking || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">
            {liffChecking ? 'Checking LINE authentication...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
