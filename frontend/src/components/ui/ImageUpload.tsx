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
  bucketType?: 'product_images' | 'business_logo' // Bucket type for upload
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onError,
  disabled = false,
  className = '',
  maxSize = 5,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  bucketType = 'product_images'
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

        // Determine bucket and path based on bucketType
        const bucketName = bucketType === 'business_logo' ? 'store_logo' : 'product-images'
        const filePath = bucketType === 'business_logo' ? `git ad${fileName}` : `${fileName}`
        console.log('Uploading to bucket:', bucketName, 'path:', filePath)
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file)

        if (error) {
          console.error('Supabase upload error:', error)
          throw error
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath)

        onChange(publicUrl)
      } catch (supabaseError) {
        // Fallback to API route
        console.log('Supabase upload failed, trying API route:', supabaseError)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucketName', bucketType === 'business_logo' ? 'STORE_LOGO' : 'PRODUCT-IMAGES')

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
    <div className={`space-y-2`}>
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
              alt="Image preview"
              className="mx-auto max-h-24 max-w-full rounded-lg object-cover shadow-sm"
              onError={(e) => {
                console.error('Image failed to load:', preview)
                // Hide the broken image and show placeholder
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                // Show the upload placeholder instead
                setPreview(null)
                onChange(null)
              }}
            />
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
