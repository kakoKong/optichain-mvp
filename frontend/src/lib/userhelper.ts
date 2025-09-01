// @/lib/userhelper.ts
import { supabase } from '@/lib/supabase'
import liff from '@line/liff'

export async function resolveOwnerId(): Promise<string | null> {
  // 1) Already signed in with Supabase?
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id) return session.user.id

  // 2) Ensure LIFF is ready
  if (typeof window === 'undefined') return null
  try {
    await liff.init({ liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID! })
  } catch (e) {
    console.error('LIFF init failed:', e)
    return null
  }

  // 3) If not logged in to LINE, trigger login (will redirect back)
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href })
    return null
  }

  // 4) ALWAYS try to create a Supabase session from the LIFF ID token
  try {
    const idToken = liff.getIDToken()
    if (!idToken) {
      console.warn('LIFF has no ID token – make sure your LIFF app has "openid" scope')
      return null
    }
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'line',
      token: idToken,
    })
    if (error) {
      console.error('Supabase signInWithIdToken(line) failed:', error)
      return null
    }
    return data?.session?.user?.id ?? null
  } catch (e) {
    console.error('Failed to exchange LIFF ID token:', e)
    return null
  }
}
