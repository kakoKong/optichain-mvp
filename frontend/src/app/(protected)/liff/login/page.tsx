// app/liff/login/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import liff from '@line/liff'
import { supabase } from '@/lib/supabase'

const LIFF_ID =
  process.env.NEXT_PUBLIC_LINE_LIFF_ID ??
  process.env.NEXT_PUBLIC_LIFF_ID

export default function LiffLogin() {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!LIFF_ID) return setErr('Missing NEXT_PUBLIC_LINE_LIFF_ID')

      try {
        // 1) Init LIFF
        await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true })
        // @ts-ignore older types
        await (liff.ready instanceof Promise ? liff.ready : Promise.resolve())

        // 2) Ensure LINE login
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return
        }

        // 3) Ensure Supabase session from LIFF ID token
        let idToken = liff.getIDToken()
        if (!idToken) {
          // small warmup helps on iOS
          try { await liff.getProfile() } catch {}
          await new Promise(r => setTimeout(r, 120))
          idToken = liff.getIDToken()
        }
        if (!idToken) {
          liff.login({
            redirectUri: window.location.href,
            // @ts-ignore: some versions accept this param
            scope: ['openid', 'profile', 'email'],
          })
          return
        }
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'line',
          token: idToken,
        })
        if (error) throw error

        // 4) Optional: upsert a profile row
        try {
          const profile = await liff.getProfile()
          await ensureProfileFromLine(profile)
        } catch {}

        // 5) Compute intended route
        const params = new URLSearchParams(window.location.search)
        const stored = sessionStorage.getItem('postLoginRedirect') || ''
        sessionStorage.removeItem('postLoginRedirect')

        // Prefer liff.state, fall back to 'state' or stored redirect
        const rawState =
          params.get('liff.state') ||
          params.get('state') ||
          stored ||
          ''

        let target = ''
        if (rawState) {
          // Normalize to absolute internal path
          const decoded = decodeURIComponent(rawState)
          const abs = decoded.startsWith('/') ? decoded : `/${decoded}`
          const u = new URL(abs, window.location.origin)
          target = u.pathname + u.search + u.hash
        } else {
          // No state → pick by whether the LIFF URL *mentions* scanner
          const wantsScanner =
            /(^|[/?#])scanner(\/|$)/i.test(window.location.href)
          target = wantsScanner ? '/liff/scanner' : '/liff/dashboard'
        }

        // 6) Redirect
        router.replace(target)
      } catch (e: any) {
        console.error('[LIFF] error:', e)
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
  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('line_user_id', p.userId)
    .maybeSingle()
  if (selErr) throw selErr
  if (existing) return existing.id

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
