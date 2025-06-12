# Backend Issue: Direct API Test Failures (ECONNREFUSED & Test Setup)

**Affected Direct API E2E Test(s):**

1.  **Test:** `Auth System - Complete Registration & Authentication Tests › should test backend registration API directly`
    *   **File:** `test/playwright-tests/auth-system/login-owner.spec.js` (around line 200)
    *   **Error Snippet:** `Error: apiRequestContext.post: connect ECONNREFUSED ::1:3001`

2.  **Test:** `Auth System - Complete Registration & Authentication Tests › should test backend login API directly`
    *   **File:** `test/playwright-tests/auth-system/login-owner.spec.js` (around line 219)
    *   **Error Snippet:** `Error: apiRequestContext.post: connect ECONNREFUSED ::1:3001`

3.  **Test:** `Auth System - Owner Panel Access Tests › should test backend session endpoint directly`
    *   **File:** `test/playwright-tests/auth-system/owner-panel-access.spec.js` (around line 195)
    *   **Error Snippet:** `Error: expect(received).toBeTruthy() ... Received: false` (This assertion is on `loginResponse.ok()`, which is part of the test's setup to log in a user directly via API before checking the session endpoint).
    *   **Console Output for this test's internal login attempt:** `Login API Response Status: 400` with `{"message":"Schema could not be determined for the request.", ...}`.

**Observed Behavior:**

*   **ECONNREFUSED:** When Playwright's `apiRequestContext` is used to directly `POST` to `http://localhost:3001/api/auth/register` and `http://localhost:3001/api/auth/login`, the requests fail with `connect ECONNREFUSED ::1:3001`. This suggests the backend might not be listening on the IPv6 loopback address `::1` or there's a network configuration issue preventing `apiRequestContext` from reaching the backend service at `localhost:3001` when it resolves to `::1`.
*   **Test Setup Failure (Session Test):** The test designed to check the `/api/auth/session` endpoint first attempts to log in a user by directly calling the login API. This internal login attempt is failing with the "Schema could not be determined" error (Status 400), preventing the test from proceeding to actually check the `/api/auth/session` behavior post-login.

**Expected Behavior:**

1.  The backend server should be accessible via `localhost:3001` (and any addresses `localhost` resolves to, including `127.0.0.1` and `::1`) by tools like Playwright's `apiRequestContext`.
2.  Direct API calls to `/api/auth/login` and `/api/auth/register` made from `apiRequestContext` (with correctly structured JSON payloads) should be processed successfully or return appropriate API error codes (e.g., 200, 201, 400, 401, 409) rather than connection refused errors.
3.  The login attempts within the setup phase of direct API tests (like the session endpoint test) should also succeed if valid credentials and request structures are used, without encountering schema errors.

**Frontend Context:**
- These specific tests use Playwright's `request` fixture (an `APIRequestContext`) to make direct HTTP requests to the backend, bypassing the browser UI.
- The URLs are constructed as `http://localhost:3001/api/auth/...`.

**Request to Backend Team:**
Please investigate the following:
1.  Why direct API calls from Playwright's `apiRequestContext` to `localhost:3001` are resulting in `ECONNREFUSED ::1:3001`. Check if the backend service is correctly configured to listen on all expected loopback interfaces (IPv4 and IPv6).
2.  Re-examine the schema detection for login/registration endpoints to ensure they robustly handle requests, even those originating from server-side test contexts like `apiRequestContext` if there's any difference in how these requests are presented (e.g. missing browser-typical headers, though `Content-Type: application/json` is set).
3.  Ensure the `/api/auth/session` endpoint and its prerequisite login work correctly when invoked through direct API calls for testing purposes. 