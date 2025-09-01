'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import liff from '@line/liff'
import SignInWithGoogle from '@/app/(public)/signin/SupabaseSignIn'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Mode = 'loading' | 'web' | 'liff'

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>('loading')
  const [liffError, setLiffError] = useState<string | null>(null)
  const [liffLoading, setLiffLoading] = useState(false)
  const router = useRouter()

  // For testing: manually switch to LINE mode
  const forceLiffMode = () => {
    console.log('[SignInClient] Forcing LIFF mode for testing')
    setMode('liff')
  }

  // For testing: manually switch to web mode
  const forceWebMode = () => {
    console.log('[SignInClient] Forcing web mode for testing')
    setMode('web')
  }

  useEffect(() => {
    let mounted = true
    const decide = async () => {
      if (typeof window === 'undefined') return

      console.log('[SignInClient] Checking LINE context...')
      console.log('[SignInClient] URL:', window.location.href)
      console.log('[SignInClient] Referrer:', document.referrer)
      console.log('[SignInClient] User Agent:', navigator.userAgent)

      const params = new URLSearchParams(window.location.search)
      const hasLiffState = params.has('liff.state')
      const hasLiffReferrer = /liff\.line\.me/i.test(document.referrer)
      const isInLineApp = /line/i.test(navigator.userAgent) || window.location.hostname.includes('liff.line.me')
      
      console.log('[SignInClient] LINE detection:', {
        hasLiffState,
        hasLiffReferrer,
        isInLineApp,
        liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID
      })

      // More comprehensive LINE detection
      const looksLikeLiff = hasLiffState || hasLiffReferrer || isInLineApp

      if (looksLikeLiff && process.env.NEXT_PUBLIC_LINE_LIFF_ID) {
        console.log('[SignInClient] LINE context detected, initializing LIFF...')
        try {
          await liff.init({
            liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID,
            withLoginOnExternalBrowser: true,
          })
          
          if (!mounted) return
          
          console.log('[SignInClient] LIFF initialized successfully')
          
          // Check if user is already logged in to LINE
          if (liff.isLoggedIn()) {
            console.log('[SignInClient] User already logged in to LINE, authenticating with Supabase...')
            // User is logged in to LINE, try to authenticate with Supabase
            await authenticateWithSupabase()
            return
          }
          
          console.log('[SignInClient] Setting mode to LIFF')
          setMode('liff')
        } catch (error) {
          console.error('[SignInClient] LIFF initialization failed:', error)
          setLiffError('Failed to initialize LINE login')
          setMode('web')
        }
      } else {
        console.log('[SignInClient] No LINE context detected, setting mode to web')
        setMode('web')
      }
    }
    
    decide()
    return () => { mounted = false }
  }, [])

  const authenticateWithSupabase = async () => {
    try {
      setLiffLoading(true)
      setLiffError(null)

      // Get LINE ID token
      const idToken = liff.getIDToken()
      if (!idToken) {
        throw new Error('No LINE ID token available')
      }

      // Sign in to Supabase with LINE ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'line',
        token: idToken,
      })

      if (error) {
        throw error
      }

      if (data.session) {
        // Successfully authenticated with Supabase
        // Redirect to dashboard or stored redirect path
        const redirectTo = sessionStorage.getItem('postLoginRedirect') || '/dashboard'
        sessionStorage.removeItem('postLoginRedirect')
        router.replace(redirectTo)
      }
    } catch (error) {
      console.error('Supabase authentication failed:', error)
      setLiffError('Failed to authenticate with LINE. Please try again.')
      setLiffLoading(false)
    }
  }

  const onLineClick = async () => {
    try {
      setLiffError(null)
      setLiffLoading(true)
      
      if (!liff.isLoggedIn()) {
        // This will redirect to LINE login
        liff.login({ 
          redirectUri: window.location.origin + '/signin'
        })
      } else {
        // User is already logged in, authenticate with Supabase
        await authenticateWithSupabase()
      }
    } catch (error) {
      console.error('LINE login failed:', error)
      setLiffError('Failed to start LINE login. Please try again.')
      setLiffLoading(false)
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundImage: 'linear-gradient(to bottom right, var(--bg-from), var(--bg-via), var(--bg-to))' }}
    >
      {/* blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply blur-xl opacity-40 animate-blob" style={{ background: 'var(--accentA)' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply blur-xl opacity-40 animate-blob animation-delay-2000" style={{ background: 'var(--accentB)' }} />
        <div className="absolute top-40 left-40 w-80 h-80 rounded-full mix-blend-multiply blur-xl opacity-40 animate-blob animation-delay-4000" style={{ background: 'var(--accentC)' }} />
      </div>

      {/* grid overlay */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl p-8 shadow-2xl backdrop-blur-xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          {/* header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 border shadow-lg bg-white/80 border-gray-200 overflow-hidden">
              <div className="relative w-16 h-16">
                <Image src="/OptichainLogo2.png" alt="OptiChain" fill sizes="48px" priority className="object-cover object-[50%_50%]" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight text-gray-900">Welcome to OptiChain</h1>
            <p className="text-sm font-medium text-gray-500">Your Smart Inventory Copilot</p>
          </div>

          {/* sign-in area */}
          {mode === 'loading' && (
            <div className="grid place-items-center py-4">
              <div className="animate-spin h-8 w-8 rounded-full border-4 border-gray-300 border-t-transparent" />
            </div>
          )}

          {/* Debug mode switcher (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">🔧 Debug Mode Switcher</p>
              <div className="flex gap-2">
                <button
                  onClick={forceWebMode}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Force Web Mode
                </button>
                <button
                  onClick={forceLiffMode}
                  className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Force LINE Mode
                </button>
              </div>
              <p className="text-xs text-yellow-600 mt-1">Current mode: {mode}</p>
            </div>
          )}

          {mode === 'web' && (
            <div className="space-y-4">
              <div className="transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
                <SignInWithGoogle />
              </div>
            </div>
          )}

          {mode === 'liff' && (
            <div className="space-y-4">
              {liffError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {liffError}
                </div>
              )}
              <button
                type="button"
                onClick={onLineClick}
                disabled={liffLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 hover:opacity-90 transition-colors min-h-[44px] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
                aria-label="Continue with LINE"
              >
                {liffLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                    Authenticating...
                  </>
                ) : (
                  'Continue with LINE'
                )}
              </button>
            </div>
          )}

          {/* features (optional, keep as-is) */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="group cursor-default">
                <div className="w-8 h-8 mx-auto mb-2 text-gray-500 group-hover:text-gray-800 transition-colors">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600 group-hover:text-gray-800 font-medium">Analytics</p>
              </div>
              <div className="group cursor-default">
                <div className="w-8 h-8 mx-auto mb-2 text-gray-500 group-hover:text-gray-800 transition-colors">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600 group-hover:text-gray-800 font-medium">Scanning</p>
              </div>
              <div className="group cursor-default">
                <div className="w-8 h-8 mx-auto mb-2 text-gray-500 group-hover:text-gray-800 transition-colors">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 1v6m6-6v6" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600 group-hover:text-gray-800 font-medium">Inventory</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--muted)' }}>
          Streamline your inventory management with AI-powered insights
        </p>
      </div>
    </div>
  )
}
