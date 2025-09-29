// frontend/app/liff/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import liff from '@line/liff'

export default function LiffPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    initializeLiff()
  }, [])

  const initializeLiff = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if we already have a Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // User is already authenticated with Supabase, redirect to dashboard
        router.replace('/app/dashboard')
        return
      }

      // Initialize LIFF
      if (!process.env.NEXT_PUBLIC_LINE_LIFF_ID) {
        throw new Error('LIFF ID not configured')
      }

      await liff.init({
        liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID,
        withLoginOnExternalBrowser: true,
      })

      if (liff.isLoggedIn()) {
        // User is logged in to LINE, now authenticate with Supabase
        await authenticateWithSupabase()
      } else {
        // User needs to login to LINE first
        setLoading(false)
      }
    } catch (error) {
      console.error('LIFF initialization failed:', error)
      setError('Failed to initialize LINE login')
      setLoading(false)
    }
  }

  const authenticateWithSupabase = async () => {
    try {
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
        const profile = await liff.getProfile()
        setUserProfile(profile)
        
        // Determine the intended destination from the LIFF URL
        const currentUrl = window.location.href
        console.log('LIFF authentication - Current URL:', currentUrl)
        console.log('LIFF authentication - Current pathname:', window.location.pathname)
        
        let intendedRoute = '/dashboard' // default to dashboard
        
        // Check if there's a specific route in the LIFF URL
        if (currentUrl.includes('/liff/')) {
          const urlPath = new URL(currentUrl).pathname
          console.log('LIFF authentication - URL path:', urlPath)
          
          if (urlPath.includes('/liff/')) {
            const liffPath = urlPath.split('/liff/')[1]
            console.log('LIFF authentication - LIFF path:', liffPath)
            
            if (liffPath && liffPath !== 'login') {
              intendedRoute = `/liff/${liffPath}`
              console.log('LIFF authentication - Setting intended route to:', intendedRoute)
            }
          }
        }
        // If no specific path (just /liff), default to dashboard
        
        // Check if there's a stored redirect preference
        const storedRedirect = sessionStorage.getItem('postLoginRedirect')
        if (storedRedirect) {
          intendedRoute = storedRedirect
          sessionStorage.removeItem('postLoginRedirect')
          console.log('LIFF authentication - Using stored redirect:', intendedRoute)
        }
        
        console.log('LIFF authentication successful, checking business status...')
        
        // Check if user has a business before redirecting
        try {
          const { data: { user: supabaseUser } } = await supabase.auth.getUser()
          if (supabaseUser) {
            // Check if user has any business (as owner or member)
            const [{ data: ownedBusinesses }, { data: memberships }] = await Promise.all([
              supabase.from('businesses').select('id').eq('owner_id', supabaseUser.id),
              supabase.from('business_members').select('id').eq('user_id', supabaseUser.id)
            ])

            const hasBusiness = (ownedBusinesses?.length ?? 0) > 0 || (memberships?.length ?? 0) > 0

            if (!hasBusiness) {
              console.log('User has no business, redirecting to onboarding')
              intendedRoute = '/onboarding'
            } else {
              console.log('User has business, using intended route:', intendedRoute)
            }
          }
        } catch (error) {
          console.error('Error checking business status:', error)
          // Continue with intended route if check fails
        }
        
        // Redirect to the intended route
        setTimeout(() => {
          router.replace(intendedRoute)
        }, 1000)
      }
    } catch (error) {
      console.error('Supabase authentication failed:', error)
      setError('Failed to authenticate with LINE')
      setLoading(false)
    }
  }

  const loginWithLine = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Preserve the current URL as the redirect URI
      const redirectUri = window.location.href
      console.log('LINE login with redirect URI:', redirectUri)
      
      // This will redirect to LINE login
      liff.login({ 
        redirectUri: redirectUri
      })
    } catch (error) {
      console.error('LINE login failed:', error)
      setError('Failed to start LINE login')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Initializing LINE login...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">📦 Inventory Copilot</h1>
          <p className="text-gray-600">Sign in with LINE to continue</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <button
            onClick={loginWithLine}
            className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V6.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V6.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v6.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V6.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v6.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V6.108c0-.345.285-.63.63-.63h2.386c.345 0 .63.285.63.63v6.771c0 .344-.285.629-.63.629z"/>
            </svg>
            Continue with LINE
          </button>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              You'll be redirected to LINE to complete the sign-in process
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
