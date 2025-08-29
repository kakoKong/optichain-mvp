'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Copy, RefreshCw, EyeOff } from 'lucide-react'

function makeJoinCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * Math.random() * chars.length)]).join('')
}

export default function InvitePanel({ businessId }: { businessId: string }) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('businesses')
        .select('join_code')
        .eq('id', businessId)
        .single()
      setCode(data?.join_code ?? null)
    })()
  }, [businessId])

  const copy = async () => {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setMsg('Copied!')
    setTimeout(() => setMsg(null), 1200)
  }

  const rotate = async () => {
    setLoading(true)
    const newCode = makeJoinCode(6)
    const { error } = await supabase
      .from('businesses')
      .update({ join_code: newCode })
      .eq('id', businessId)
    if (!error) setCode(newCode)
    setLoading(false)
  }

  const disable = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('businesses')
      .update({ join_code: null })
      .eq('id', businessId)
    if (!error) setCode(null)
    setLoading(false)
  }

  return (
    <div className="rounded-2xl p-4 border shadow-sm" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Invite teammates</h3>
        {msg && <span className="text-xs" style={{ color: 'var(--muted)' }}>{msg}</span>}
      </div>

      {code ? (
        <div className="flex items-center gap-2">
          <code className="px-3 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--card-border)', color: 'var(--text)' }}>
            {code}
          </code>
          <button onClick={copy} className="p-2 rounded-lg border" style={{ borderColor: 'var(--card-border)' }}>
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={rotate} disabled={loading} className="p-2 rounded-lg border" style={{ borderColor: 'var(--card-border)' }}>
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={disable} disabled={loading} className="p-2 rounded-lg border" style={{ borderColor: 'var(--card-border)' }}>
            <EyeOff className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={rotate}
          disabled={loading}
          className="rounded-xl px-4 py-2 font-medium"
          style={{ color: '#fff', background: 'linear-gradient(90deg, #6b7280, #4b5563)' }}
        >
          Generate join code
        </button>
      )}
      <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
        Share this code with teammates. Their requests will appear in your admin/requests page.
      </p>
    </div>
  )
}
