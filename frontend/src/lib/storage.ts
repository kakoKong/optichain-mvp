// lib/storage.ts
import { supabase } from './supabase'

export interface UploadResult {
  url: string
  path: string
}

export interface UploadError {
  error: string
  message: string
}

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name
 * @param path - The path within the bucket (optional, will generate if not provided)
 * @returns Promise with upload result or error
 */
export async function uploadFile(
  file: File,
  bucket: string = 'product-images',
  path?: string
): Promise<UploadResult | UploadError> {
  try {
    // Generate a unique filename if path is not provided
    const fileExt = file.name.split('.').pop()
    const fileName = path || `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return {
        error: 'INVALID_FILE_TYPE',
        message: 'Only JPEG, PNG, and WebP images are allowed'
      }
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return {
        error: 'FILE_TOO_LARGE',
        message: 'File size must be less than 5MB'
      }
    }

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return {
        error: 'UPLOAD_FAILED',
        message: error.message
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return {
      url: urlData.publicUrl,
      path: data.path
    }
  } catch (err) {
    console.error('Upload error:', err)
    return {
      error: 'UPLOAD_FAILED',
      message: err instanceof Error ? err.message : 'Upload failed'
    }
  }
}

/**
 * Delete a file from Supabase Storage
 * @param path - The file path in the bucket
 * @param bucket - The storage bucket name
 * @returns Promise with success status
 */
export async function deleteFile(
  path: string,
  bucket: string = 'product-images'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Delete error:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Delete failed' 
    }
  }
}

/**
 * Get a public URL for a file in Supabase Storage
 * @param path - The file path in the bucket
 * @param bucket - The storage bucket name
 * @returns Public URL
 */
export function getPublicUrl(
  path: string,
  bucket: string = 'product-images'
): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  
  return data.publicUrl
}

/**
 * Create a storage bucket if it doesn't exist
 * @param bucketName - The name of the bucket to create
 * @returns Promise with success status
 */
export async function createBucket(
  bucketName: string = 'product-images'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    })

    if (error) {
      console.error('Bucket creation error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Bucket creation error:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Bucket creation failed' 
    }
  }
}
