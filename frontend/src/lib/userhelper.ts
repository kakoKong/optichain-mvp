// @/lib/userhelper.ts
import { supabase } from './supabase'

export async function resolveOwnerId(): Promise<string | null> {
  try {
    // First, check if we have a stored LINE user
    if (typeof window !== 'undefined') {
      const storedLineUser = localStorage.getItem('lineUser')
      if (storedLineUser) {
        try {
          const lineUser = JSON.parse(storedLineUser)
          if (lineUser.id) {
            console.log('[userhelper] Using LINE user ID:', lineUser.id)
            return lineUser.id
          }
        } catch (parseError) {
          console.error('[userhelper] Failed to parse stored LINE user:', parseError)
          localStorage.removeItem('lineUser')
        }
      }
    }

    // Fallback to Supabase session
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('[userhelper] Error getting Supabase session:', error)
      return null
    }
    if (session?.user?.id) {
      console.log('[userhelper] Using Supabase user ID:', session.user.id)
      return session.user.id
    }
    
    console.log('[userhelper] No user ID found')
    return null
  } catch (error) {
    console.error('[userhelper] Unexpected error in resolveOwnerId:', error)
    return null
  }
}
