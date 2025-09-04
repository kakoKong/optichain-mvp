'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Building, Users, Package, TrendingUp, CheckCircle, ArrowRight, Plus, Edit, Trash2, ArrowLeft, KeySquare, UsersRound } from 'lucide-react'

function makeJoinCode(len = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let out = ''
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
    return out
}

export default function GetStartedClient() {
    const { user, loading: authLoading } = useAuth()
    const [business, setBusiness] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showJoinModal, setShowJoinModal] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address: '',
        phone: '',
        email: ''
    })
    const [joinCode, setJoinCode] = useState('')
    const [joinMessage, setJoinMessage] = useState('')
    const [createName, setCreateName] = useState('')
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState<string | null>(null)
    const router = useRouter()

    // Resolve our "app user id" (public.users.id) from LINE auth
    const [appUserId, setAppUserId] = useState<string | null>(null)

    useEffect(() => {
        (async () => {
            if (authLoading) return
            if (!user) {
                router.replace('/signin')
                return
            }

            try {
                // For dev users: use the databaseUid directly
                if (user.source === 'dev' && user.databaseUid) {
                    console.log('[GetStartedClient] Dev user detected, using databaseUid:', user.databaseUid)
                    setAppUserId(user.databaseUid)
                }
                // For LINE: map to app user (public.users.id) by line_user_id
                else if (user.source === 'line') {
                    const { data } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('line_user_id', user.id)
                        .single()
                    setAppUserId(data?.id ?? null)
                }
            } catch {
                setAppUserId(null)
            }
        })()
    }, [authLoading, user, router])

    console.log('appUserId', appUserId)
    
    // If user already has a business (owner or member), bounce to dashboard
    useEffect(() => {
        if (!appUserId) return
        (async () => {
            const [{ data: owned }, { data: memberships }] = await Promise.all([
                supabase.from('businesses').select('id').eq('owner_id', appUserId),
                supabase.from('business_members').select('id').eq('user_id', appUserId),
            ])

            if ((owned?.length ?? 0) > 0 || (memberships?.length ?? 0) > 0) {
                router.replace('/dashboard')
            }
        })()
    }, [appUserId, router])

    const canCreate = createName.trim().length >= 2
    const canJoin = joinCode.trim().length >= 4

    const createBusiness = async () => {
        if (!appUserId || !canCreate) return
        setBusy(true)
        setNotice(null)
        try {
            const code = makeJoinCode(6)
            // 1) create business (owner_id = appUserId)
            const { data: business, error: bizErr } = await supabase
                .from('businesses')
                .insert([{ owner_id: appUserId, name: createName.trim(), join_code: code }])
                .select('id, name')
                .single()
            if (bizErr || !business) throw bizErr || new Error('Business not created')

            // 2) owner membership
            const { error: memErr } = await supabase
                .from('business_members')
                .insert([{ business_id: business.id, user_id: appUserId, role: 'owner' }])
            if (memErr) throw memErr

            router.replace('/dashboard')
        } catch (e: any) {
            setNotice(e?.message || 'Failed to create business')
        } finally {
            setBusy(false)
        }
    }

    const requestJoin = async () => {
        if (!appUserId || !canJoin) return
        setBusy(true)
        setNotice(null)

        try {
            console.log(joinCode)
            console.log('joinCode:', joinCode)
            // 1) find business by code
            const { data: business, error: findErr } = await supabase
                .from('businesses')
                .select('id, name, owner_id')
                .eq('join_code', joinCode)
                .single(); 

            if (findErr) {
                // This catches actual server errors
                console.log(findErr)
                throw findErr;
            }
            if (!business) {
                // This is now a correct check for no rows found
                throw new Error('No business found for that code');
            }

            console.log('nono')
            // 2) ensure not already member
            const { data: existingMember } = await supabase
                .from('business_members')
                .select('id')
                .eq('business_id', business.id)
                .eq('user_id', appUserId)
                .maybeSingle()
            if (existingMember) throw new Error('You already belong to this business')

            // 3) create request (unique constraint avoids duplicates)
            const { error: reqErr } = await supabase
                .from('business_join_requests')
                .insert([{
                    business_id: business.id,
                    requester_id: appUserId,
                    message: joinMessage || null
                }])
            if (reqErr) throw reqErr

            setNotice('Request sent! An admin will approve your access.')
            setJoinCode('')
            setJoinMessage('')
        } catch (e: any) {
            setNotice(e?.message || 'Failed to submit request')
        } finally {
            setBusy(false)
        }
    }

    if (authLoading || !user || !appUserId) {
        return (
            <div className="min-h-screen grid place-items-center">
                <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-transparent" />
            </div>
        )
    }

    return (
        <div
            className="min-h-screen p-6 md:p-10"
            style={{ backgroundImage: 'linear-gradient(to bottom right, var(--bg-from), var(--bg-via), var(--bg-to))' }}
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div
                    className="rounded-2xl p-5 md:p-6 border shadow-xl backdrop-blur-lg"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text)' }}>
                                Let's get you set up
                            </h1>
                            <p className="mt-1" style={{ color: 'var(--muted)' }}>
                                Create a new business or request to join an existing one.
                            </p>
                        </div>
                        <button
                            onClick={() => history.length > 1 ? history.back() : router.replace('/')}
                            className="hidden sm:inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
                            style={{ border: '1px solid var(--card-border)', color: 'var(--text)' }}
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Create business */}
                    <div
                        className="rounded-2xl p-5 md:p-6 border shadow-sm backdrop-blur-xl space-y-4"
                        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gray-100 text-gray-700">
                                <Building className="h-5 w-5" />
                            </div>
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Create a new business</h2>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>
                            You'll be the owner. You can invite teammates later with a join code.
                        </p>

                        <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                            Business name
                        </label>
                        <input
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            placeholder="e.g., Kaokong Mart"
                            className="w-full rounded-xl px-3 py-2 border focus:outline-none"
                            style={{ background: 'transparent', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                        />

                        <button
                            disabled={!canCreate || busy}
                            onClick={createBusiness}
                            className="w-full rounded-xl px-4 py-3 font-semibold transition-opacity disabled:opacity-60"
                            style={{ color: '#fff', background: 'linear-gradient(90deg, #6b7280, #4b5563)' }}
                        >
                            {busy ? 'Creating…' : 'Create business'}
                        </button>
                        
                        <div className="text-center">
                            <button
                                onClick={() => router.push('/create-business')}
                                className="text-sm text-blue-600 hover:text-blue-700 underline"
                            >
                                Or create with detailed information →
                            </button>
                        </div>
                    </div>

                    {/* Join via code */}
                    <div
                        className="rounded-2xl p-5 md:p-6 border shadow-sm backdrop-blur-xl space-y-4"
                        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gray-100 text-gray-700">
                                <KeySquare className="h-5 w-5" />
                            </div>
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Join with a code</h2>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>
                            Enter the join code from your business admin. Your request will be reviewed.
                        </p>

                        <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                            Join code
                        </label>
                        <input
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="e.g., 9F3K2Q"
                            className="w-full rounded-xl px-3 py-2 border tracking-widest"
                            style={{ background: 'transparent', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                        />

                        <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                            Message (optional)
                        </label>
                        <textarea
                            value={joinMessage}
                            onChange={(e) => setJoinMessage(e.target.value)}
                            placeholder="Introduce yourself or specify your role…"
                            className="w-full rounded-xl px-3 py-2 border min-h-[84px] resize-y"
                            style={{ background: 'transparent', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                        />

                        <button
                            disabled={!canJoin || busy}
                            onClick={requestJoin}
                            className="w-full rounded-xl px-4 py-3 font-semibold transition-opacity disabled:opacity-60"
                            style={{ color: '#fff', background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
                        >
                            {busy ? 'Sending…' : 'Request to join'}
                        </button>

                        {notice && (
                            <div className="rounded-xl px-3 py-2 border text-sm" style={{ borderColor: 'var(--card-border)', color: 'var(--text)' }}>
                                {notice}
                            </div>
                        )}
                    </div>
                </div>

                <div
                    className="rounded-2xl p-4 md:p-5 border shadow-sm backdrop-blur-xl"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                >
                    <div className="flex items-center gap-3">
                        <UsersRound className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>
                            Admins can rotate the join code anytime. Pending requests appear in the admin's "Team" or "Requests" view.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
