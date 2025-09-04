import React, { useState, useRef, useCallback } from 'react'
import { uploadFile, UploadResult, UploadError } from '@/lib/storage'

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

      // Upload file
      const result = await uploadFile(file, 'product-images')
      
      if ('error' in result) {
        onError?.(result.message)
        setPreview(null)
      } else {
        onChange(result.url)
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
      <label className="block text-sm font-medium text-gray-700">
        รูปภาพสินค้า (ไม่บังคับ)
      </label>
      
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
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
          <div className="relative">
            <img
              src={preview}
              alt="Product preview"
              className="mx-auto max-h-48 max-w-full rounded-lg object-cover"
            />
            {!disabled && !isUploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveImage()
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-gray-400">
              <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  กำลังอัปโหลด...
                </span>
              ) : (
                <>
                  <span className="font-medium text-blue-600">คลิกเพื่ออัปโหลด</span>
                  <span className="text-gray-500"> หรือลากไฟล์มาวางที่นี่</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">
              PNG, JPG, WebP สูงสุด {maxSize}MB
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageUpload
