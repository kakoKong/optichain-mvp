// app/dashboard/page.tsx
import type { Metadata } from 'next'
import Dashboard from '@/app/(protected)/liff/dashboard/DashboardClient'

// // This metadata export must be in a Server Component file
export const metadata: Metadata = {
  title: 'Inventory Dashboard',
}

export default function Page() {
  return <Dashboard />
}