# Task 004: Fix Test Role Validation Issue

## Priority: 🔴 CRITICAL (Blocks Task 001)

## Status: ⏳ TODO

## Issue Description
Frontend tests are failing because they're trying to register users with incompatible role/schema combinations.

### Current Behavior
- Tests select `userType: "auth"` which maps to role `"owner"`
- Backend validation only allows role `"user"` for client schemas
- Backend only allows roles `"owner"` or `"admin"` for `auth_internal` schema
- Registration fails with: `"Invalid role for client context. Must be 'user'."`
- Since registration fails, no redirect happens (blocking Task 001)

### Expected Behavior
- Tests should use compatible role/schema combinations
- Registration should succeed
- Proper redirects should follow

## Backend Validation Rules (from `validationSchemas.js`)

```javascript
// For auth_internal schema:
if (!["owner", "admin"].includes(role)) {
  throw ValidationError("Invalid role for auth_internal context. Must be 'owner' or 'admin'.");
}

// For client schemas:
if (role !== "user") {
  throw ValidationError("Invalid role for client context. Must be 'user'.");
}
```

## Root Cause
The auth flow tests are running in a client context (default test environment) but trying to register "auth" users (owner role), which is only allowed in the `auth_internal` schema context.

## Implementation Options

### Option 1: Update Tests to Use Client Context
Change tests to register `userType: "client"` (maps to role `"user"`):

```javascript
// In test files, change:
const userData = {
  name: "Test User",
  email: uniqueEmail,
  password: "SecurePass123!",
  userType: "client", // Changed from "auth"
};
```

### Option 2: Set Auth Internal Context for Auth Tests
Configure tests to run in `auth_internal` context when testing auth system features:

```javascript
// Add to test setup or beforeEach:
await page.setExtraHTTPHeaders({
  'X-Schema-Context': 'auth_internal'
});

// Or modify the test server to default to auth_internal for these tests
```

### Option 3: Update Frontend to Send Correct Role
Modify `Register.svelte` to send the correct role based on context:

```javascript
// In Register.svelte, update the registration logic:
const credentials = {
  name: name.trim(),
  email: email.trim(),
  password: password.trim(),
  role: userType === 'auth' ? 'owner' : 'user', // Send role instead of userType
};
```

## Recommended Solution

**Option 1** is the simplest and most correct:
- Auth system owner registration should happen in `auth_internal` context
- Client user registration should happen in client context
- Tests should reflect real-world usage

## Files to Modify

### For Option 1:
- `test/playwright-tests/auth-system/auth-flow.spec.js`
- `test/playwright-tests/helpers/test-data.js` (if it sets default userType)
- Any other test files using `userType: "auth"`

### Example Fix:
```javascript
// auth-flow.spec.js line 20
const userData = {
  name: "Auth System User",
  email: uniqueEmail,
  password: "SecurePass123!",
  userType: "client", // Fix: Use "client" for tests in client context
};
```

## Test Verification
```bash
# Run the specific failing test
npx playwright test auth-flow.spec.js -g "should register a new auth-system user successfully"

# If it passes, run all auth tests
npx playwright test auth-flow.spec.js
```

## Additional Context
- Frontend sends `userType` (not `role`) to backend
- Backend maps `userType` to schema context:
  - `"auth"` → `auth_internal` schema
  - `"client"` → uses detected client schema
- OpenAPI spec confirms role restrictions per schema
- This issue is blocking multiple downstream tests

## Acceptance Criteria
- [ ] Registration succeeds without role validation errors
- [ ] Correct role is assigned based on context
- [ ] Task 001 (registration redirect) can proceed
- [ ] No backend validation errors for role
- [ ] Tests pass with appropriate userType values 