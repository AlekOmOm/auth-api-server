# Task 002: Fix Login Redirect to Home

## Priority: 🔴 CRITICAL

## Status: ⏳ TODO

## Issue Description
Login form submits successfully but doesn't redirect to `/home` page after authentication.

### Current Behavior
- User enters valid credentials
- Form submits to backend
- Backend returns success response with user data
- `loginRedirect()` utility is called (line 56 in Login.svelte)
- But redirect doesn't happen or fails

### Expected Behavior (per test auth-flow.spec.js:50)
- User enters credentials
- Successful authentication
- Redirect to `/home`
- URL should contain "/home"

## Code Analysis

### Current Implementation Flow:
1. **Login.svelte** (line 49-58):
   ```javascript
   const response = await authStore.login(credentials);
   if (response.success) { 
     loginRedirect(response, currentReturnUrl); 
   }
   ```

2. **loginRedirect.js** Logic:
   - Priority 1: Uses `returnUrlFromSession` if provided
   - Priority 2: Falls back based on role:
     - `owner` role → `/owner`
     - Other roles → `/home`
   - Clears `auth_return_url` from sessionStorage
   - Uses `navigate()` for internal paths, `window.location.href` for external URLs

### The Problem
Based on the code, the redirect logic appears correct. Possible issues:
1. `authStore.login()` might not be returning `success: true`
2. The response data structure might not match what `loginRedirect()` expects
3. Navigation timing issue with Svelte routing
4. Session state not properly updated before navigation

## Root Cause Investigation Steps

### 1. Check authStore Response
```javascript
// Add debug logging in Login.svelte
console.log('Login response:', response);
console.log('Response success:', response.success);
console.log('Response data:', response.data);
```

### 2. Check loginRedirect Execution
The utility already has console logs. Check browser console for:
- `"🔄 [LOGIN REDIRECT UTIL] Starting redirect logic"`
- `"🔄 [LOGIN REDIRECT UTIL] Final determined return URL to use:"`
- `"🔄 [LOGIN REDIRECT UTIL] Internal path detected, Svelte navigating to:"`

### 3. Verify Navigation
```javascript
// In loginRedirect.js, add before navigate():
console.log('About to navigate, current URL:', window.location.href);
console.log('Navigation target:', finalReturnUrl);
```

## Implementation Fix

### Potential Solution 1: Force Navigation
```javascript
// In loginRedirect.js, replace navigate() call:
navigate(finalReturnUrl, { replace: true });
// Wait a tick for state updates
setTimeout(() => {
  if (window.location.pathname !== finalReturnUrl) {
    window.location.href = finalReturnUrl;
  }
}, 100);
```

### Potential Solution 2: Check Response Structure
```javascript
// In Login.svelte, ensure response has expected structure:
if (response && response.success === true) {
  // Ensure response.data exists
  if (!response.data) {
    console.error('Login response missing data:', response);
  }
  loginRedirect(response, currentReturnUrl);
}
```

### Potential Solution 3: Fix authStore
The issue might be in how `authStore.login()` formats its response. Check that it returns:
```javascript
{
  success: boolean,
  data: { id, name, email, role, ... },
  message: string
}
```

## Files to Check/Modify
- `src/routes/card/Login.svelte`
- `src/util/loginRedirect.js`
- `src/stores/authStore.js` (verify response format)
- `src/services/authApi.js` (check API response handling)

## Test Verification
```bash
# Test login flow with debugging
npx playwright test auth-flow.spec.js -g "should login with valid credentials" --debug

# Check browser console for navigation logs
```

## Additional Context
- The test expects navigation to `/home` after login
- `loginRedirect()` has logic for role-based redirects (owner → /owner, others → /home)
- External URL redirects use `window.location.href`
- Internal redirects use Svelte's `navigate()`
- Session storage is cleared after determining redirect URL

## Acceptance Criteria
- [ ] Login redirects to `/home` on success (for non-owner users)
- [ ] Login redirects to `/owner` for owner role users
- [ ] Session is established before redirect
- [ ] No JavaScript errors in console
- [ ] Playwright test assertion `expect(page.url()).toContain("/home")` passes 