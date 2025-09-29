'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function LineCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        // Check for OAuth errors
        if (error) {
          throw new Error(errorDescription || `OAuth error: ${error}`)
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter')
        }

        // Verify state parameter
        const storedState = localStorage.getItem('lineOAuthState')
        if (!storedState || storedState !== state) {
          throw new Error('Invalid state parameter')
        }

        // Clear the state
        localStorage.removeItem('lineOAuthState')

        // Exchange code for access token
        const tokenResponse = await fetch('/api/auth/line/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirectUri: `${window.location.origin}/app/auth/line/callback`,
          }),
        })

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json()
          throw new Error(errorData.error || 'Failed to exchange code for token')
        }

        const tokenData = await tokenResponse.json()
        const { access_token, id_token } = tokenData

        // Get user profile from LINE
        const profileResponse = await fetch('https://api.line.me/v2/profile', {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        })

        if (!profileResponse.ok) {
          throw new Error('Failed to get LINE profile')
        }

        const profile = await profileResponse.json()

        // Check if user exists in database
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('line_user_id', profile.userId)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          throw new Error('Failed to check user profile')
        }

        let profileId: string

        if (existingProfile) {
          // User exists, update profile
          profileId = existingProfile.id
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              display_name: profile.displayName,
              picture_url: profile.pictureUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profileId)

          if (updateError) {
            console.warn('Failed to update profile:', updateError)
          }
        } else {
          // Create new user profile
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              line_user_id: profile.userId,
              display_name: profile.displayName,
              picture_url: profile.pictureUrl,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (createError) {
            throw new Error('Failed to create user profile')
          }

          profileId = newProfile.id
        }

        // Create user data for AuthContext
        const userData = {
          id: profile.userId,
          displayName: profile.displayName || 'LINE User',
          source: 'line_browser' as const,
          raw: profile,
          databaseUid: profileId,
        }

        // Store user data
        localStorage.setItem('lineBrowserUser', JSON.stringify(userData))
        localStorage.removeItem('lineUser') // Clear LIFF user data
        localStorage.removeItem('devUser') // Clear dev user data

        setStatus('success')
        
        // Redirect to dashboard after a short delay to ensure localStorage is set
        setTimeout(() => {
          console.log('[LineCallback] Redirecting to dashboard...')
          router.push('/app/dashboard')
        }, 1500)

      } catch (err) {
        console.error('LINE callback error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        setStatus('error')
      }
    }

    handleCallback()
  }, [router, searchParams])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Completing LINE authentication...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Authentication Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/app/signin')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Authentication Successful</h1>
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}

export default function LineCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LineCallbackContent />
    </Suspense>
  )
}
