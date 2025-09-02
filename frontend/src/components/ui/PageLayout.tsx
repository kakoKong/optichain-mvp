import React from 'react'

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
}

export const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`min-h-screen relative overflow-hidden ${className}`} 
         style={{
           backgroundImage: 'linear-gradient(to bottom right, var(--bg-from), var(--bg-via), var(--bg-to))',
         }}>
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      {/* Content */}
      <div className="relative z-10 p-4 sm:p-6 space-y-6 sm:space-y-8 pb-20 sm:pb-6">
        {children}
      </div>
    </div>
  )
}

export default PageLayout
