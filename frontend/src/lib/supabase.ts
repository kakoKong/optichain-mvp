// lib/supabase.ts
'use client'
import { createClient } from '@supabase/supabase-js'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are not properly configured. Please check your .env.local file.')
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  { 
    auth: { 
      persistSession: true, 
      autoRefreshToken: true, 
      detectSessionInUrl: true 
    } 
  }
)

// Test the connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection test failed:', error)
  } else {
    console.log('Supabase connection test successful:', { hasSession: !!data.session })
  }
}).catch(error => {
  console.error('Supabase connection test error:', error)
})