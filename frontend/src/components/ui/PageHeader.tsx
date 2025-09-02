import React from 'react'
import { ArrowLeftIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  action?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  action,
  className = ''
}) => {
  return (
    <div className={`relative overflow-hidden rounded-2xl border shadow-xl backdrop-blur-lg ${className}`} 
         style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="p-3 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors flex-shrink-0"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate" 
                style={{ color: 'var(--text)' }}>
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-xs sm:text-sm lg:text-base truncate" 
                 style={{ color: 'var(--muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}

export default PageHeader
