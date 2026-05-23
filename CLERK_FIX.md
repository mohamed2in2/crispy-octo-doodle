# Clerk Runtime Error Fix

## Problem
```
Clerk: Failed to load Clerk JS, failed to load script: 
https://clerk.alasly.live/npm/@clerk/clerk-js@6/dist/clerk.browser.js
(code="failed_to_load_clerk_js")
```

## Root Cause
The Clerk publishable key in `.env` is configured for a **custom domain** (`clerk.alasly.live`), but either:
1. The custom domain is not properly configured in Clerk's dashboard
2. DNS records for the custom domain are missing or incorrect
3. The custom CDN URL is not accessible

## Solution Options

### Option 1: Use Clerk Test Keys (Recommended for Development)
If you're in development mode, use test keys from Clerk:

1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to **API Keys** section
4. Copy the test keys (they start with `pk_test_` and `sk_test_`)
5. Update `.env`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_YOUR_TEST_KEY"
CLERK_SECRET_KEY="sk_test_YOUR_TEST_KEY"
```

### Option 2: Fix Custom Domain Configuration
If you want to keep the custom domain setup:

1. Go to https://dashboard.clerk.com
2. Select your application → **Settings**
3. Go to **Domains** section
4. Verify your custom domain is properly configured:
   - Add the custom domain (e.g., `alasly.live`)
   - Complete DNS verification (add CNAME records as instructed)
   - Wait for Clerk to verify the domain
5. Ensure the custom domain is set as primary

### Option 3: Check Environment Variables
Verify the environment is loading correctly:

```bash
# Check what's loaded
echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
echo $CLERK_SECRET_KEY

# Make sure .env is in the right place
ls -la .env .env.local
```

### Option 4: Clear Browser Cache
The error might be cached by the browser:

1. Open DevTools → Application
2. Clear Storage (Cache Storage, LocalStorage, SessionStorage)
3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Quick Fix Steps

1. **Check Clerk Dashboard**: Verify domain is properly configured
2. **Update Environment Variables**: Replace with test keys or verify custom domain
3. **Restart Dev Server**: 
   ```bash
   npm run dev
   ```
4. **Clear Browser Cache**: Hard refresh the page
5. **Check Console**: Look for more specific error messages

## Testing the Fix

After applying the fix:

1. Go to `http://localhost:3000/login`
2. You should see the Clerk sign-in form (not an error)
3. Check DevTools console for any remaining errors
4. Try signing up or logging in

## Environment Variable Reference

```env
# Test keys (development)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_YOUR_KEY"
CLERK_SECRET_KEY="sk_test_YOUR_KEY"

# Custom domain keys (production - requires DNS setup)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_YOUR_KEY"
CLERK_SECRET_KEY="sk_live_YOUR_KEY"
```

## Additional Resources

- [Clerk Custom Domain Setup](https://clerk.com/docs/deployments/custom-domain)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [Clerk Troubleshooting](https://clerk.com/docs/support/troubleshooting)
