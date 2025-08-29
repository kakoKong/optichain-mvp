'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { User2, Clock, Check, X, Loader2 } from 'lucide-react'

type RequestRow = {
  id: string
  business_id: string
  requester_id: string
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  // Embedded profile (adjust if your FK still points at public.users)
  requester?: {
    id: string
    display_name?: string | null
    email?: string | null
    avatar_url?: string | null
    full_name?: string | null
  } | null
}

export default function JoinRequestsPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    ;(async () => {
      setLoading(true)
      setNotice(null)
      // If your FK is business_join_requests.requester_id -> profiles.id, this embed works:
      const { data, error } = await supabase
        .from('business_join_requests')
        .select(`
          id, business_id, requester_id, message, status, created_at,
          requester:profiles!business_join_requests_requester_id_fkey (
            id, display_name, email, avatar_url
          )
        `)
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (!ignore) {
        if (error) {
          setNotice(error.message)
          setRows([])
        } else {
          setRows((data as unknown as RequestRow[]) ?? [])
        }
        setLoading(false)
      }
    })()
    return () => { ignore = true }
  }, [businessId])

  const empty = !loading && rows.length === 0

  const approve = async (r: RequestRow) => {
    setBusyId(r.id); setNotice(null)
    try {
      // 1) add/ensure membership (unique index on (business_id,user_id) recommended)
      const { error: upErr } = await supabase
        .from('business_members')
        .upsert(
          [{ business_id: r.business_id, user_id: r.requester_id, role: 'member', status: 'active' }],
          { onConflict: 'business_id,user_id' }
        )
      if (upErr) throw upErr

      // 2) mark request approved
      const { error: updErr } = await supabase
        .from('business_join_requests')
        .update({ status: 'approved' })
        .eq('id', r.id)
      if (updErr) throw updErr

      // 3) remove from list
      setRows(prev => prev.filter(x => x.id !== r.id))
    } catch (e: any) {
      setNotice(e?.message || 'Failed to approve')
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (r: RequestRow) => {
    setBusyId(r.id); setNotice(null)
    try {
      const { error } = await supabase
        .from('business_join_requests')
        .update({ status: 'rejected' })
        .eq('id', r.id)
      if (error) throw error
      setRows(prev => prev.filter(x => x.id !== r.id))
    } catch (e: any) {
      setNotice(e?.message || 'Failed to reject')
    } finally {
      setBusyId(null)
    }
  }

  const title = useMemo(() => `Join Requests (${rows.length})`, [rows.length])

  return (
    <div
      className="rounded-2xl border shadow-sm backdrop-blur-xl"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      <div className="px-4 py-4 sm:px-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
      </div>

      {notice && (
        <div className="mx-4 sm:mx-6 mt-4 rounded-xl px-3 py-2 text-sm border"
             style={{ borderColor: 'var(--card-border)', color: 'var(--text)' }}>
          {notice}
        </div>
      )}

      {loading ? (
        <div className="p-6 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--muted)' }} />
        </div>
      ) : empty ? (
        <div className="p-6 text-sm" style={{ color: 'var(--muted)' }}>
          No pending requests.
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
          {rows.map(r => {
            const name = r.requester?.display_name || r.requester?.full_name || 'Unknown user'
            return (
              <li key={r.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {r.requester?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.requester.avatar_url}
                        alt={name}
                        className="h-10 w-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-xl grid place-items-center bg-gray-100 text-gray-600">
                        <User2 className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{name}</p>
                      {r.requester?.email && (
                        <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>{r.requester.email}</p>
                      )}
                      {r.message && (
                        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                          “{r.message}”
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                        <Clock className="h-4 w-4" />
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => reject(r)}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm border hover:opacity-90 disabled:opacity-60"
                      style={{ borderColor: 'var(--card-border)', color: 'var(--text)', background: 'transparent' }}
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                    <button
                      onClick={() => approve(r)}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
                      style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
