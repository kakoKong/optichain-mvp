# Development Environment Setup

This guide explains how to set up and use the development authentication system that bypasses LINE authentication for local development.

## Quick Start

1. **Create environment file**:
   ```bash
   cp env.example .env.local
   ```

2. **Enable development mode** in `.env.local`:
   ```bash
   NEXT_PUBLIC_DEV_MODE=true
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Use the dev login** - A yellow "Dev Login" box will appear in the bottom-right corner

## How It Works

### Development Mode Detection
The app automatically detects development mode when:
- `NODE_ENV === 'development'` (automatic in npm run dev)
- `NEXT_PUBLIC_DEV_MODE === 'true'` (manual override)
- Running on `localhost` (automatic detection)

### Authentication Flow
1. **Dev Mode Active**: Shows dev login interface
2. **Enter Username**: Any username works (e.g., "test", "dev", "admin")
3. **Instant Login**: No external authentication required
4. **Full Access**: Access to all protected routes and features

### User ID Format
Dev users get unique IDs like:
- `dev_test_1703123456789`
- `dev_admin_1703123456790`
- `dev_developer_1703123456791`

## Environment Variables

### Required for Development
```bash
# Enable dev mode
NEXT_PUBLIC_DEV_MODE=true

# Supabase (still needed for data)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### Optional
```bash
# LINE LIFF (not needed in dev mode)
NEXT_PUBLIC_LINE_LIFF_ID=your_liff_id

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Switching Between Modes

### Development Mode
- Set `NEXT_PUBLIC_DEV_MODE=true`
- Use dev login interface
- No LINE authentication required
- Perfect for local testing

### Production Mode
- Set `NEXT_PUBLIC_DEV_MODE=false` or remove the variable
- Use LINE authentication
- Full production flow
- Deploy to production

## Features

### Dev Login Component
- **Fixed Position**: Bottom-right corner, always visible
- **Simple Interface**: Just enter username and click sign in
- **Status Display**: Shows current dev user when logged in
- **Auto-hide**: Only appears in development mode

### Authentication Context
- **Hybrid Support**: Handles both dev and LINE users
- **Seamless Switching**: Can switch between modes without restart
- **Persistent**: Dev login persists across page refreshes
- **Type Safe**: Full TypeScript support

## Troubleshooting

### Dev Login Not Appearing
- Check `NEXT_PUBLIC_DEV_MODE=true` in `.env.local`
- Ensure you're running `npm run dev`
- Check browser console for errors

### Can't Access Protected Routes
- Make sure you're logged in via dev login
- Check that dev user is stored in localStorage
- Verify AuthContext is working properly

### Switching Back to LINE
- Set `NEXT_PUBLIC_DEV_MODE=false`
- Clear localStorage: `localStorage.removeItem('devUser')`
- Restart development server

## Security Notes

⚠️ **Important**: Development mode is for local development only!

- **Never deploy** with `NEXT_PUBLIC_DEV_MODE=true`
- **Never commit** `.env.local` to version control
- **Dev users** have full access to all features
- **No password** required - username only
- **Local storage** based - not secure for production

## Advanced Usage

### Custom Dev Users
You can modify the `signInDev` function in `AuthContext.tsx` to:
- Add custom user properties
- Implement role-based access
- Add validation rules
- Integrate with local databases

### Environment-Specific Features
```typescript
// In your components
const { isDevMode, user } = useAuth()

if (isDevMode) {
  // Show development-only features
  console.log('Dev mode active')
}

if (user?.source === 'dev') {
  // Handle dev user specifically
  console.log('Dev user:', user.displayName)
}
```

## Migration from LINE-Only

If you're upgrading from the previous LINE-only system:

1. **No Breaking Changes**: All existing LINE authentication continues to work
2. **Optional Dev Mode**: Can be enabled/disabled via environment variable
3. **Hybrid Support**: Same codebase supports both authentication methods
4. **Easy Testing**: No more need to test through LINE app

## Support

For issues with the development authentication system:
1. Check browser console for error messages
2. Verify environment variables are set correctly
3. Check that `.env.local` is in the frontend directory
4. Ensure you're running the latest version of the code
