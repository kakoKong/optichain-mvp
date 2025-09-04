import React, { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface ImageUploadProps {
  value?: string // Current image URL
  onChange: (url: string | null) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
  maxSize?: number // in MB
  acceptedTypes?: string[]
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onError,
  disabled = false,
  className = '',
  maxSize = 5,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update preview when value prop changes
  React.useEffect(() => {
    setPreview(value || null)
  }, [value])

  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled || isUploading) return

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      onError?.('Only JPEG, PNG, and WebP images are allowed')
      return
    }

    // Validate file size
    const maxSizeBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      onError?.(`File size must be less than ${maxSize}MB`)
      return
    }

    setIsUploading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Try Supabase Storage first, fallback to API route
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `business-logos/${fileName}`

        const { data, error } = await supabase.storage
          .from('images')
          .upload(filePath, file)

        if (error) {
          throw error
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath)

        onChange(publicUrl)
      } catch (supabaseError) {
        // Fallback to API route
        console.log('Supabase upload failed, trying API route:', supabaseError)
        
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        }
        
        const data = await response.json()
        onChange(data.url)
      }
    } catch (error) {
      console.error('Upload error:', error)
      onError?.('Upload failed. Please try again.')
      setPreview(null)
    } finally {
      setIsUploading(false)
    }
  }, [disabled, isUploading, acceptedTypes, maxSize, onChange, onError])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled || isUploading) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [disabled, isUploading, handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleRemoveImage = useCallback(() => {
    if (disabled || isUploading) return
    setPreview(null)
    onChange(null)
  }, [disabled, isUploading, onChange])

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }, [disabled, isUploading])

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 min-h-[120px] flex items-center justify-center
          ${isDragging ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isUploading ? 'opacity-75 cursor-wait' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt="Business logo preview"
              className="mx-auto max-h-24 max-w-full rounded-lg object-cover shadow-sm"
            />
            {!disabled && !isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveImage()
                  }}
                  className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-all duration-200 transform scale-75 group-hover:scale-100"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-gray-400">
              {isUploading ? (
                <div className="mx-auto w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              ) : (
                <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">
                {isUploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span>Uploading...</span>
                  </span>
                ) : (
                  <>
                    <span className="text-blue-600">Click to upload</span>
                    <span className="text-gray-500"> or drag and drop</span>
                  </>
                )}
              </div>
              <div className="text-xs text-gray-500">
                PNG, JPG, WebP up to {maxSize}MB
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageUpload
