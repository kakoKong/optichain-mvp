'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import liff from '@line/liff'
import { supabase } from '@/lib/supabase'   // <-- add this

const LIFF_ID = process.env.NEXT_PUBLIC_LINE_LIFF_ID as string

export default function LiffLogin() {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!LIFF_ID) return setErr('Missing NEXT_PUBLIC_LINE_LIFF_ID')

      try {
        await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true })

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return
        }

        // ✅ Ensure a row exists in profiles for this LINE user
        const profile = await liff.getProfile()
        await ensureProfileFromLine(profile)

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
        <p className="text-sm text-gray-600">Connecting to LINE…</p>
        {err && <p className="text-sm text-red-600">{err}</p>}
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

  // 2) Insert a new row (omit `id` if your column has a default UUID)
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
