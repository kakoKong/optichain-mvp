'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import liff from '@line/liff'

export default function LogoutButton({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      // Try to logout from both sources
      let logoutSuccess = false

      // 1. Try Supabase logout
      try {
        const { error } = await supabase.auth.signOut()
        if (!error) {
          console.log('Supabase logout successful')
          logoutSuccess = true
        }
      } catch (error) {
        console.log('Supabase logout failed or not needed')
      }

      // 2. Try LINE logout
      try {
        if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_LINE_LIFF_ID) {
          await liff.init({ liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID })
          if (liff.isLoggedIn()) {
            liff.logout()
            console.log('LINE logout successful')
            logoutSuccess = true
          }
        }
      } catch (error) {
        console.log('LINE logout failed or not needed')
      }

      // Clear any stored data
      sessionStorage.removeItem('postLoginRedirect')
      localStorage.removeItem('recentScans')

      if (logoutSuccess) {
        console.log('Logout completed successfully')
      }

      // Redirect to signin page
      router.replace('/signin')
    } catch (error) {
      console.error('Unexpected logout error:', error)
      alert('An unexpected error occurred during logout.')
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="text-gray-600 hover:text-gray-800 transition-colors"
    >
      {children}
    </button>
  )
}
