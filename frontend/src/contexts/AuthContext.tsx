'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import liff from '@line/liff'

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
  isDevMode: boolean
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

  // Initialize authentication once when the app starts
  useEffect(() => {
    if (initialized) return
    
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing authentication...', { isDevelopment })
      
      try {
        // Check if we have a stored user first
        const devUser = localStorage.getItem('devUser')
        const lineUser = localStorage.getItem('lineUser')
        const lineBrowserUser = localStorage.getItem('lineBrowserUser')
        
        console.log('[AuthContext] Checking stored users:', {
          devUser: !!devUser,
          lineUser: !!lineUser,
          lineBrowserUser: !!lineBrowserUser
        })
        
        if (lineBrowserUser) {
          console.log('[AuthContext] lineBrowserUser content:', lineBrowserUser)
        }
        
        const storedUser = devUser || lineUser || lineBrowserUser
        if (storedUser) {
          try {
            const storedUserData = JSON.parse(storedUser)
            console.log('[AuthContext] Found stored user:', storedUserData.id, 'source:', storedUserData.source)
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
          console.log('[AuthContext] Development mode active - skipping LINE authentication')
          setLoading(false)
          setInitialized(true)
          return
        }

        // Only initialize LINE authentication in production mode
        // and only if LINE LIFF ID is configured
        if (process.env.NEXT_PUBLIC_LINE_LIFF_ID) {
          await initLiffAuth()
        } else {
          console.log('[AuthContext] No LINE LIFF ID configured - skipping LINE authentication')
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

  // Listen for visibility changes to re-check localStorage (useful for OAuth callbacks)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && initialized) {
        console.log('[AuthContext] Page became visible, re-checking localStorage...')
        
        // Re-check for stored users
        const devUser = localStorage.getItem('devUser')
        const lineUser = localStorage.getItem('lineUser')
        const lineBrowserUser = localStorage.getItem('lineBrowserUser')
        
        const storedUser = devUser || lineUser || lineBrowserUser
        if (storedUser && !user) {
          try {
            const storedUserData = JSON.parse(storedUser)
            console.log('[AuthContext] Found stored user on visibility change:', storedUserData.id, 'source:', storedUserData.source)
            setUser(storedUserData)
          } catch (parseError) {
            console.error('[AuthContext] Failed to parse stored user on visibility change:', parseError)
          }
        }
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lineBrowserUser' && e.newValue && !user) {
        console.log('[AuthContext] localStorage changed, re-checking lineBrowserUser...')
        try {
          const storedUserData = JSON.parse(e.newValue)
          console.log('[AuthContext] Found stored user from storage event:', storedUserData.id, 'source:', storedUserData.source)
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
        
        console.log('[AuthContext] LIFF user authenticated:', userData)
        setUser(userData)
        
        // Store in localStorage for persistence
        localStorage.setItem('lineUser', JSON.stringify(userData))
      } else {
        console.log('[AuthContext] LIFF user not logged in')
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
    
    const devUser = {
      id: databaseUid,
      displayName: username,
      source: 'dev' as const,
      raw: { username, timestamp: Date.now() },
      databaseUid: databaseUid // Store the actual database UID
    }

    console.log('[AuthContext] Dev user signed in:', devUser)
    setUser(devUser)
    localStorage.setItem('devUser', JSON.stringify(devUser))
    localStorage.removeItem('lineUser') // Clear any LINE user data
    localStorage.removeItem('lineBrowserUser') // Clear any LINE browser user data
  }

  const signInLineBrowser = async () => {
    try {
      // LINE OAuth configuration
      const clientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID
      const redirectUri = `${window.location.origin}/auth/line/callback`
      
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

      console.log('[AuthContext] Redirecting to LINE OAuth:', lineAuthUrl.toString())
      
      // Redirect to LINE OAuth
      window.location.href = lineAuthUrl.toString()
    } catch (error) {
      console.error('[AuthContext] LINE browser authentication failed:', error)
      throw error
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
              console.log('[AuthContext] LINE logout successful')
            }
          }
        } catch (error) {
          console.log('[AuthContext] LINE logout failed')
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
      console.log('[AuthContext] Logout completed successfully')
    } catch (error) {
      console.error('[AuthContext] Logout error:', error)
    }
  }

  const refreshUser = async () => {
    console.log('[AuthContext] Refreshing user...')
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

  const value: AuthContextType = {
    user,
    loading,
    signOut,
    refreshUser,
    signInDev,
    signInLineBrowser,
    isDevMode: isDevelopment,
  }

  console.log('[AuthContext] Current state:', { 
    user: user?.id, 
    loading, 
    source: user?.source,
    initialized,
    isDevMode: isDevelopment
  })

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
