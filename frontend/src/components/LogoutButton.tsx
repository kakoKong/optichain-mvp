'use client'

import { supabase } from '@/lib/supabase'
import liff from '@line/liff'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

export default function LogoutButton({ className = '' }) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    if (busy) return
    setBusy(true)
    try {
      // 1) Supabase sign out (Google)
      await supabase.auth.signOut().catch(() => {})

      // 2) LIFF sign out (LINE)
      if (typeof window !== 'undefined' && (window as any).liff) {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID! }).catch(() => {})
        if (liff.isLoggedIn()) {
          // prevent your hook from auto-login again
          localStorage.setItem('skipLiffAutoLogin', '1')
          liff.logout()
        }
      }

      // 3) Clean any local caches you keep
      localStorage.removeItem('recentScans')

      // 4) Send user to a neutral page (login/landing)
      router.replace('/signin') // or '/' if you prefer
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 ${className}`}
      disabled={busy}
    >
      <LogOut className="h-4 w-4" />
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
