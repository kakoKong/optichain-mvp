# Authentication Setup

This application uses Supabase for authentication with support for both Google OAuth and LINE LIFF integration.

## Environment Variables

Create a `.env.local` file in the `frontend` directory with the following variables:

```bash
# Required: Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Required for LINE integration: LINE LIFF Configuration
NEXT_PUBLIC_LINE_LIFF_ID=your_line_liff_id

# Optional: Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Authentication Flow

### Google OAuth (Primary)
1. User clicks "Continue with Google" button
2. Redirects to Google OAuth
3. After successful authentication, redirects to `/auth/callback`
4. Supabase processes the OAuth response
5. User is redirected to dashboard or stored redirect path

### LINE LIFF (Enhanced Integration)
1. **Automatic Detection**: App detects if accessed from LINE app or with LIFF parameters
2. **LINE Authentication**: User authenticates with LINE (if not already logged in)
3. **Supabase Integration**: LINE ID token is exchanged for Supabase session
4. **Session Persistence**: Supabase session is maintained across the LINE app
5. **Seamless Experience**: User stays authenticated throughout their LINE app session

## How LINE LIFF Sessions Work

### Session Creation
- When user opens the app in LINE, LIFF automatically authenticates with LINE
- The LINE ID token is exchanged for a Supabase session using `signInWithIdToken`
- This creates a persistent Supabase session that works across the entire app

### Session Maintenance
- **In LINE App**: Session persists automatically through LIFF
- **In Browser**: Session persists through Supabase's built-in session management
- **Cross-Platform**: Same user account works in both LINE and web browser

### Why This Approach Works
- **Single Source of Truth**: Supabase manages all authentication state
- **Consistent Experience**: Same authentication logic for both Google and LINE
- **Persistent Sessions**: No more losing authentication in LINE app
- **Secure**: Uses LINE's official ID token exchange

## Protected Routes

All routes under `(protected)` folder require authentication:
- `/dashboard` - Main dashboard
- `/liff/*` - LINE-specific features
- `/team` - Team management
- `/get-started` - Onboarding

## Authentication State Management

The app uses a custom `useHybridAuth` hook that:
- Manages authentication state
- Handles session persistence
- Provides loading states
- Automatically redirects unauthenticated users
- **NEW**: Automatically checks for LINE LIFF authentication

## File Structure for Authentication

```
frontend/src/
├── app/
│   ├── (public)/
│   │   └── signin/
│   │       ├── SignInClient.tsx      # Main sign-in page (Google + LINE)
│   │       └── SupabaseSignIn.tsx    # Google OAuth component
│   ├── (protected)/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── page.tsx          # OAuth callback handler
│   │   ├── liff/
│   │   │   └── page.tsx              # LINE LIFF authentication page
│   │   └── layout.tsx                # Protected route wrapper
│   └── layout.tsx
├── components/
│   └── LogoutButton.tsx              # Logout functionality
├── hooks/
│   └── useHybridAuth.ts              # Authentication state management
└── lib/
    ├── supabase.ts                   # Supabase client configuration
    └── userhelper.ts                 # User ID resolution
```

## Troubleshooting

### Common Issues

1. **"Failed to sign in" error**
   - Check that Supabase environment variables are set correctly
   - Verify Google OAuth is configured in Supabase dashboard
   - Check browser console for detailed error messages

2. **Authentication callback errors**
   - Ensure redirect URLs are configured correctly in Supabase
   - Check that the callback route is accessible

3. **LINE integration not working**
   - Verify `NEXT_PUBLIC_LINE_LIFF_ID` is set
   - Check LINE Developer Console for correct configuration
   - Ensure LIFF app has proper scopes (openid, profile)
   - **NEW**: Make sure LINE provider is enabled in Supabase Auth settings

4. **LINE sessions not persisting**
   - **SOLVED**: Sessions now persist through Supabase integration
   - Check that LINE provider is properly configured in Supabase
   - Verify ID token exchange is working

### Debug Mode

Enable debug logging by adding this to your browser console:
```javascript
localStorage.setItem('supabase.debug', 'true')
```

## Security Notes

- Never expose your Supabase service role key in the frontend
- Use environment variables for all sensitive configuration
- Implement proper CORS policies in your backend
- Consider implementing rate limiting for authentication endpoints
- LINE ID tokens are securely exchanged for Supabase sessions
- All authentication state is managed by Supabase's secure infrastructure

## Migration from Old System

If you're upgrading from the previous authentication system:

1. **No Breaking Changes**: All existing Google OAuth flows continue to work
2. **Enhanced LINE Support**: LINE authentication now creates persistent Supabase sessions
3. **Simplified Code**: Removed complex popup window logic and race conditions
4. **Better Error Handling**: More user-friendly error messages and recovery options
