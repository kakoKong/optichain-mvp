import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './useAuth'
import { useBusiness } from './useBusiness'
import { supabase } from '@/lib/supabase'

export const useOnboarding = () => {
  const { user, loading: authLoading, resolveAppUserId } = useAuth()
  const { business, loading: businessLoading } = useBusiness()
  const router = useRouter()
  const [checkingOnboarding, setCheckingOnboarding] = useState(false)

  const checkOnboardingStatus = async () => {
    if (authLoading || businessLoading || !user) return

    setCheckingOnboarding(true)
    
    try {
      const appUserId = await resolveAppUserId(user)
      if (!appUserId) return

      // Check if user has any business (as owner or member)
      const [{ data: ownedBusinesses }, { data: memberships }] = await Promise.all([
        supabase.from('businesses').select('id').eq('owner_id', appUserId),
        supabase.from('business_members').select('id').eq('user_id', appUserId)
      ])

      const hasBusiness = (ownedBusinesses?.length ?? 0) > 0 || (memberships?.length ?? 0) > 0

      if (!hasBusiness) {
        console.log('[useOnboarding] User has no business, redirecting to onboarding')
        router.replace('/onboarding')
      } else {
        console.log('[useOnboarding] User has business, redirecting to dashboard')
        router.replace('/dashboard')
      }
    } catch (error) {
      console.error('[useOnboarding] Error checking onboarding status:', error)
    } finally {
      setCheckingOnboarding(false)
    }
  }

  useEffect(() => {
    checkOnboardingStatus()
  }, [authLoading, businessLoading, user])

  return {
    checkingOnboarding,
    checkOnboardingStatus
  }
}
