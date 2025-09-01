// @/lib/userhelper.ts
import { supabase } from '@/lib/supabase'

export async function resolveOwnerId(): Promise<string | null> {
  try {
    // Get current Supabase session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    
    if (session?.user?.id) {
      return session.user.id
    }
    
    return null
  } catch (error) {
    console.error('Unexpected error in resolveOwnerId:', error)
    return null
  }
}
