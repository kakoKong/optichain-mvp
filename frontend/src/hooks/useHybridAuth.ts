'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type HybridUser =
    | { id: string; displayName?: string; source: 'supabase' | 'line'; raw?: any }
    | null

export function useHybridAuth() {
    const [user, setUser] = useState<HybridUser>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        const init = async () => {
            console.log('[useHybridAuth] Initializing...')
            try {
                const { data: { session }, error } = await supabase.auth.getSession()
                
                if (error) {
                    console.error('[useHybridAuth] Error getting session:', error)
                    if (mounted) {
                        setUser(null)
                        setLoading(false)
                    }
                    return
                }

                console.log('[useHybridAuth] Session check result:', { 
                    hasSession: !!session, 
                    userId: session?.user?.id,
                    mounted 
                })

                if (session?.user && mounted) {
                    const u = session.user
                    const userData = {
                        id: u.id,
                        displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'User',
                        source: 'supabase' as const,
                        raw: u,
                    }
                    console.log('[useHybridAuth] Setting user:', userData)
                    setUser(userData)
                } else if (mounted) {
                    console.log('[useHybridAuth] No session, setting user to null')
                    setUser(null)
                }
            } catch (error) {
                console.error('[useHybridAuth] Unexpected error in auth init:', error)
                if (mounted) {
                    setUser(null)
                }
            } finally {
                if (mounted) {
                    console.log('[useHybridAuth] Setting loading to false')
                    setLoading(false)
                }
            }
        }

        init()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return

            console.log('[useHybridAuth] Auth state change:', { event, userId: session?.user?.id })
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                if (session?.user) {
                    const u = session.user
                    const userData = {
                        id: u.id,
                        displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'User',
                        source: 'supabase' as const,
                        raw: u,
                    }
                    console.log('[useHybridAuth] Setting user from auth change:', userData)
                    setUser(userData)
                }
            } else if (event === 'SIGNED_OUT') {
                console.log('[useHybridAuth] User signed out, setting to null')
                setUser(null)
            }
            
            setLoading(false)
        })

        return () => {
            console.log('[useHybridAuth] Cleaning up hook')
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    console.log('[useHybridAuth] Current state:', { user: user?.id, loading })

    return { user, loading }
}