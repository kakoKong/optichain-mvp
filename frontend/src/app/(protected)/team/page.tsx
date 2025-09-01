// app/settings/team/page.tsx
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
        
        // Load business data for the user
        ;(async () => {
            try {
                const { data: biz } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('owner_id', user.id)
                    .limit(1)
                setBusiness(biz?.[0] ?? null)
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
        router.replace('/signin')
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

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Member
                </button>
            </div>

            <InvitePanel businessId={business.id} />
            <JoinRequestsPanel businessId={business.id} />
        </div>
    )
}
