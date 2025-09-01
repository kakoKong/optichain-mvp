// frontend/app/liff/page.tsx
'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    liff: any;
  }
}

export default function LiffPage() {
  const [liffInitialized, setLiffInitialized] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    // Load LIFF SDK
    const script = document.createElement('script')
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
    script.async = true
    script.onload = () => initializeLiff()
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const initializeLiff = async () => {
    try {
      await window.liff.init({ liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID })
      setLiffInitialized(true)

      if (window.liff.isLoggedIn()) {
        const profile = await window.liff.getProfile()
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('LIFF initialization failed:', error)
    }
  }

  const loginWithLine = () => {
    if (!window.liff.isLoggedIn()) {
      window.liff.login()
    }
  }

  if (!liffInitialized) {
    return <div className="p-4">Loading LIFF...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">📦 Inventory Copilot</h1>

        {!userProfile ? (
          <button
            onClick={loginWithLine}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg"
          >
            Login with LINE
          </button>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow">
            <h2>Welcome, {userProfile.displayName}!</h2>
            <p className="text-sm text-gray-600">LIFF is working! 🎉</p>
          </div>
        )}
      </div>
    </div>
  )
}
