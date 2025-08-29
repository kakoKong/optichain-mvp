// app/settings/team/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useHybridAuth } from '@/hooks/useHybridAuth'
import InvitePanel from '@/components/InvitePanel'
import JoinRequestsPanel from '@/components/JoinRequestPanel'
import { ArrowLeft } from 'lucide-react'

export default function TeamSettings() {
    const { user, loading } = useHybridAuth()
    const [businessId, setBusinessId] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        if (loading) return
        if (!user) return router.replace('/signin')
            ; (async () => {
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

    const goBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) router.back()
        else router.push('/dashboard')
    }

    if (!businessId) {
        return (
            <div className="p-6 space-y-4">
                <div
                    className="rounded-2xl p-4 border shadow-sm backdrop-blur-lg flex items-center gap-3"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                >
                    <button
                        onClick={goBack}
                        className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm"
                        style={{ border: '1px solid var(--card-border)', color: 'var(--text)', background: 'transparent' }}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">Back</span>
                    </button>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Team & Access</h1>
                </div>

                <div
                    className="rounded-2xl p-6 border shadow-sm backdrop-blur-lg"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                >
                    <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Team</h1>
                    <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                        No business found for this account.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header with Back button */}
            <div
                className="rounded-2xl p-4 border shadow-sm backdrop-blur-lg flex items-center gap-3"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            >
                <button
                    onClick={goBack}
                    className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm"
                    style={{ border: '1px solid var(--card-border)', color: 'var(--text)', background: 'transparent' }}
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">Back</span>
                </button>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Team & Access</h1>
            </div>

            <InvitePanel businessId={businessId} />
            <JoinRequestsPanel businessId={businessId} />
        </div>
    )
}
