# Frontend Task Summary - Critical Issues

## Overview
The frontend has 4 critical tasks blocking test suite execution. The root cause analysis reveals that **Task 004 (role validation)** must be fixed first as it's blocking Task 001.

## Task Priority Order

### 1. 🔴 Task 004: Fix Test Role Validation Issue
**Status**: TODO | **Blocks**: Task 001
- **Issue**: Tests trying to register "auth" users in client context
- **Fix**: Change `userType: "auth"` to `userType: "client"` in tests
- **File**: `test/playwright-tests/auth-system/auth-flow.spec.js`

### 2. 🔴 Task 002: Fix Login Redirect
**Status**: TODO | **Blocks**: 13 tests
- **Issue**: Login succeeds but doesn't redirect to `/home`
- **Fix**: Check authStore response format and navigation timing
- **Files**: `src/routes/card/Login.svelte`, `src/util/loginRedirect.js`

### 3. 🔴 Task 003: Fix Protected Routes
**Status**: TODO | **Blocks**: 6 tests
- **Issue**: Protected routes not redirecting to login when unauthenticated
- **Fix**: Simplify ProtectedRoute logic, remove deferred navigation
- **File**: `src/components/ProtectedRoute.svelte`

### 4. 🔴 Task 001: Fix Registration Redirect
**Status**: TODO | **Blocks**: 8 tests
- **Issue**: Registration doesn't redirect with `?registered=true`
- **Fix**: Add query parameter to redirect URL
- **File**: `src/routes/card/Register.svelte`

## Critical Backend Context

### Role Validation Rules
```yaml
# From backend validationSchemas.js
auth_internal schema: Only allows roles 'owner' or 'admin'
client schemas:       Only allows role 'user'
```

### OpenAPI Specification
The backend enforces strict role validation per schema context:
- `X-Schema-Context` header determines which schema is active
- Registration `role` field must match the schema context
- Frontend sends `userType` which backend maps to role

## Quick Fixes

### Fix Task 004 (Immediate):
```javascript
// In auth-flow.spec.js line 20, change:
userType: "auth"  // ❌ Wrong for client context
// To:
userType: "client"  // ✅ Correct for client context
```

### Fix Task 001 (After Task 004):
```javascript
// In Register.svelte lines 54-57, change:
const loginUrl = buildUrlWithReturnUrl('/login');
navigate(loginUrl);
// To:
const loginUrl = buildUrlWithReturnUrl('/login');
const separator = loginUrl.includes('?') ? '&' : '?';
navigate(`${loginUrl}${separator}registered=true`);
```

### Fix Task 002 (High Priority):
Debug the authStore response first:
```javascript
// Add to Login.svelte after line 49:
console.log('Login response:', response);
console.log('Success?', response.success);
```

### Fix Task 003 (Simplify):
Remove the setTimeout in ProtectedRoute:
```javascript
// Change setTimeout(() => navigate('/login'), 0);
// To: navigate('/login', { replace: true });
```

## Testing Commands
```bash
# Test individual fixes
npx playwright test auth-flow.spec.js -g "should register" --debug
npx playwright test auth-flow.spec.js -g "should login" --debug
npx playwright test auth-flow.spec.js -g "prevent access" --debug

# Run all auth tests after fixes
npx playwright test auth-flow.spec.js
```

## Important Notes
1. The backend is working correctly - it's enforcing proper role/schema validation
2. Tests need to match real-world usage patterns
3. Debug with console logs before making major changes
4. Task 004 must be fixed before Task 001 will work 