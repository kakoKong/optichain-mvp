import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export const useBusiness = () => {
  const { user, resolveAppUserId } = useAuth()
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBusiness = useCallback(async () => {
    if (!user) return

    console.log('[useBusiness] Loading business for user:', user)
    setLoading(true)
    setError(null)

    try {
      const appUserId = await resolveAppUserId(user)
      if (!appUserId) {
        throw new Error('Unable to resolve user ID')
      }
      
      console.log('[useBusiness] Resolved app user ID:', appUserId)

      // Try owner first
      const { data: owned, error: ownedErr } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', appUserId)
        .limit(1)

      if (ownedErr) throw ownedErr
      if (owned && owned.length > 0) {
        console.log('[useBusiness] Found owned business:', owned[0])
        setBusiness(owned[0])
        return
      }
      
      console.log('[useBusiness] No owned business found, checking memberships...')

      // Fallback: first business where the user is a member
      const { data: membership, error: memErr } = await supabase
        .from('business_members')
        .select(`
          business:business_id (
            *
          )
        `)
        .eq('user_id', appUserId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (memErr) throw memErr
      if (!membership?.business) {
        console.log('[useBusiness] No business membership found')
        setBusiness(null)
        return
      }

      console.log('[useBusiness] Found business membership:', membership.business)
      setBusiness(membership.business)
    } catch (err) {
      console.error('Error loading business:', err)
      setError(err instanceof Error ? err.message : 'Failed to load business')
    } finally {
      setLoading(false)
    }
  }, [user, resolveAppUserId])

  useEffect(() => {
    if (user) {
      loadBusiness()
    }
  }, [user])

  return {
    business,
    loading,
    error,
    refetch: loadBusiness
  }
}

export default useBusiness
