// app/dashboard/page.tsx
import type { Metadata } from 'next'
import SignInPage from './SignInClient'

// // This metadata export must be in a Server Component file
export const metadata: Metadata = {
  title: 'Optichain Signin',
}

export default function Page() {
  return <SignInPage />
}