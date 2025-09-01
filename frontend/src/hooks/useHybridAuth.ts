// hooks/useHybridAuth.ts (updated)
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
            setLoading(true)

            // 1) Prefer Supabase session
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

            // 2) LIFF path
            const hasWindow = typeof window !== 'undefined'
            const hasLiffOnWindow = hasWindow && !!(window as any).liff

            const skipFlag = hasWindow && localStorage.getItem('skipLiffAutoLogin') === '1'
            const shouldUseLiff = hasLiffOnWindow && !skipFlag

            if (shouldUseLiff) {
                await liff.init({ liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID! })

                if (!liff.isLoggedIn()) {
                    liff.login()
                    return // liff.login() will redirect, so we exit
                }
                
                // Get the ID token and exchange it for a Supabase session
                try {
                    const idToken = liff.getIDToken()
                    if (idToken) {
                        const { data: { session: supabaseSession }, error } = await supabase.auth.signInWithIdToken({
                            provider: 'line',
                            token: idToken,
                        });
                        if (supabaseSession) {
                            // Supabase session is now active, will be picked up by the next getSession() call
                            // You can set user here if you want immediate feedback
                            setUser({
                                id: supabaseSession.user.id,
                                displayName: supabaseSession.user.user_metadata?.full_name || 'User',
                                source: 'supabase',
                                raw: supabaseSession.user,
                            });
                        } else {
                            throw error;
                        }
                    }
                } catch (e) {
                    console.error('Failed to create Supabase session from LIFF token:', e);
                    // Fallback to LIFF user but this is temporary
                    const profile = await liff.getProfile();
                    setUser({
                        id: profile.userId,
                        displayName: profile.displayName,
                        source: 'line',
                        raw: profile,
                    });
                } finally {
                    setLoading(false);
                }
            } else {
                // 3) No session anywhere
                setUser(null)
                setLoading(false)
            }
        }

        init()

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
            if (event === 'SIGNED_OUT') setUser(null)
        })
        return () => sub.subscription.unsubscribe()
    }, [])

    return { user, loading }
}