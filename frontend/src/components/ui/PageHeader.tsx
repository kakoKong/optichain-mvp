import React from 'react'
import ResponsiveNav from '@/components/ResponsiveNav'

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
    <ResponsiveNav
      title={title}
      subtitle={subtitle}
      action={action}
      className={className}
    />
  )
}

export default PageHeader
