// app/team/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { UserPlus, Users, Crown, Mail, Phone, MapPin, Building, Calendar, Trash2, Edit, Plus } from 'lucide-react'
import InvitePanel from '@/components/InvitePanel'
import JoinRequestsPanel from '@/components/JoinRequestPanel'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TeamPage() {
    const { user, loading: authLoading } = useAuth()
    const [teamMembers, setTeamMembers] = useState<any[]>([])
    const [business, setBusiness] = useState<any>(null)
    const [dataLoading, setDataLoading] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingMember, setEditingMember] = useState<any>(null)
    const router = useRouter()

    useEffect(() => {
        if (authLoading || !user) return
        
        // Load business data for the user (either as owner or member)
        ;(async () => {
            try {
                // First, resolve the app user ID (map LINE user ID to database user ID if needed)
                let appUserId = user.id
                
                // For LINE users, map line_user_id to profiles.id
                if (user.source === 'line' || user.source === 'line_browser') {
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('line_user_id', user.id)
                        .single()
                    
                    if (profileError) {
                        console.error('Could not map LINE user to app user:', profileError)
                        return
                    }
                    appUserId = profile?.id
                }
                
                if (!appUserId) return
                
                // First check if user is owner of any business
                const { data: ownedBiz } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('owner_id', appUserId)
                    .limit(1)
                
                if (ownedBiz?.[0]) {
                    setBusiness(ownedBiz[0])
                    return
                }
                
                // If not owner, check if user is a member of any business
                const { data: memberBiz } = await supabase
                    .from('business_members')
                    .select(`
                        business_id,
                        businesses (*)
                    `)
                    .eq('user_id', appUserId)
                    .eq('status', 'active')
                    .limit(1)
                if (memberBiz?.[0]?.businesses) {
                    console.log(memberBiz[0].businesses)
                    setBusiness(memberBiz[0].businesses)
                }
            } catch (error) {
                console.error('Error loading business:', error)
            }
        })()
    }, [authLoading, user, router])

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto"></div>
                    <p className="mt-6 text-gray-600 font-medium">Loading...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        router.replace('/app/signin')
        return null
    }

    if (!business) {
        return (
            <div className="p-6 space-y-4">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900">No Business Found</h2>
                    <p className="text-gray-600">You need to create or join a business first.</p>
                </div>
            </div>
        )
    }

    // Check if user is owner of the business
    const isOwner = business.owner_id === user.id
    console.log(user)
    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        {business.name} • {isOwner ? 'Owner' : 'Member'}
                    </p>
                </div>
                {isOwner && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Member
                    </button>
                )}
            </div>

            {isOwner ? (
                <>
                    <InvitePanel businessId={business.id} />
                    <JoinRequestsPanel businessId={business.id} />
                </>
            ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">Member View</h3>
                    </div>
                    <p className="text-blue-700 text-sm mt-1">
                        You're a member of this business. Only the business owner can manage team invitations and requests.
                    </p>
                </div>
            )}
        </div>
    )
}
