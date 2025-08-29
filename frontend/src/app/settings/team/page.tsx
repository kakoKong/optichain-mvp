'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useHybridAuth } from '@/hooks/useHybridAuth'
import InvitePanel from '@/components/InvitePanel'

export default function TeamSettings() {
  const { user, loading } = useHybridAuth()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) return router.replace('/signin')
    ;(async () => {
      // resolve app ownerId (same as your dashboard)
      let ownerId = user.id
      if (user.source === 'line') {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('line_user_id', user.id)
          .single()
        ownerId = data?.id ?? ''
      }

      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', ownerId)
        .limit(1)
      setBusinessId(biz?.[0]?.id ?? null)
    })()
  }, [loading, user, router])

  if (!businessId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-gray-500 mt-2">No business found for this account.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Team & Access</h1>
      <InvitePanel businessId={businessId} />
    </div>
  )
}
