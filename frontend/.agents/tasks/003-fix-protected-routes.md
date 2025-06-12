# Task 003: Fix Protected Route Access Control

## Priority: 🔴 CRITICAL

## Status: ⏳ TODO

## Issue Description
Protected routes (like `/owner`) are not redirecting unauthenticated users to the login page.

### Current Behavior
- Unauthenticated user accesses `/owner`
- ProtectedRoute component checks authentication
- Complex state management with loading states
- Redirect might be attempted but fails or gets cancelled
- Page times out in tests

### Expected Behavior (per test auth-flow.spec.js:91-93)
- Unauthenticated user accesses protected route
- Immediate redirect to `/login`
- URL should contain "/login"

## Code Analysis

### Current ProtectedRoute Implementation:
The component has complex logic with multiple state checks:

1. **State Management**:
   - `isAuthenticated`: From authStore
   - `loading`: Auth loading state
   - `hasAttemptedRedirect`: Prevents redirect loops

2. **Redirect Logic** (in $effect):
   - Only redirects if route is active (`location.pathname === path`)
   - Waits for `!loading` before checking authentication
   - Uses `setTimeout(() => navigate('/login'), 0)` for deferred navigation
   - Stores return URL in sessionStorage before redirect

3. **Render Logic**:
   - Shows "Loading..." while auth state loads
   - Renders children only if authenticated and route active
   - Empty render for inactive routes

### Identified Issues:
1. **Over-complicated State Logic**: Too many conditions to check before redirect
2. **Deferred Navigation**: `setTimeout` might be causing timing issues
3. **Route Active Check**: Might prevent redirects in certain scenarios
4. **Loading State**: Might never resolve to false

## Root Cause
The component is trying to handle too many edge cases, making the redirect logic fragile. The deferred navigation and multiple state checks create race conditions.

## Implementation Fix

### Simplified Approach:
```javascript
<script>
  import { authStore } from '../stores/authStore.js';
  import { navigate } from 'svelte-routing';
  import { onMount } from 'svelte';

  let { path = "", location, children } = $props();

  // Simple reactive redirect
  $: if (location && location.pathname === path && !$authStore.loading && !$authStore.isAuthenticated) {
    // Store return URL
    const currentFullPath = location.pathname + location.search + location.hash;
    sessionStorage.setItem('auth_return_url', currentFullPath);
    
    // Immediate redirect
    navigate('/login', { replace: true });
  }
</script>

{#if location && location.pathname === path}
  {#if $authStore.loading}
    <p>Loading...</p>
  {:else if $authStore.isAuthenticated}
    {@render children()}
  {:else}
    <p>Redirecting to login...</p>
  {/if}
{/if}
```

### Alternative Fix (Minimal Changes):
If the above is too drastic, fix the existing code:

1. **Remove Deferred Navigation**:
   ```javascript
   // Instead of setTimeout
   navigate('/login', { replace: true });
   ```

2. **Simplify Conditions**:
   ```javascript
   if (location?.pathname === path && !loading && !isAuthenticated && !hasAttemptedRedirect) {
     hasAttemptedRedirect = true;
     sessionStorage.setItem('auth_return_url', currentFullPath);
     navigate('/login', { replace: true });
   }
   ```

3. **Add Fallback**:
   ```javascript
   // After navigation attempt
   if (!isAuthenticated && !loading && location?.pathname === path) {
     // Force redirect if still on protected page
     window.location.href = '/login';
   }
   ```

## Files to Modify
- `src/components/ProtectedRoute.svelte` (primary fix)
- `src/stores/authStore.js` (ensure loading state resolves)
- `src/App.svelte` (verify ProtectedRoute usage)

## Test Verification
```bash
# Test protected route redirect
npx playwright test auth-flow.spec.js -g "should prevent access to protected routes"

# Test with visual debugging
npx playwright test auth-flow.spec.js -g "protected" --headed --debug
```

## Additional Context
- The component uses Svelte 5 syntax (`$props()`, `$effect`, `@render`)
- Multiple console.log statements for debugging (can be removed after fix)
- `hasAttemptedRedirect` flag tries to prevent redirect loops
- Component subscribes to authStore manually

## Debug Steps
1. Check browser console for these logs:
   - `"🔍 [ProtectedRoute $effect path="/owner"] Evaluating:"`
   - `"🔍 [ProtectedRoute $effect path="/owner"] User not authenticated..."`
   - `"🔍 [ProtectedRoute $effect path="/owner"] Navigating to /login"`

2. Verify authStore state:
   ```javascript
   // In browser console
   authStore.subscribe(state => console.log('Auth state:', state))
   ```

## Acceptance Criteria
- [ ] Accessing `/owner` while logged out redirects to `/login`
- [ ] Accessing `/home` while logged out redirects to `/login`
- [ ] Return URL is stored in sessionStorage
- [ ] No redirect loops or timing issues
- [ ] Test assertion `expect(page.url()).toContain("/login")` passes
- [ ] No "Loading..." stuck states 