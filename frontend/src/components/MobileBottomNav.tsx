'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  PackageIcon, 
  ScanLineIcon, 
  BarChart3Icon, 
  HomeIcon,
  HistoryIcon 
} from 'lucide-react'

const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Products',
    href: '/liff/products',
    icon: PackageIcon,
  },
  {
    name: 'Scanner',
    href: '/liff/scanner',
    icon: ScanLineIcon,
  },
  {
    name: 'Analytics',
    href: '/liff/analytics',
    icon: BarChart3Icon,
  },
  {
    name: 'Transactions',
    href: '/liff/transactions',
    icon: HistoryIcon,
  },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center space-y-1 px-2 py-2 transition-colors ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
