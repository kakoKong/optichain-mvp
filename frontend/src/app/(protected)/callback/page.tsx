// app/auth/callback/page.tsx
'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function OAuthCallback() {
  useEffect(() => {
    // let Supabase parse the URL & persist the session
    supabase.auth.getSession().finally(() => {
      try {
        if (window.opener) {
          // tell the original tab we’re done
          window.opener.postMessage({ type: 'oauth:complete' }, window.location.origin)
          window.close()
        } else {
          // no opener (blocked), just land on dashboard
          const to = sessionStorage.getItem('postLoginRedirect') || '/dashboard'
          sessionStorage.removeItem('postLoginRedirect')
          window.location.replace(to)
        }
      } catch {
        window.location.replace('/dashboard')
      }
    })
  }, [])
  return null
}
