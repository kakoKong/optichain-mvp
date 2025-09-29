'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBusiness } from '@/hooks/useBusiness'
import { useAuth } from '@/contexts/AuthContext'
import { 
  PackageIcon, 
  ScanLineIcon, 
  BarChart3Icon, 
  HistoryIcon,
  HomeIcon,
  LogOutIcon
} from 'lucide-react'

export const TopNavbar: React.FC = () => {
  const { business } = useBusiness()
  const { user } = useAuth()
  const pathname = usePathname()

  const navItems = [
    { href: '/app/dashboard', label: 'Dashboard', icon: HomeIcon },
    { href: '/app/liff/products', label: 'Products', icon: PackageIcon },
    { href: '/app/liff/scanner', label: 'Scanner', icon: ScanLineIcon },
    { href: '/app/liff/analytics', label: 'Analytics', icon: BarChart3Icon },
    { href: '/app/liff/transactions', label: 'Transactions', icon: HistoryIcon },
  ]

  const isActive = (href: string) => {
    if (href === '/app/dashboard') {
      return pathname === '/app/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="hidden md:block bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Shop Name */}
          <div className="flex items-center">
            <Link
              href="/app/dashboard"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">
                  {business?.name ? business.name.charAt(0).toUpperCase() : 'S'}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {business?.name || 'Shop'}
                </h1>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Right side - User info and logout */}
          <div className="flex items-center gap-4">
            {/* User info */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Welcome, {user?.displayName || 'User'}</span>
            </div>

            {/* Logout button - only show for non-LIFF users */}
            {user?.source !== 'line' && (
              <button
                onClick={() => {
                  localStorage.removeItem('lineBrowserUser')
                  window.location.href = '/app/signin'
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <LogOutIcon className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default TopNavbar
