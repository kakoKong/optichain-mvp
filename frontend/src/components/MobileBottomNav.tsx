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
    color: 'text-gray-600',
  },
  {
    name: 'Products',
    href: '/liff/products',
    icon: PackageIcon,
    color: 'text-gray-600',
  },
  {
    name: 'Scan',
    href: '/liff/scanner',
    icon: ScanLineIcon,
    color: 'text-blue-600',
  },
  {
    name: 'Analytics',
    href: '/liff/analytics',
    icon: BarChart3Icon,
    color: 'text-green-600',
  },
  {
    name: 'Transactions',
    href: '/liff/transactions',
    icon: HistoryIcon,
    color: 'text-gray-600',
  },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:hidden">
      <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-2">
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/liff/products"
            className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg text-center text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PackageIcon className="h-5 w-5 text-gray-600" />
            <span>Products</span>
          </Link>
          <Link
            href="/liff/scanner"
            className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg text-center text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ScanLineIcon className="h-5 w-5 text-blue-600" />
            <span>Scan</span>
          </Link>
          <Link
            href="/liff/analytics"
            className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg text-center text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <BarChart3Icon className="h-5 w-5 text-green-600" />
            <span>Analytics</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
