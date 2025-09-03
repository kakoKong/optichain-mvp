import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json()

    if (!code || !redirectUri) {
      return NextResponse.json(
        { error: 'Missing code or redirectUri' },
        { status: 400 }
      )
    }

    const clientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID
    const clientSecret = process.env.LINE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'LINE OAuth not configured' },
        { status: 500 }
      )
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('LINE token exchange failed:', errorData)
      return NextResponse.json(
        { error: 'Failed to exchange code for token' },
        { status: 400 }
      )
    }

    const tokenData = await tokenResponse.json()

    return NextResponse.json(tokenData)
  } catch (error) {
    console.error('Token exchange error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
