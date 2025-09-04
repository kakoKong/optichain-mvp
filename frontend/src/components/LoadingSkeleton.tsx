'use client'

import { memo } from 'react'

interface SkeletonProps {
  className?: string
  height?: string
  width?: string
}

const Skeleton = memo(({ className = '', height = 'h-4', width = 'w-full' }: SkeletonProps) => (
  <div className={`animate-pulse bg-gray-200 rounded ${height} ${width} ${className}`} />
))

export const DashboardSkeleton = memo(() => (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6 space-y-6">
    {/* Header Skeleton */}
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton height="h-8" width="w-64" />
          <Skeleton height="h-4" width="w-48" />
        </div>
        <Skeleton height="h-10" width="w-32" />
      </div>
    </div>

    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <Skeleton height="h-12" width="w-12" className="rounded-lg" />
            <div className="space-y-2">
              <Skeleton height="h-4" width="w-20" />
              <Skeleton height="h-6" width="w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Content Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <Skeleton height="h-6" width="w-48" />
          </div>
          <div className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-4">
                <Skeleton height="h-10" width="w-10" className="rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton height="h-4" width="w-3/4" />
                  <Skeleton height="h-3" width="w-1/2" />
                </div>
                <Skeleton height="h-4" width="w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
))

export const ProductSkeleton = memo(() => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <Skeleton height="h-48" width="w-full" className="rounded-lg mb-4" />
        <div className="space-y-2">
          <Skeleton height="h-5" width="w-3/4" />
          <Skeleton height="h-4" width="w-1/2" />
          <Skeleton height="h-4" width="w-1/3" />
        </div>
      </div>
    ))}
  </div>
))

export const TransactionSkeleton = memo(() => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-4">
          <Skeleton height="h-12" width="w-12" className="rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton height="h-5" width="w-3/4" />
            <Skeleton height="h-4" width="w-1/2" />
            <div className="flex gap-4">
              <Skeleton height="h-3" width="w-20" />
              <Skeleton height="h-3" width="w-24" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <Skeleton height="h-4" width="w-20" />
            <Skeleton height="h-3" width="w-16" />
          </div>
        </div>
      </div>
    ))}
  </div>
))

export default Skeleton
