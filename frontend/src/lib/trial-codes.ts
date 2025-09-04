import { supabase } from './supabase'

export interface TrialCode {
  id: string
  code: string
  is_used: boolean
  used_by?: string
  used_at?: string
  expires_at?: string
  created_at: string
  created_by?: string
}

export class TrialCodeService {
  /**
   * Validate a trial code
   */
  static async validateTrialCode(code: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('trial_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_used', false)
        .single()

      if (error || !data) {
        return false
      }

      // Check if code is expired
      if (data.expires_at) {
        const expiresAt = new Date(data.expires_at)
        const now = new Date()
        if (expiresAt < now) {
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Error validating trial code:', error)
      return false
    }
  }

  /**
   * Mark a trial code as used
   */
  static async markTrialCodeUsed(code: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trial_codes')
        .update({
          is_used: true,
          used_by: userId,
          used_at: new Date().toISOString()
        })
        .eq('code', code.toUpperCase())

      if (error) {
        console.error('Error marking trial code as used:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error marking trial code as used:', error)
      return false
    }
  }

  /**
   * Create a new trial code (admin function)
   */
  static async createTrialCode(
    code: string, 
    expiresDays: number = 30, 
    createdBy?: string
  ): Promise<TrialCode | null> {
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresDays)

      const { data, error } = await supabase
        .from('trial_codes')
        .insert({
          code: code.toUpperCase(),
          is_used: false,
          expires_at: expiresAt.toISOString(),
          created_by: createdBy
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating trial code:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating trial code:', error)
      return null
    }
  }

  /**
   * Get all trial codes (admin function)
   */
  static async getAllTrialCodes(): Promise<TrialCode[]> {
    try {
      const { data, error } = await supabase
        .from('trial_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching trial codes:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching trial codes:', error)
      return []
    }
  }

  /**
   * Get unused trial codes
   */
  static async getUnusedTrialCodes(): Promise<TrialCode[]> {
    try {
      const { data, error } = await supabase
        .from('trial_codes')
        .select('*')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching unused trial codes:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching unused trial codes:', error)
      return []
    }
  }
}

// Hardcoded trial codes for fallback (in case database is not set up yet)
export const HARDCODED_TRIAL_CODES = [
  'TRIAL2024',
  'FREETRIAL',
  'STARTUP2024',
  'DEMO1234'
]

/**
 * Fallback validation using hardcoded codes
 */
export function validateTrialCodeFallback(code: string): boolean {
  return HARDCODED_TRIAL_CODES.includes(code.toUpperCase())
}
