'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import liff from '@line/liff'
import { supabase } from '@/lib/supabase'

const LIFF_ID = process.env.NEXT_PUBLIC_LINE_LIFF_ID as string

export default function LiffLogin() {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    const init = async () => {
      if (!LIFF_ID) return setErr('Missing NEXT_PUBLIC_LINE_LIFF_ID')

      try {
        await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true })

        // Check if already logged in
        if (liff.isLoggedIn()) {
          setIsLoggingIn(true)
          
          // Ensure a row exists in profiles for this LINE user
          const profile = await liff.getProfile()
          await ensureProfileFromLine(profile)

          // Check for stored redirect first, then check URL parameters, then default to dashboard
          let to = sessionStorage.getItem('postLoginRedirect') || 
                   new URLSearchParams(window.location.search).get('redirect') ||
                   '/app/dashboard'
          sessionStorage.removeItem('postLoginRedirect')
          
          // Check if user has a business before redirecting
          try {
            const { data: { user: supabaseUser } } = await supabase.auth.getUser()
            if (supabaseUser) {
              const [{ data: ownedBusinesses }, { data: memberships }] = await Promise.all([
                supabase.from('businesses').select('id').eq('owner_id', supabaseUser.id),
                supabase.from('business_members').select('id').eq('user_id', supabaseUser.id)
              ])

              const hasBusiness = (ownedBusinesses?.length ?? 0) > 0 || (memberships?.length ?? 0) > 0

              if (!hasBusiness) {
                console.log('User has no business, redirecting to onboarding')
                to = '/app/onboarding'
              }
            }
          } catch (error) {
            console.error('Error checking business status:', error)
          }
          
          router.replace(to)
        } else {
          // Not logged in - show login button
          setIsReady(true)
        }
      } catch (e: any) {
        setErr(e?.message || 'LIFF init failed')
        setIsReady(true)
      }
    }
    init()
  }, [router])

  const handleLogin = () => {
    if (!liff.isInClient()) {
      setErr('Please open this page from LINE app')
      return
    }
    liff.login({ redirectUri: window.location.href })
  }

  if (isLoggingIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 rounded-full border-4 border-green-500 border-t-transparent mx-auto" />
          <p className="text-gray-600">Logging you in...</p>
        </div>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent mx-auto" />
          <p className="text-sm text-gray-600">Initializing LINE...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
        {/* Logo */}
        <div className="mb-8">
          <Image 
            src="/OptichainLogo.png" 
            alt="OptiChain" 
            width={80} 
            height={80} 
            className="mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to OptiChain</h1>
          <p className="text-gray-600">Inventory management made simple</p>
        </div>

        {/* LINE Logo */}
        <div className="mb-8">
          <Image 
            src="/LineLogo.png" 
            alt="LINE" 
            width={120} 
            height={120} 
            className="mx-auto opacity-90"
          />
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          className="w-full bg-[#06C755] hover:bg-[#05b84c] text-white font-semibold py-4 px-6 rounded-xl transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-lg"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
          Login with LINE
        </button>

        {/* Error Message */}
        {err && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{err}</p>
          </div>
        )}

        {/* Info Text */}
        <p className="mt-8 text-sm text-gray-500">
          Sign in with your LINE account to access OptiChain's inventory management features
        </p>
      </div>
    </div>
  )
}

/** Insert a profiles row if missing */
async function ensureProfileFromLine(p: { userId: string; displayName?: string; pictureUrl?: string }) {
  // 1) Check if we already have a row
  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('line_user_id', p.userId)
    .maybeSingle()

  if (selErr) throw selErr
  if (existing) return existing.id

  // 2) Insert a new row
  const { data: inserted, error: insErr } = await supabase
    .from('profiles')
    .insert([{
      id: crypto.randomUUID(),
      line_user_id: p.userId,
      display_name: p.displayName ?? null,
      avatar_url: p.pictureUrl ?? null,
    }])
    .select('id')
    .single()

  if (insErr) throw insErr
  return inserted.id
}