import { useAuth as useAuthContext } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useCallback } from 'react'

export const useAuth = () => {
  const authContext = useAuthContext()
  
  // Helper function to resolve app-level user ID
  const resolveAppUserId = useCallback(async (u: { id: string; source: 'line' | 'line_browser' | 'dev'; databaseUid?: string }) => {
    console.log('[useAuth] Resolving user ID for:', u)
    
    // For dev users: use the databaseUid directly
    if (u.source === 'dev' && u.databaseUid) {
      console.log('[useAuth] Dev user detected, using databaseUid:', u.databaseUid)
      return u.databaseUid
    }
    
    // For LINE users (both LIFF and browser): get the database user ID from the profiles table
    if (u.source === 'line' || u.source === 'line_browser') {
      console.log('[useAuth] LINE user detected, mapping from line_user_id:', u.id)
      const { data: userData, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('line_user_id', u.id)
        .single()
      
      if (error || !userData) {
        console.error('[useAuth] Error resolving LINE user ID:', error)
        return null
      }
      
      console.log('[useAuth] Resolved LINE user ID:', userData.id)
      return userData.id
    }
    
    console.warn('[useAuth] Unknown user source:', u.source)
    return null
  }, [])

  return {
    ...authContext,
    resolveAppUserId
  }
}

export default useAuth
