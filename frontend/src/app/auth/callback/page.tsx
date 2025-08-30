// app/auth/callback/page.tsx
'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      // Consume the hash and persist session
      await supabase.auth.getSession()

      // Tell the opener we’re done (works even if BroadcastChannel is delayed)
      try {
        window.opener?.postMessage({ type: 'oauth:complete' }, window.location.origin)
      } catch {}
      // Close the popup
      window.close()
    })()
  }, [])

  return null
}
