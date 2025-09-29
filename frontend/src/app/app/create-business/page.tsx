'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { TrialCodeService, validateTrialCodeFallback } from '@/lib/trial-codes'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { PageLayout } from '@/components/ui/PageLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface BusinessFormData {
  name: string
  description: string
  phone: string
  address: string
  website: string
  email: string
  business_category: string
  business_size: string
  country: string
  city: string
  postal_code: string
  timezone: string
  currency: string
  trial_code: string
  logo_url?: string
}

const BUSINESS_CATEGORIES = [
  'Retail',
  'Restaurant',
  'Warehouse',
  'Manufacturing',
  'E-commerce',
  'Wholesale',
  'Service',
  'Other'
]

const BUSINESS_SIZES = [
  'Small (1-10 employees)',
  'Medium (11-50 employees)',
  'Large (51-200 employees)',
  'Enterprise (200+ employees)'
]

const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'THB', 'SGD', 'AUD', 'CAD', 'CHF', 'CNY'
]

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
  'Europe/Paris', 'Asia/Tokyo', 'Asia/Bangkok', 'Asia/Singapore',
  'Australia/Sydney', 'Pacific/Auckland'
]

export default function CreateBusinessPage() {
  const { user, loading: authLoading, resolveAppUserId } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trialCodeValid, setTrialCodeValid] = useState<boolean | null>(null)
  const [validatingCode, setValidatingCode] = useState(false)

  const [formData, setFormData] = useState<BusinessFormData>({
    name: '',
    description: '',
    phone: '',
    address: '',
    website: '',
    email: '',
    business_category: 'Retail',
    business_size: 'Small (1-10 employees)',
    country: '',
    city: '',
    postal_code: '',
    timezone: 'UTC',
    currency: 'USD',
    trial_code: '',
    logo_url: ''
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/app/signin')
      return
    }
  }, [authLoading, user, router])

  const validateTrialCode = async (code: string) => {
    if (!code.trim()) {
      setTrialCodeValid(null)
      return
    }

    setValidatingCode(true)
    try {
      // Try database validation first, fallback to hardcoded codes
      const isValid = await TrialCodeService.validateTrialCode(code) || validateTrialCodeFallback(code)
      setTrialCodeValid(isValid)
    } catch (err) {
      console.error('Error validating trial code:', err)
      // Fallback to hardcoded validation
      const isValid = validateTrialCodeFallback(code)
      setTrialCodeValid(isValid)
    } finally {
      setValidatingCode(false)
    }
  }

  const handleTrialCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value
    setFormData(prev => ({ ...prev, trial_code: code }))

    // Debounce validation
    const timeoutId = setTimeout(() => {
      validateTrialCode(code)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = (url: string | null) => {
    setFormData(prev => ({ ...prev, logo_url: url || '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!trialCodeValid) {
      setError('Please enter a valid trial code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const appUserId = await resolveAppUserId(user!)
      if (!appUserId) {
        throw new Error('Unable to resolve user ID')
      }

      // Calculate trial expiration (30 days from now)
      const trialExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      // Create business in Supabase
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert([{
          owner_id: appUserId,
          name: formData.name,
          description: formData.description,
          phone: formData.phone,
          address: formData.address,
          business_type: 'retail',
          logo_url: formData.logo_url,
          website: formData.website,
          email: formData.email,
          business_category: formData.business_category,
          business_size: formData.business_size,
          country: formData.country,
          city: formData.city,
          postal_code: formData.postal_code,
          timezone: formData.timezone,
          currency: formData.currency,
          trial_code_used: formData.trial_code,
          trial_expires_at: trialExpiresAt,
          is_trial_active: true
        }])
        .select()
        .single()

      if (businessError) {
        console.error('Error creating business:', businessError)
        throw new Error('Failed to create business')
      }

      // Mark trial code as used
      await TrialCodeService.markTrialCodeUsed(formData.trial_code, appUserId)

      // Create owner membership
      const { error: membershipError } = await supabase
        .from('business_members')
        .insert([{
          business_id: business.id,
          user_id: appUserId,
          role: 'owner'
        }])

      if (membershipError) {
        console.error('Error creating membership:', membershipError)
        throw new Error('Business created but failed to set up ownership')
      }

      // Redirect to dashboard
      router.push('/app/dashboard')
    } catch (err) {
      console.error('Error creating business:', err)
      setError(err instanceof Error ? err.message : 'Failed to create business')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Create Your Business"
        subtitle="Set up your business profile to get started with inventory management"
      />

      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Trial Code Section */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trial Code</h3>
              <div className="space-y-2">
                <p className="text-xs text-black text-muted-foreground">
                  Use this code to create your business. It’s valid for <span className="font-medium">30 days</span>.{" "}
                  <Link
                    href="https://optichain.com/request-trial-code"
                    target="_blank"
                    className="inline-flex items-center gap-1 underline underline-offset-2 hover:no-underline"
                  >
                    Request a code <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </p>
                <Input
                  name="trial_code"
                  type="text"
                  placeholder="Enter your free trial code"
                  value={formData.trial_code}
                  onChange={handleTrialCodeChange}
                  className={trialCodeValid === false ? 'border-red-500' : trialCodeValid === true ? 'border-green-500' : ''}
                />
                {validatingCode && (
                  <p className="text-sm text-gray-500">Validating code...</p>
                )}
                {trialCodeValid === true && (
                  <p className="text-sm text-green-600">✓ Valid trial code</p>
                )}
                {trialCodeValid === false && (
                  <p className="text-sm text-red-600">✗ Invalid or expired trial code</p>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <Input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="Describe your business"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Logo
                </label>
                <ImageUpload
                  value={formData.logo_url}
                  onChange={handleImageUpload}
                  onError={(error) => setError(error)}
                  bucketType="business_logo"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <Input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="business@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <Input
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://www.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="Enter your business address"
                />
              </div>
            </div>

            {/* Business Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Business Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Category
                  </label>
                  <select
                    name="business_category"
                    value={formData.business_category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  >
                    {BUSINESS_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Size
                  </label>
                  <select
                    name="business_size"
                    value={formData.business_size}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  >
                    {BUSINESS_SIZES.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <Input
                    name="country"
                    type="text"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="United States"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <Input
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="New York"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <Input
                    name="postal_code"
                    type="text"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    placeholder="10001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  >
                    {CURRENCIES.map(currency => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t">
              <Button
                type="submit"
                disabled={loading || !trialCodeValid || !formData.name.trim()}
                className="w-full"
              >
                {loading ? 'Creating Business...' : 'Create Business'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PageLayout>
  )
}
