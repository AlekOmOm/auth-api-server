# Task 001: Fix Registration Redirect

## Priority: 🔴 CRITICAL

## Status: ⏳ TODO

## Issue Description
Registration form submits successfully but doesn't redirect to login page with the expected `?registered=true` query parameter.

### Current Behavior
- User fills registration form
- Form submits to backend
- Success message shows "Registration successful! Please log in."
- Page waits 2 seconds (line 54-57 in Register.svelte)
- Navigation happens but WITHOUT the `registered=true` query parameter

### Expected Behavior (per test auth-flow.spec.js:29-30)
- User fills registration form
- Form submits successfully
- Redirect to `/login?registered=true`
- Success message/indicator shown on login page

## Code Analysis

### Current Implementation (Register.svelte lines 54-57)
```javascript
setTimeout(() => {
  const loginUrl = buildUrlWithReturnUrl('/login');
  navigate(loginUrl);
}, 2000);
```

### The Problem
`buildUrlWithReturnUrl()` only adds `return_url` parameter if it exists in sessionStorage, but doesn't add the `registered=true` parameter that the test expects.

### Related Functions
- `buildUrlWithReturnUrl()` in `returnUrlHandler.js` - Only handles `return_url` parameter
- `navigate()` from svelte-routing - Used for client-side navigation

## Root Cause
The registration flow is missing the logic to append `registered=true` to the login URL after successful registration.

## Implementation Fix

### Solution: Modify lines 54-57 in Register.svelte
```javascript
setTimeout(() => {
  const loginUrl = buildUrlWithReturnUrl('/login');
  // Add registered=true parameter
  const separator = loginUrl.includes('?') ? '&' : '?';
  const loginUrlWithRegistered = `${loginUrl}${separator}registered=true`;
  navigate(loginUrlWithRegistered);
}, 2000);
```

### Alternative: Create a dedicated function
```javascript
// Add to returnUrlHandler.js
export function buildLoginUrlAfterRegistration(basePath) {
  const urlWithReturn = buildUrlWithReturnUrl(basePath);
  const separator = urlWithReturn.includes('?') ? '&' : '?';
  return `${urlWithReturn}${separator}registered=true`;
}

// Use in Register.svelte
const loginUrl = buildLoginUrlAfterRegistration('/login');
navigate(loginUrl);
```

## Files to Modify
- `src/routes/card/Register.svelte` (lines 54-57)
- Optional: `src/util/returnUrlHandler.js` (if using alternative solution)

## Test Verification
```bash
# Test the specific registration flow
npx playwright test auth-flow.spec.js -g "should register a new auth-system user successfully"

# Expected test assertion (line 29-30):
# expect(urlParams.get("registered")).toBe("true");
```

## Additional Context
- The registration form has two user types: "client" and "auth"
- Return URL preservation is working correctly via `buildUrlWithReturnUrl()`
- The 2-second delay before redirect might be reduced to 1 second for better UX
- Success message is shown but user might miss it due to redirect

## Acceptance Criteria
- [ ] Registration redirects to `/login?registered=true` (with or without return_url)
- [ ] URL parameter check passes in test: `urlParams.get("registered") === "true"`
- [ ] Return URL is still preserved if present
- [ ] No JavaScript errors in console
- [ ] Playwright test passes

## Root Cause Analysis
1. Check `src/routes/card/Register.svelte` line ~54-57
2. Verify the `navigate()` function is working
3. Check if the redirect timeout (2000ms) is too short
4. Verify backend returns success response properly

## Implementation Steps

### 1. Debug Registration Response
```javascript
// In Register.svelte, add logging
const response = await authStore.register(credentials);
console.log('Registration response:', response);
```

### 2. Fix Navigation
```javascript
// Current code (line ~54-57)
setTimeout(() => {
  const loginUrl = buildUrlWithReturnUrl('/login');
  navigate(loginUrl);
}, 2000);

// Potential fix - add query parameter explicitly
setTimeout(() => {
  const loginUrl = buildUrlWithReturnUrl('/login');
  const urlWithRegistered = loginUrl + (loginUrl.includes('?') ? '&' : '?') + 'registered=true';
  navigate(urlWithRegistered);
}, 1000); // Reduce timeout
```

### 3. Alternative: Use window.location
```javascript
// If navigate() is not working
window.location.href = '/login?registered=true';
```

## Files to Modify
- `src/routes/card/Register.svelte`
- `src/util/returnUrlHandler.js` (verify buildUrlWithReturnUrl)

## Test Verification
```bash
# Test the specific registration flow
npx playwright test auth-flow.spec.js -g "should register"
```

## Affected Tests
- 8 tests depend on registration working correctly
- Primary: "should register a new auth-system user successfully"

## Acceptance Criteria
- [ ] Registration redirects to `/login?registered=true`
- [ ] Success message visible on login page
- [ ] Playwright test passes for registration
- [ ] No JavaScript errors in console 