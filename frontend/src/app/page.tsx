import { Suspense } from 'react'
import HomeGate from './home-gate'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Search = Record<string, string | string[] | undefined>

function toQueryString(searchParams: Search) {
  const entries: [string, string][] = []
  for (const [k, v] of Object.entries(searchParams)) {
    if (v === undefined) continue
    if (Array.isArray(v)) v.forEach(val => entries.push([k, val]))
    else entries.push([k, v])
  }
  const qs = new URLSearchParams(entries).toString()
  return qs ? `?${qs}` : ''
}

export default function Page({ searchParams }: { searchParams: Search }) {
  const qs = toQueryString(searchParams)
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading…</div>}>
      <HomeGate initialQuery={qs} />
    </Suspense>
  )
}
