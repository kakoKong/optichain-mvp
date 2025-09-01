// app/dashboard/page.tsx
import type { Metadata } from 'next'
import GetStartedPage from './GetStartedClient'

// // This metadata export must be in a Server Component file
export const metadata: Metadata = {
  title: 'Onboarding - Get Started',
}

export default function Page() {
  return <GetStartedPage />
}