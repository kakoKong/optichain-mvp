'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import liff from '@line/liff'
import { supabase } from '@/lib/supabase'

type AuthUser = {
  id: string
  displayName?: string
  source: 'line' | 'line_browser' | 'dev'
  raw?: any
  databaseUid?: string // Add this field for the actual database UID
} | null

type AuthContextType = {
  user: AuthUser
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  signInDev: (username: string) => Promise<void>
  signInLineBrowser: () => Promise<void>
  signInLineLiff: () => Promise<void>
  isDevMode: boolean
  isLineContext: boolean | null
  liffError: string | null
  liffLoading: boolean
  browserLoading: boolean
  resolveAppUserId: (user: AuthUser) => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.NEXT_PUBLIC_DEV_MODE === 'true' ||
                     (typeof window !== 'undefined' && window.location.hostname === 'localhost')

console.log('[AuthContext] Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE,
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
  isDevelopment
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [isLineContext, setIsLineContext] = useState<boolean | null>(null)
  const [liffError, setLiffError] = useState<string | null>(null)
  const [liffLoading, setLiffLoading] = useState(false)
  const [browserLoading, setBrowserLoading] = useState(false)

  // Initialize authentication once when the app starts
  useEffect(() => {
    if (initialized) return
    
    const initializeAuth = async () => {
      try {
        // Check if we have a stored user first
        const devUser = localStorage.getItem('devUser')
        const lineUser = localStorage.getItem('lineUser')
        const lineBrowserUser = localStorage.getItem('lineBrowserUser')
        
        const storedUser = devUser || lineUser || lineBrowserUser
        if (storedUser) {
          try {
            const storedUserData = JSON.parse(storedUser)
            setUser(storedUserData)
            setLoading(false)
            setInitialized(true)
            return
          } catch (parseError) {
            console.error('[AuthContext] Failed to parse stored user:', parseError)
            localStorage.removeItem('devUser')
            localStorage.removeItem('lineUser')
            localStorage.removeItem('lineBrowserUser')
          }
        }

        // In development mode, prioritize dev authentication
        if (isDevelopment) {
          const devUser = localStorage.getItem('devUser')
          if (devUser) {
            try {
              const devUserData = JSON.parse(devUser)
              setUser(devUserData)
              setLoading(false)
              setInitialized(true)
              return
            } catch (error) {
              console.error('[AuthContext] Failed to parse dev user:', error)
              localStorage.removeItem('devUser')
            }
          }
          
          // In dev mode, don't initialize LINE authentication at all
          // Just set loading to false and let user use dev login
          setLoading(false)
          setInitialized(true)
          return
        }

        // Only initialize LINE authentication in production mode
        // and only if LINE LIFF ID is configured
        if (process.env.NEXT_PUBLIC_LINE_LIFF_ID) {
          await initLiffAuth()
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('[AuthContext] Authentication initialization failed:', error)
        setLoading(false)
      } finally {
        setInitialized(true)
      }
    }

    initializeAuth()
  }, [initialized])

  // Detect LINE context when AuthProvider mounts (only in /app routes)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/app')) {
      detectLineContext()
    }
  }, [])

  // Listen for visibility changes to re-check localStorage (useful for OAuth callbacks)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && initialized) {
        // Re-check for stored users
        const devUser = localStorage.getItem('devUser')
        const lineUser = localStorage.getItem('lineUser')
        const lineBrowserUser = localStorage.getItem('lineBrowserUser')
        
        const storedUser = devUser || lineUser || lineBrowserUser
        if (storedUser && !user) {
          try {
            const storedUserData = JSON.parse(storedUser)
            setUser(storedUserData)
          } catch (parseError) {
            console.error('[AuthContext] Failed to parse stored user on visibility change:', parseError)
          }
        }
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lineBrowserUser' && e.newValue && !user) {
        try {
          const storedUserData = JSON.parse(e.newValue)
          setUser(storedUserData)
        } catch (parseError) {
          console.error('[AuthContext] Failed to parse stored user from storage event:', parseError)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)
    window.addEventListener('storage', handleStorageChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [initialized, user])

  const initLiffAuth = async () => {
    try {
      if (!process.env.NEXT_PUBLIC_LINE_LIFF_ID) {
        throw new Error('LINE LIFF ID not configured')
      }

      await liff.init({
        liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID,
        withLoginOnExternalBrowser: true,
      })

      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile()
        const userData = {
          id: profile.userId,
          displayName: profile.displayName || 'LINE User',
          source: 'line' as const,
          raw: profile,
        }
        
        setUser(userData)
        
        // Store in localStorage for persistence
        localStorage.setItem('lineUser', JSON.stringify(userData))
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('[AuthContext] LIFF initialization failed:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signInDev = async (username: string) => {
    if (!isDevelopment) {
      throw new Error('Dev authentication only available in development mode')
    }

    // Use the specific UID from the database for dev users
    const databaseUid = '50d054d6-4e1c-4157-b231-5b8e9d321913'
    
    // Ensure the dev user profile exists in the database
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', databaseUid)
        .single()

      if (!existingProfile) {
        const { error } = await supabase
          .from('profiles')
          .insert([{
            id: databaseUid,
            full_name: username,
            email: `${username}@dev.local`,
            phone: '+66-123-456-789',
            line_user_id: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])

        if (error) {
          console.error('[AuthContext] Failed to create dev user profile:', error)
          throw new Error('Failed to create dev user profile in database')
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error ensuring dev user profile exists:', error)
      throw new Error('Failed to ensure dev user profile exists')
    }
    
    const devUser = {
      id: databaseUid,
      displayName: username,
      source: 'dev' as const,
      raw: { username, timestamp: Date.now() },
      databaseUid: databaseUid // Store the actual database UID
    }

    setUser(devUser)
    localStorage.setItem('devUser', JSON.stringify(devUser))
    localStorage.removeItem('lineUser') // Clear any LINE user data
    localStorage.removeItem('lineBrowserUser') // Clear any LINE browser user data
  }

  const signInLineBrowser = async () => {
    try {
      setBrowserLoading(true)
      setLiffError(null)
      
      // LINE OAuth configuration
      const clientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID
      const redirectUri = `${window.location.origin}/app/auth/line/callback`
      
      if (!clientId) {
        throw new Error('LINE Client ID not configured')
      }

      // Generate state parameter for security
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('lineOAuthState', state)

      // Build LINE OAuth URL
      const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize')
      lineAuthUrl.searchParams.set('response_type', 'code')
      lineAuthUrl.searchParams.set('client_id', clientId)
      lineAuthUrl.searchParams.set('redirect_uri', redirectUri)
      lineAuthUrl.searchParams.set('state', state)
      lineAuthUrl.searchParams.set('scope', 'profile openid')
      lineAuthUrl.searchParams.set('nonce', Math.random().toString(36).substring(2, 15))

      // Redirect to LINE OAuth
      window.location.href = lineAuthUrl.toString()
    } catch (error) {
      console.error('[AuthContext] LINE browser authentication failed:', error)
      setLiffError('Failed to start LINE browser login. Please try again.')
      setBrowserLoading(false)
      throw error
    }
  }

  const signInLineLiff = async () => {
    try {
      setLiffLoading(true)
      setLiffError(null)
      
      // Always try to initialize LIFF if not already done
      try {
        await liff.init({
          liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID!,
          withLoginOnExternalBrowser: true,
        })
      } catch (initError) {
        // If already initialized, this will fail but that's okay
      }
      
      if (!liff.isLoggedIn()) {
        // Check for redirect parameter to preserve intended destination
        const params = new URLSearchParams(window.location.search)
        const next = params.get('next') || '/app/dashboard'
        
        console.log('[AuthContext] LIFF login redirect parameters:', {
          url: window.location.href,
          search: window.location.search,
          next: next,
          decoded: decodeURIComponent(next)
        })
        
        // Store the intended destination for other components to use
        sessionStorage.setItem('postLoginRedirect', next)
        
        // This will redirect to LINE login
        liff.login({ 
          redirectUri: window.location.origin + next
        })
      } else {
        // Check for redirect parameter first
        const params = new URLSearchParams(window.location.search)
        const next = params.get('next') || '/app/dashboard'
        
        console.log('[AuthContext] LIFF already logged in redirect parameters:', {
          url: window.location.href,
          search: window.location.search,
          next: next,
          decoded: decodeURIComponent(next)
        })
        
        // Store the intended destination for other components to use
        sessionStorage.setItem('postLoginRedirect', next)
        
        // User is already logged in, redirect to intended destination
        window.location.href = next
      }
    } catch (error) {
      console.error('[AuthContext] LINE LIFF login failed:', error)
      setLiffError('Failed to start LINE login. Please try again.')
      setLiffLoading(false)
      throw error
    }
  }

  const detectLineContext = async () => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const hasLiffState = params.has('liff.state')
    const hasLiffReferrer = /liff\.line\.me/i.test(document.referrer)
    const isInLineApp = /line/i.test(navigator.userAgent) || window.location.hostname.includes('liff.line.me')
    
    // More comprehensive LINE detection
    const looksLikeLiff = hasLiffState || hasLiffReferrer || isInLineApp

    if (looksLikeLiff && process.env.NEXT_PUBLIC_LINE_LIFF_ID) {
      setIsLineContext(true)
      
      try {
        await liff.init({
          liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID,
          withLoginOnExternalBrowser: true,
        })
        
        // Check if user is already logged in to LINE
        if (liff.isLoggedIn()) {
          // Check for redirect parameter first
          const params = new URLSearchParams(window.location.search)
          const next = params.get('next') || '/app/dashboard'
          
          console.log('[AuthContext] detectLineContext redirect parameters:', {
            url: window.location.href,
            search: window.location.search,
            next: next,
            decoded: decodeURIComponent(next)
          })
          
          // Store the intended destination for other components to use
          sessionStorage.setItem('postLoginRedirect', next)
          
          // User is already logged in, redirect to intended destination
          window.location.href = next
          return
        }
      } catch (error) {
        console.error('[AuthContext] LIFF initialization failed:', error)
        setLiffError('Failed to initialize LINE login')
      }
    } else {
      setIsLineContext(false)
    }
  }

  const signOut = async () => {
    try {
      // Try LINE logout if user is from LINE
      if (user?.source === 'line') {
        try {
          if (process.env.NEXT_PUBLIC_LINE_LIFF_ID) {
            await liff.init({ liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID })
            if (liff.isLoggedIn()) {
              liff.logout()
            }
          }
        } catch (error) {
          console.error('[AuthContext] LINE logout failed')
        }
      }

      // Clear stored data
      localStorage.removeItem('lineUser')
      localStorage.removeItem('lineBrowserUser')
      localStorage.removeItem('devUser')
      localStorage.removeItem('lineOAuthState')
      sessionStorage.removeItem('postLoginRedirect')
      localStorage.removeItem('recentScans')

      // Reset state
      setUser(null)
    } catch (error) {
      console.error('[AuthContext] Logout error:', error)
    }
  }

  const refreshUser = async () => {
    setLoading(true)
    
    try {
      if (user?.source === 'dev') {
        // For dev users, just reload from localStorage
        const devUser = localStorage.getItem('devUser')
        if (devUser) {
          setUser(JSON.parse(devUser))
        } else {
          setUser(null)
        }
      } else {
        // For LINE users, refresh through LIFF
        await initLiffAuth()
      }
    } catch (error) {
      console.error('[AuthContext] Failed to refresh user:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveAppUserId = async (u: AuthUser): Promise<string | null> => {
    if (!u) return null
    
    // For dev users: use the databaseUid directly
    if (u.source === 'dev' && u.databaseUid) {
      return u.databaseUid
    }

    // For LINE users: map line_user_id to profile ID
    if (u.source === 'line' || u.source === 'line_browser') {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('line_user_id', u.id)
        .single()
      
      return data?.id ?? null
    }

    return null
  }

  const value: AuthContextType = {
    user,
    loading,
    signOut,
    refreshUser,
    signInDev,
    signInLineBrowser,
    signInLineLiff,
    isDevMode: isDevelopment,
    isLineContext,
    liffError,
    liffLoading,
    browserLoading,
    resolveAppUserId,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
