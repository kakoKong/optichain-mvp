// hooks/useHybridAuth.ts
'use client'
import { useEffect, useState } from 'react'
import liff from '@line/liff'
import { supabase } from '@/lib/supabase'

type HybridUser =
    | { id: string; displayName?: string; source: 'supabase' | 'line'; raw?: any }
    | null

export function useHybridAuth() {
    const [user, setUser] = useState<HybridUser>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const init = async () => {
            try {
                // 1) Prefer Supabase session (no redirects)
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    const u = session.user
                    setUser({
                        id: u.id,
                        displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'User',
                        source: 'supabase',
                        raw: u,
                    })
                    setLoading(false)
                    return
                }

                // 2) If not signed in and we’re inside LIFF, use LINE
                const isLiff = typeof window !== 'undefined' && (window as any).liff
                const skipLiffAutoLogin =
                    typeof window !== 'undefined' && localStorage.getItem('skipLiffAutoLogin') === '1'

                if (isLiff && !skipLiffAutoLogin) {
                    await liff.init({ liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID! })
                    if (!liff.isLoggedIn()) {
                        liff.login()
                        return
                    }
                    const profile = await liff.getProfile()
                    // Important: since user chose LINE login, allow auto login next time
                    localStorage.removeItem('skipLiffAutoLogin')
                    setUser({ id: profile.userId, displayName: profile.displayName, source: 'line', raw: profile })
                    setLoading(false)
                    return
                }

                setUser(null)
                setLoading(false)
            } catch (e) {
                console.error('Hybrid auth error:', e)
                setUser(null)
                setLoading(false)
            }
        }

        init()

        // IMPORTANT: Don’t reload; just update state.
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                if (session?.user) {
                    const u = session.user
                    setUser({
                        id: u.id,
                        displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'User',
                        source: 'supabase',
                        raw: u,
                    })
                }
            }
            if (event === 'SIGNED_OUT') {
                setUser(null)
            }
        })
        return () => sub.subscription.unsubscribe()
    }, [])

    return { user, loading }
}
