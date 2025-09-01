'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import liff from '@line/liff'

type AuthUser = {
  id: string
  displayName?: string
  source: 'line'
  raw?: any
} | null

type AuthContextType = {
  user: AuthUser
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Initialize authentication once when the app starts
  useEffect(() => {
    if (initialized) return
    
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing LINE authentication...')
      
      try {
        // Check if we have a stored LINE user first
        const storedLineUser = localStorage.getItem('lineUser')
        if (storedLineUser) {
          try {
            const lineUser = JSON.parse(storedLineUser)
            console.log('[AuthContext] Found stored LINE user:', lineUser.id)
            setUser(lineUser)
            setLoading(false)
            setInitialized(true)
            return
          } catch (parseError) {
            console.error('[AuthContext] Failed to parse stored LINE user:', parseError)
            localStorage.removeItem('lineUser')
          }
        }

        // Initialize LIFF authentication
        await initLiffAuth()
      } catch (error) {
        console.error('[AuthContext] Authentication initialization failed:', error)
        setLoading(false)
      } finally {
        setInitialized(true)
      }
    }

    initializeAuth()
  }, [initialized])

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

  const signOut = async () => {
    try {
      // Try LINE logout
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

      // Clear stored data
      localStorage.removeItem('lineUser')
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
      await initLiffAuth()
    } catch (error) {
      console.error('[AuthContext] Failed to refresh user:', error)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signOut,
    refreshUser,
  }

  console.log('[AuthContext] Current state:', { 
    user: user?.id, 
    loading, 
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
