import { supabase } from '@/lib/supabase'
import liff from '@line/liff'

export async function resolveOwnerId(): Promise<string | null> {
    // 1) Supabase session (Google auth)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) return session.user.id
  
    // 2) LIFF (LINE)
    const isLiff = typeof window !== 'undefined' && liff
    if (isLiff) {
      await liff.init({ liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID! })
      if (!liff.isLoggedIn()) {
        liff.login()
        return null
      }
      const profile = await liff.getProfile()
      // map line_user_id -> public.users.id
      const { data: appUser, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('line_user_id', profile.userId)
        .single()
      if (error || !appUser) return null
      return appUser.id
    }
  
    return null
  }