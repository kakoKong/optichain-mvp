import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create server-side Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables for server-side operations')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Starting image upload...')
    
    // Check if service role key is available
    if (!supabaseServiceKey) {
      console.error('[API] Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      return NextResponse.json(
        { error: 'Server configuration error: Missing service role key' },
        { status: 500 }
      )
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucketName = formData.get('bucketName') as string || 'product-images'

    console.log('[API] Upload details:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type, 
      bucketName 
    })

    // Validate bucket name
    const allowedBuckets = ['product-images', 'store_logo']
    if (!allowedBuckets.includes(bucketName)) {
      return NextResponse.json(
        { error: 'Invalid bucket name. Allowed buckets: product-images, store_logo' },
        { status: 400 }
      )
    }

    if (!file) {
      console.error('[API] No file provided')
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = bucketName === 'store_logo' ? `logos/${fileName}` : `products/${fileName}`

    console.log('[API] Uploading to Supabase:', { filePath, bucketName })
    console.log('[API] Supabase client:', supabase)

    // Test if we can access storage
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    console.log('[API] Available buckets:', buckets, 'Error:', bucketsError)

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file)

    if (error) {
      console.error('[API] Supabase upload error:', error)
      return NextResponse.json(
        { error: `Failed to upload file: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('[API] Upload successful:', data)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    console.log('[API] Generated public URL:', publicUrl)
    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}