'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function LogoutButton({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
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
