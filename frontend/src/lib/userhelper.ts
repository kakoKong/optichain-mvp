// This function is now deprecated in favor of the AuthContext
// Use useAuth() hook in your components instead
import { supabase } from './supabase'

export async function resolveOwnerId(): Promise<string | null> {
  console.warn('[userhelper] resolveOwnerId is deprecated. Use useAuth() hook instead.')
  
  try {
    // First, check if we have a stored user (LINE or dev)
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('devUser') || localStorage.getItem('lineUser')
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser)
          if (user.id) {
            console.log('[userhelper] Using stored user ID:', user.id, 'source:', user.source)
            return user.id
          }
        } catch (parseError) {
          console.error('[userhelper] Failed to parse stored user:', parseError)
          localStorage.removeItem('devUser')
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

// New recommended way to get the current user ID
export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
            // Check for dev user first, then LINE user
        const storedUser = localStorage.getItem('devUser') || localStorage.getItem('lineUser')
        
        // If no stored user but we're in dev mode, return the dev user ID
        if (!storedUser && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            return '50d054d6-4e1c-4157-b231-5b8e9d321913'
        }
    if (storedUser) {
      const user = JSON.parse(storedUser)
      return user.id
    }
  } catch (error) {
    console.error('[userhelper] Error getting current user ID:', error)
  }
  
  return null
}

// Helper function to check if current user is a dev user
export function isDevUser(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const storedUser = localStorage.getItem('devUser')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      return user.source === 'dev'
    }
  } catch (error) {
    console.error('[userhelper] Error checking dev user status:', error)
  }
  
  return false
}
