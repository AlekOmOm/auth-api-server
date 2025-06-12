# Backend Issue: Login API Failures and Schema Errors

**Affected E2E Test(s) (Examples):**
- Test Title: `Auth System - Owner Panel Access Tests › should successfully login auth-system owner and access Owner Panel`
  - Test File: `test/playwright-tests/auth-system/owner-panel-access.spec.js:37:4`
  - Error Snippet: `Error: Timed out 5000ms waiting for expect(locator).toHaveURL(expected) ... Expected string: "http://localhost:3000/home" Received string: "http://localhost:3000/login"`
- Test Title: `Auth System - Complete Registration & Authentication Tests › should login with newly created auth system owner`
  - Test File: `test/playwright-tests/auth-system/login-owner.spec.js:60:4`
  - Error Snippet: `Error: Timed out 5000ms waiting for expect(locator).toHaveURL(expected) ... Expected string: "http://localhost:3000/home" Received string: "http://localhost:3000/login"`
- Test Title: `Auth System - Complete Registration & Authentication Tests › should login existing owner`
  - Test File: `test/playwright-tests/auth-system/login-owner.spec.js:112:4`
  - Error Snippet: `expect(received).toBe(expected) // Object.is equality ... Expected: "http://localhost:3000/owner" Received: "http://localhost:3000/login"`

**Observed Behavior:**
Multiple E2E tests involving user login are failing. Users are typically redirected back to the `/login` page instead of the expected `/home` or `/owner` pages.
Console logs from Playwright tests involving direct API calls (e.g., `should test backend login API directly` in `login-owner.spec.js`) and unit test outputs (e.g. `authApi.integration.test.js`, `authStore.integration.test.js`) frequently show the backend API at `/api/auth/login` responding with a 400 status and the message: `"Schema could not be determined for the request."`. This prevents successful login and subsequent test steps.

**Expected Behavior:**
The `/api/auth/login` endpoint should:
1.  Correctly process valid login requests, including robust schema detection (e.g., based on `refererUrl` or other contextual headers/data).
2.  Return a 200 OK status with user session data upon successful authentication.
3.  Return a clear JSON error (e.g., 401 for invalid credentials, 400 for genuinely malformed requests with specific error details) if authentication fails for valid reasons, rather than a generic schema error for seemingly valid frontend requests.

**Frontend Context:**
- The frontend `authApi.js` service calls the `/api/auth/login` endpoint using `fetchPost`.
- The `requestBody` sent by `authApi.login` is structured as:
  ```json
  {
    "credentials": { "email": "user@example.com", "password": "somepassword" },
    "returnUrl": "http://localhost:3000/optional-return-path" 
  }
  ```
  (The `returnUrl` might be `null` if not applicable).
- The `fetch.js` utility correctly stringifies this body and sets `Content-Type: application/json`.

**Request to Backend Team:**
Please investigate the following for the `/api/auth/login` endpoint:
1.  The root cause of the "Schema could not be determined for the request" error.
2.  Ensure schema detection mechanisms are functioning correctly and are resilient.
3.  Verify that all login paths provide appropriate JSON responses (for both success and specific failure conditions like invalid credentials).
4.  Review related unit tests (e.g., in `backend/src/controllers/auth.test.js` or similar) to ensure they cover these schema detection and response scenarios. Many frontend unit tests for API integration are also failing due to these unexpected 400 errors from the login API. 