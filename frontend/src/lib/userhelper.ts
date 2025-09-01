// @/lib/userhelper.ts (updated)
import { supabase } from '@/lib/supabase'
import liff from '@line/liff'

export async function resolveOwnerId(): Promise<string | null> {
    // 1) Check for existing Supabase session first
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) return session.user.id

    // 2) If no Supabase session, check for LIFF session
    if (typeof window !== 'undefined' && liff) {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID! })
        
        if (liff.isLoggedIn() && !liff.getAccessToken()) {
            // This case might happen if liff.login() was called and redirected back.
            // We should immediately redirect to the dashboard to let the main auth hook handle it.
            // Or, simply get the ID token and sign in with it.
            try {
                const idToken = liff.getIDToken()
                if (idToken) {
                    const { data, error } = await supabase.auth.signInWithIdToken({
                        provider: 'line',
                        token: idToken,
                    })
                    if (data?.session?.user?.id) return data.session.user.id
                    if (error) console.error("Supabase sign-in with LIFF ID token failed:", error)
                }
            } catch (e) {
                console.error("Failed to get LIFF ID token or sign in:", e)
            }
        }
    }

    // 3) Fallback: No session found, log in with LIFF
    if (typeof window !== 'undefined' && liff && !liff.isLoggedIn()) {
        try {
            liff.login({ redirectUri: window.location.href });
        } catch (e) {
            console.error("LIFF login failed:", e);
        }
    }

    return null
}