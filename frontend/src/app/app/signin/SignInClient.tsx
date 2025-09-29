'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import liff from '@line/liff'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function SignInPage() {
  const [liffError, setLiffError] = useState<string | null>(null)
  const [liffLoading, setLiffLoading] = useState(false)
  const [browserLoading, setBrowserLoading] = useState(false)
  const [isLineContext, setIsLineContext] = useState<boolean | null>(null)
  const router = useRouter()
  const { signInLineBrowser, user, loading, refreshUser } = useAuth()

  // Check if user is already authenticated
  useEffect(() => {
    console.log('[SignInClient] Auth state changed:', { loading, user: user?.id, userSource: user?.source })
    if (!loading && user) {
      console.log('[SignInClient] User already authenticated, redirecting to dashboard:', user.id)
      router.replace('/app/dashboard')
    }
  }, [loading, user, router])

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
        setIsLineContext(true)
        
        try {
          await liff.init({
            liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID,
            withLoginOnExternalBrowser: true,
          })
          
          if (!mounted) return
          
          console.log('[SignInClient] LIFF initialized successfully')
          
          // Check if user is already logged in to LINE
          if (liff.isLoggedIn()) {
            console.log('[SignInClient] User already logged in to LINE, redirecting to dashboard...')
            // User is already logged in, redirect to dashboard
            router.replace('/app/dashboard')
            return
          }
        } catch (error) {
          console.error('[SignInClient] LIFF initialization failed:', error)
          setLiffError('Failed to initialize LINE login')
        }
      } else {
        console.log('[SignInClient] No LINE context detected, using browser authentication')
        setIsLineContext(false)
      }
    }
    
    decide()
    return () => { mounted = false }
  }, [router])

  const onLineLiffClick = async () => {
    try {
      setLiffError(null)
      setLiffLoading(true)
      
      // Always try to initialize LIFF if not already done
      try {
        await liff.init({
          liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID!,
          withLoginOnExternalBrowser: true,
        })
      } catch (initError) {
        // If already initialized, this will fail but that's okay
        console.log('[SignInClient] LIFF already initialized or init failed:', initError)
      }
      
      if (!liff.isLoggedIn()) {
        // This will redirect to LINE login
        liff.login({ 
          redirectUri: window.location.origin + '/app/dashboard'
        })
      } else {
        // User is already logged in, redirect to dashboard
        router.replace('/app/dashboard')
      }
    } catch (error) {
      console.error('LINE LIFF login failed:', error)
      setLiffError('Failed to start LINE login. Please try again.')
      setLiffLoading(false)
    }
  };

  const onLineBrowserClick = async () => {
    try {
      setLiffError(null)
      setBrowserLoading(true)
      await signInLineBrowser()
    } catch (error) {
      console.error('LINE browser login failed:', error)
      setLiffError('Failed to start LINE browser login. Please try again.')
      setBrowserLoading(false)
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

          {/* LINE sign-in area */}
          <div className="space-y-4">
            {liffError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {liffError}
              </div>
            )}
            
            {/* Show loading while detecting context */}
            {isLineContext === null && (
              <div className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 min-h-[44px] text-gray-600">
                <div className="animate-spin h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600" />
                Detecting login method...
              </div>
            )}

            {/* LINE LIFF Login (for LINE app users only) */}
            {isLineContext === true && (
              <button
                type="button"
                onClick={onLineLiffClick}
                disabled={liffLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 hover:opacity-90 transition-colors min-h-[44px] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(90deg, #00B900, #00A000)' }}
                aria-label="Continue with LINE"
              >
                {liffLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    Continue with LINE
                  </>
                )}
              </button>
            )}

            {/* LINE Browser Login (for regular browser users only) */}
            {isLineContext === false && (
              <button
                type="button"
                onClick={onLineBrowserClick}
                disabled={browserLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 hover:opacity-90 transition-colors min-h-[44px] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
                aria-label="Continue with LINE"
              >
                {browserLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    Continue with LINE
                  </>
                )}
              </button>
            )}

            {/* Debug: Refresh Authentication */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-2">Having trouble? Try refreshing your authentication:</p>
              <button
                onClick={refreshUser}
                className="w-full px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Refresh Authentication
              </button>
              
              {/* Debug info */}
              <div className="mt-2 p-2 bg-white rounded border text-xs">
                <p><strong>Debug Info:</strong></p>
                <p>Loading: {loading ? 'Yes' : 'No'}</p>
                <p>User: {user ? `${user.id} (${user.source})` : 'None'}</p>
                <p>Line Context: {isLineContext === null ? 'Detecting...' : isLineContext ? 'LINE App' : 'Browser'}</p>
                <p>Stored Users:</p>
                <ul className="ml-2">
                  <li>devUser: {typeof window !== 'undefined' && localStorage.getItem('devUser') ? 'Yes' : 'No'}</li>
                  <li>lineUser: {typeof window !== 'undefined' && localStorage.getItem('lineUser') ? 'Yes' : 'No'}</li>
                  <li>lineBrowserUser: {typeof window !== 'undefined' && localStorage.getItem('lineBrowserUser') ? 'Yes' : 'No'}</li>
                </ul>
              </div>
            </div>
          </div>

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