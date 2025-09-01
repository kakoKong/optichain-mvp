'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import liff from '@line/liff'

type AuthUser = {
  id: string
  displayName?: string
  source: 'supabase' | 'line'
  raw?: any
} | null

type AuthContextType = {
  user: AuthUser
  loading: boolean
  authSource: 'supabase' | 'line' | null
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null)
  const [loading, setLoading] = useState(true)
  const [authSource, setAuthSource] = useState<'supabase' | 'line' | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Initialize authentication once when the app starts
  useEffect(() => {
    if (initialized) return
    
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing authentication...')
      
      try {
        // Check if we have a stored LINE user first
        const storedLineUser = localStorage.getItem('lineUser')
        if (storedLineUser) {
          try {
            const lineUser = JSON.parse(storedLineUser)
            console.log('[AuthContext] Found stored LINE user:', lineUser.id)
            setUser(lineUser)
            setAuthSource('line')
            setLoading(false)
            setInitialized(true)
            return
          } catch (parseError) {
            console.error('[AuthContext] Failed to parse stored LINE user:', parseError)
            localStorage.removeItem('lineUser')
          }
        }

        // Check if we're in a LINE context
        const isLiffContext = await checkLiffContext()
        
        if (isLiffContext && process.env.NEXT_PUBLIC_LINE_LIFF_ID) {
          console.log('[AuthContext] LINE context detected, initializing LIFF...')
          await initLiffAuth()
        } else {
          console.log('[AuthContext] Web context detected, initializing Supabase...')
          await initSupabaseAuth()
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

  const checkLiffContext = async (): Promise<boolean> => {
    try {
      const params = new URLSearchParams(window.location.search)
      const hasLiffState = params.has('liff.state')
      const hasLiffReferrer = /liff\.line\.me/i.test(document.referrer)
      const isInLineApp = /line/i.test(navigator.userAgent) || window.location.hostname.includes('liff.line.me')
      
      // Remove the isLiffRoute check as it incorrectly forces LINE auth for all /liff routes
      // const isLiffRoute = window.location.pathname.startsWith('/liff')
      
      const looksLikeLiff = hasLiffState || hasLiffReferrer || isInLineApp
      
      console.log('[AuthContext] LINE context check:', {
        hasLiffState,
        hasLiffReferrer,
        isInLineApp,
        pathname: window.location.pathname,
        looksLikeLiff
      })
      
      return looksLikeLiff
    } catch (error) {
      console.error('[AuthContext] Error checking LIFF context:', error)
      return false
    }
  }

  const initLiffAuth = async () => {
    try {
      await liff.init({
        liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID!,
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
        setAuthSource('line')
        
        // Store in localStorage for persistence
        localStorage.setItem('lineUser', JSON.stringify(userData))
      } else {
        console.log('[AuthContext] LIFF user not logged in')
        setUser(null)
        setAuthSource('line')
      }
    } catch (error) {
      console.error('[AuthContext] LIFF initialization failed:', error)
      // Fallback to Supabase
      await initSupabaseAuth()
    } finally {
      setLoading(false)
    }
  }

  const initSupabaseAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('[AuthContext] Error getting Supabase session:', error)
        setUser(null)
        setAuthSource('supabase')
        return
      }

      if (session?.user) {
        const u = session.user
        const userData = {
          id: u.id,
          displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'User',
          source: 'supabase' as const,
          raw: u,
        }
        console.log('[AuthContext] Supabase user authenticated:', userData)
        setUser(userData)
        setAuthSource('supabase')
      } else {
        console.log('[AuthContext] No Supabase session')
        setUser(null)
        setAuthSource('supabase')
      }
    } catch (error) {
      console.error('[AuthContext] Supabase initialization failed:', error)
      setUser(null)
      setAuthSource('supabase')
    } finally {
      setLoading(false)
    }
  }

  // Listen for Supabase auth changes (only if using Supabase)
  useEffect(() => {
    if (authSource !== 'supabase') return

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Supabase auth state change:', { event, userId: session?.user?.id })
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          const u = session.user
          const userData = {
            id: u.id,
            displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'User',
            source: 'supabase' as const,
            raw: u,
          }
          console.log('[AuthContext] Setting user from Supabase auth change:', userData)
          setUser(userData)
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] User signed out from Supabase')
        setUser(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [authSource])

  const signOut = async () => {
    try {
      let logoutSuccess = false

      // Try Supabase logout
      if (authSource === 'supabase') {
        try {
          const { error } = await supabase.auth.signOut()
          if (!error) {
            console.log('[AuthContext] Supabase logout successful')
            logoutSuccess = true
          }
        } catch (error) {
          console.log('[AuthContext] Supabase logout failed')
        }
      }

      // Try LINE logout
      if (authSource === 'line') {
        try {
          if (process.env.NEXT_PUBLIC_LINE_LIFF_ID) {
            await liff.init({ liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID })
            if (liff.isLoggedIn()) {
              liff.logout()
              console.log('[AuthContext] LINE logout successful')
              logoutSuccess = true
            }
          }
        } catch (error) {
          console.log('[AuthContext] LINE logout failed')
        }
      }

      // Clear stored data
      localStorage.removeItem('lineUser')
      sessionStorage.removeItem('postLoginRedirect')
      localStorage.removeItem('recentScans')

      // Reset state
      setUser(null)
      setAuthSource(null)

      if (logoutSuccess) {
        console.log('[AuthContext] Logout completed successfully')
      }
    } catch (error) {
      console.error('[AuthContext] Logout error:', error)
    }
  }

  const refreshUser = async () => {
    console.log('[AuthContext] Refreshing user...')
    setLoading(true)
    
    try {
      if (authSource === 'line') {
        await initLiffAuth()
      } else if (authSource === 'supabase') {
        await initSupabaseAuth()
      }
    } catch (error) {
      console.error('[AuthContext] Failed to refresh user:', error)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    authSource,
    signOut,
    refreshUser,
  }

  console.log('[AuthContext] Current state:', { 
    user: user?.id, 
    loading, 
    authSource,
    source: user?.source,
    initialized
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
