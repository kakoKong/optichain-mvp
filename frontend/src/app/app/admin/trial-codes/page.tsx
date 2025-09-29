'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { TrialCodeService, TrialCode } from '@/lib/trial-codes'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { PageLayout } from '@/components/ui/PageLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function TrialCodesPage() {
  const { user, loading: authLoading } = useAuth()
  const [trialCodes, setTrialCodes] = useState<TrialCode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newCode, setNewCode] = useState('')
  const [expiresDays, setExpiresDays] = useState(30)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      window.location.href = '/signin'
      return
    }
    loadTrialCodes()
  }, [authLoading, user])

  const loadTrialCodes = async () => {
    setLoading(true)
    try {
      const codes = await TrialCodeService.getAllTrialCodes()
      setTrialCodes(codes)
    } catch (err) {
      console.error('Error loading trial codes:', err)
      setError('Failed to load trial codes')
    } finally {
      setLoading(false)
    }
  }

  const createTrialCode = async () => {
    if (!newCode.trim()) {
      setError('Please enter a trial code')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const code = await TrialCodeService.createTrialCode(newCode, expiresDays, user?.id)
      if (code) {
        setNewCode('')
        await loadTrialCodes()
      } else {
        setError('Failed to create trial code')
      }
    } catch (err) {
      console.error('Error creating trial code:', err)
      setError('Failed to create trial code')
    } finally {
      setLoading(false)
    }
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewCode(result)
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
        title="Trial Code Management" 
        subtitle="Create and manage trial codes for business creation"
      />
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Create New Trial Code */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Trial Code</h3>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trial Code
              </label>
              <div className="flex gap-2">
                <Input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="Enter trial code"
                  className="flex-1"
                />
                <Button
                  onClick={generateRandomCode}
                  variant="outline"
                  className="px-3"
                >
                  Generate
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expires In (Days)
              </label>
              <Input
                type="number"
                value={expiresDays}
                onChange={(e) => setExpiresDays(parseInt(e.target.value) || 30)}
                min="1"
                max="365"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={createTrialCode}
                disabled={loading || !newCode.trim()}
                className="w-full"
              >
                {loading ? 'Creating...' : 'Create Code'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Trial Codes List */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Trial Codes</h3>
            <Button
              onClick={loadTrialCodes}
              variant="outline"
              disabled={loading}
            >
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Code</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Used By</th>
                    <th className="text-left py-2">Used At</th>
                    <th className="text-left py-2">Expires At</th>
                    <th className="text-left py-2">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {trialCodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No trial codes found
                      </td>
                    </tr>
                  ) : (
                    trialCodes.map((code) => (
                      <tr key={code.id} className="border-b">
                        <td className="py-2 font-mono font-semibold">{code.code}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            code.is_used 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {code.is_used ? 'Used' : 'Available'}
                          </span>
                        </td>
                        <td className="py-2 text-gray-600">
                          {code.used_by ? code.used_by.substring(0, 8) + '...' : '-'}
                        </td>
                        <td className="py-2 text-gray-600">
                          {code.used_at ? new Date(code.used_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-2 text-gray-600">
                          {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-2 text-gray-600">
                          {new Date(code.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  )
}
