'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LogoutButton({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
        alert('Failed to logout. Please try again.')
        return
      }
      
      // Clear any stored redirect paths
      sessionStorage.removeItem('postLoginRedirect')
      
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
