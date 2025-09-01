'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import liff from '@line/liff'

type HybridUser =
    | { id: string; displayName?: string; source: 'supabase' | 'line'; raw?: any }
    | null

export function useHybridAuth() {
    const [user, setUser] = useState<HybridUser>(null)
    const [loading, setLoading] = useState(true)
    const [authSource, setAuthSource] = useState<'supabase' | 'line' | null>(null)

    useEffect(() => {
        let mounted = true

        const init = async () => {
            console.log('[useHybridAuth] Initializing...')
            
            try {
                // First, check if we're in a LINE LIFF context
                const isLiffContext = await checkLiffContext()
                
                if (isLiffContext && mounted) {
                    // We're in LINE context, use LIFF authentication
                    await initLiffAuth()
                } else if (mounted) {
                    // We're in web context, use Supabase authentication
                    await initSupabaseAuth()
                }
            } catch (error) {
                console.error('[useHybridAuth] Initialization error:', error)
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        init()

        return () => {
            mounted = false
        }
    }, [])

    const checkLiffContext = async (): Promise<boolean> => {
        try {
            // Check if we're in a LINE LIFF context
            const params = new URLSearchParams(window.location.search)
            const hasLiffState = params.has('liff.state')
            const hasLiffReferrer = /liff\.line\.me/i.test(document.referrer)
            const isInLineApp = /line/i.test(navigator.userAgent) || window.location.hostname.includes('liff.line.me')
            
            // Remove the isLiffRoute check as it incorrectly forces LINE auth for all /liff routes
            // const isLiffRoute = window.location.pathname.startsWith('/liff')
            
            const looksLikeLiff = hasLiffState || hasLiffReferrer || isInLineApp
            
            console.log('[useHybridAuth] LINE context check:', {
                hasLiffState,
                hasLiffReferrer,
                isInLineApp,
                pathname: window.location.pathname,
                looksLikeLiff,
                liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID
            })
            
            if (looksLikeLiff && process.env.NEXT_PUBLIC_LINE_LIFF_ID) {
                console.log('[useHybridAuth] LINE context detected')
                return true
            }
            
            console.log('[useHybridAuth] Web context detected')
            return false
        } catch (error) {
            console.error('[useHybridAuth] Error checking LIFF context:', error)
            return false
        }
    }

    const initLiffAuth = async () => {
        try {
            console.log('[useHybridAuth] Initializing LIFF authentication...')
            
            // Initialize LIFF
            await liff.init({
                liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID!,
                withLoginOnExternalBrowser: true,
            })

            if (liff.isLoggedIn()) {
                // User is logged in to LINE
                const profile = await liff.getProfile()
                const userData = {
                    id: profile.userId,
                    displayName: profile.displayName || 'LINE User',
                    source: 'line' as const,
                    raw: profile,
                }
                
                console.log('[useHybridAuth] LIFF user authenticated:', userData)
                setUser(userData)
                setAuthSource('line')
                
                // Store LINE user info in localStorage for persistence across page navigation
                localStorage.setItem('lineUser', JSON.stringify(userData))
            } else {
                console.log('[useHybridAuth] LIFF user not logged in')
                setUser(null)
                setAuthSource('line')
                localStorage.removeItem('lineUser')
            }
        } catch (error) {
            console.error('[useHybridAuth] LIFF initialization failed:', error)
            // Try to get user from localStorage if LIFF init fails
            const storedUser = localStorage.getItem('lineUser')
            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser)
                    console.log('[useHybridAuth] Using stored LINE user:', userData)
                    setUser(userData)
                    setAuthSource('line')
                } catch (parseError) {
                    console.error('[useHybridAuth] Failed to parse stored user:', parseError)
                    localStorage.removeItem('lineUser')
                }
            } else {
                // Fallback to Supabase
                await initSupabaseAuth()
            }
        } finally {
            setLoading(false)
        }
    }

    const initSupabaseAuth = async () => {
        try {
            console.log('[useHybridAuth] Initializing Supabase authentication...')
            
            const { data: { session }, error } = await supabase.auth.getSession()
            
            if (error) {
                console.error('[useHybridAuth] Error getting Supabase session:', error)
                setUser(null)
                setAuthSource('supabase')
                return
            }

            console.log('[useHybridAuth] Supabase session check result:', { 
                hasSession: !!session, 
                userId: session?.user?.id
            })

            if (session?.user) {
                const u = session.user
                const userData = {
                    id: u.id,
                    displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'User',
                    source: 'supabase' as const,
                    raw: u,
                }
                console.log('[useHybridAuth] Setting Supabase user:', userData)
                setUser(userData)
                setAuthSource('supabase')
            } else {
                console.log('[useHybridAuth] No Supabase session, setting user to null')
                setUser(null)
                setAuthSource('supabase')
            }
        } catch (error) {
            console.error('[useHybridAuth] Unexpected error in Supabase auth init:', error)
            setUser(null)
            setAuthSource('supabase')
        } finally {
            console.log('[useHybridAuth] Setting loading to false')
            setLoading(false)
        }
    }

    // Listen for Supabase auth changes (only if using Supabase)
    useEffect(() => {
        if (authSource !== 'supabase') return

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[useHybridAuth] Supabase auth state change:', { event, userId: session?.user?.id })
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                if (session?.user) {
                    const u = session.user
                    const userData = {
                        id: u.id,
                        displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'User',
                        source: 'supabase' as const,
                        raw: u,
                    }
                    console.log('[useHybridAuth] Setting user from Supabase auth change:', userData)
                    setUser(userData)
                }
            } else if (event === 'SIGNED_OUT') {
                console.log('[useHybridAuth] User signed out from Supabase')
                setUser(null)
            }
            
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [authSource])

    console.log('[useHybridAuth] Current state:', { 
        user: user?.id, 
        loading, 
        authSource,
        source: user?.source 
    })

    return { user, loading, authSource }
}