'use client'

import React from 'react'
import { useBusiness } from '@/hooks/useBusiness'

interface ResponsiveNavProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export const ResponsiveNav: React.FC<ResponsiveNavProps> = ({
  title,
  subtitle,
  action,
  className = ''
}) => {
  const { business } = useBusiness()

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm lg:text-base text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResponsiveNav
