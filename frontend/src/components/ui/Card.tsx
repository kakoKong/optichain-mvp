import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  hover?: boolean
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  style,
  onClick,
  hover = false
}) => {
  const baseClasses = "rounded-2xl shadow-sm border backdrop-blur-xl"
  const hoverClasses = hover ? "cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg" : ""
  
  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        ...style
      }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export default Card
