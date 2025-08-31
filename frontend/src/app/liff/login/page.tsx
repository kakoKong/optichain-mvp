// app/liff/login/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import liff from '@line/liff'

const LIFF_ID = process.env.NEXT_PUBLIC_LINE_LIFF_ID as string

export default function LiffLogin() {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!LIFF_ID) {
        setErr('Missing NEXT_PUBLIC_LINE_LIFF_ID')
        return
      }
      try {
        await liff.init({
          liffId: LIFF_ID,
          // allows login when opened outside the LINE app (external browser)
          withLoginOnExternalBrowser: true,
        })

        if (!liff.isLoggedIn()) {
          // come back to this same page after LINE auth
          liff.login({ redirectUri: window.location.href })
          return
        }

        // Already logged in -> you can grab profile / id token if you need
        // const idToken = liff.getIDToken()
        // const profile = await liff.getProfile()

        // Go back to where the user started (set by the button), or default
        const to = sessionStorage.getItem('postLoginRedirect') || '/dashboard'
        sessionStorage.removeItem('postLoginRedirect')
        router.replace(to)
      } catch (e: any) {
        setErr(e?.message || 'LIFF init/login failed')
      }
    }
    run()
  }, [router])

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-2">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent mx-auto" />
        <p className="text-sm text-gray-600">
          Connecting to LINE…
        </p>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </div>
  )
}
