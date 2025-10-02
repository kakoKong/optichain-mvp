import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2Icon, UsersIcon, ArrowRightIcon, CheckCircleIcon, LogOutIcon } from 'lucide-react'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useBusiness } from '@/hooks/useBusiness'
import { supabase } from '@/lib/supabase'

export const OnboardingPage: React.FC = () => {
  const router = useRouter()
  const { user, loading: authLoading, resolveAppUserId } = useAuth()
  const { business, loading: businessLoading } = useBusiness()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinLoading, setJoinLoading] = useState(false)

  // Redirect if user already has a business
  useEffect(() => {
    if (authLoading || businessLoading) return
    
    if (business) {
      // Check for stored redirect first, then default to dashboard
      const storedRedirect = sessionStorage.getItem('postLoginRedirect')
      const intendedDestination = storedRedirect || '/app/dashboard'
      
      console.log('[OnboardingPage] Redirect check:', {
        storedRedirect,
        intendedDestination,
        sessionStorageKeys: Object.keys(sessionStorage),
        allSessionStorage: Object.fromEntries(Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)]))
      })
      
      sessionStorage.removeItem('postLoginRedirect')
      
      console.log('[OnboardingPage] User already has business, redirecting to:', intendedDestination)
      router.replace(intendedDestination)
    }
  }, [authLoading, businessLoading, business, router])

  // Redirect if not authenticated
  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      console.log('[OnboardingPage] User not authenticated, redirecting to signin')
      router.replace('/app/signin')
    }
  }, [authLoading, user, router])

  const handleCreateBusiness = () => {
    console.log('[OnboardingPage] Redirecting to detailed business creation')
    router.push('/app/create-business')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/app/signin')
  }

  const handleJoinBusiness = async () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter a join code')
      return
    }

    setJoinLoading(true)
    setJoinError(null)

    try {
      const appUserId = await resolveAppUserId(user!)
      if (!appUserId) {
        throw new Error('Unable to resolve user ID')
      }

      // Find business by join code
      const { data: business, error: findError } = await supabase
        .from('businesses')
        .select('id, name, owner_id')
        .eq('join_code', joinCode.trim())
        .single()

      if (findError || !business) {
        throw new Error('Invalid join code')
      }

      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from('business_members')
        .select('id')
        .eq('business_id', business.id)
        .eq('user_id', appUserId)
        .single()

      if (existingMembership) {
        throw new Error('You are already a member of this business')
      }

      // Create join request
      const { error: requestError } = await supabase
        .from('business_join_requests')
        .insert([{
          business_id: business.id,
          user_id: appUserId,
          status: 'pending'
        }])

      if (requestError) {
        throw new Error('Failed to send join request')
      }

      // Show success message and redirect
      setError(null)
      setJoinError(null)
      alert(`Join request sent to ${business.name}! The business owner will review your request.`)
      router.push('/app/dashboard')
    } catch (err) {
      console.error('[OnboardingPage] Error joining business:', err)
      setJoinError(err instanceof Error ? err.message : 'Failed to join business')
    } finally {
      setJoinLoading(false)
    }
  }

  if (authLoading || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Simple Header with Logo and Logout */}
      <div className="bg-white/80 backdrop-blur border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image src="/OptichainLogo.png" alt="OptiChain" width={40} height={40} className="mr-3" />
              <span className="text-xl font-bold tracking-tight text-gray-900">OptiChain</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              <LogOutIcon className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
            Welcome to OptiChain!
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Let's get you set up with your business
          </p>
          
          {/* Info Banner */}
          <div className="max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2Icon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  You're not registered to any business yet
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  To start managing inventory with OptiChain, you'll need to either create your own business or join an existing one. 
                  Choose the option below that best fits your needs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Business Option */}
          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Building2Icon className="h-8 w-8 text-blue-600" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Your Business</h3>
                <p className="text-gray-600 mb-6">
                  Set up your business profile with detailed information including logo, 
                  contact details, and business settings.
                </p>
              </div>

              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-700">Complete business profile setup</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-700">Upload business logo</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-700">Configure business settings</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-700">Start with trial code</span>
                </div>
              </div>

              <Button
                onClick={handleCreateBusiness}
                className="w-full flex items-center justify-center gap-2"
              >
                Create Business
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Join Business Option */}
          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <UsersIcon className="h-8 w-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Join Existing Business</h3>
                <p className="text-gray-600 mb-6">
                  Join an existing business using a join code provided by the business owner.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Enter join code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="text-center text-lg font-mono"
                  />
                  {joinError && (
                    <p className="text-sm text-red-600 mt-2">{joinError}</p>
                  )}
                </div>

                <Button
                  onClick={handleJoinBusiness}
                  disabled={joinLoading || !joinCode.trim()}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {joinLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Join Business
                      <ArrowRightIcon className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Help Text */}
        <Card className="p-6 bg-gray-50">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h4>
            <p className="text-gray-600 mb-4">
              If you're not sure which option to choose, here's what each one does:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <strong>Create Business:</strong> You'll be the owner and can invite others to join.
              </div>
              <div>
                <strong>Join Business:</strong> You'll be a member of an existing business.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default OnboardingPage
