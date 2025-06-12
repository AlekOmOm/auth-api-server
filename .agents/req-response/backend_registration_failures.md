# Backend Issue: Registration API Failures and Schema Errors

**Affected E2E Test(s) (Examples):**
- Test Title: `Auth System - Complete Registration & Authentication Tests › should register auth system owner successfully`
  - Test File: `test/playwright-tests/auth-system/login-owner.spec.js:30:4`
  - Error Snippet: `Error: Timed out 5000ms waiting for expect(locator).toBeVisible() ... Locator: locator('div.success-message')` OR `expect(locator).toContainText("Registration successful")` receives "Registration failed".
- Test Title: `Auth System - Complete Registration & Authentication Tests › should register client app user successfully`
  - Test File: `test/playwright-tests/auth-system/login-owner.spec.js:82:4`
  - Error Snippet: Similar to above, registration success is not observed.

**Affected Direct API Test(s):**
- Test Title: `Auth System - Complete Registration & Authentication Tests › should test backend registration API directly`
  - Test File: `test/playwright-tests/auth-system/login-owner.spec.js:200:4` (approx. line for `request.post`)
  - Console Output Snippet: `Registration API Response Status: 400` followed by `{"message":"Schema could not be determined for the request.", ...}`.

**Observed Behavior:**
Multiple E2E tests involving user registration are failing. The frontend does not receive a success confirmation from the backend; instead, it often displays a "Registration failed" message (which comes from the frontend correctly interpreting a non-success response from the backend).
Direct API tests to `/api/auth/register` also fail, returning a 400 status with the error `"Schema could not be determined for the request."`, similar to the login issues.
This prevents new users from being created, which impacts many subsequent tests that rely on pre-registered or newly registered users.

**Expected Behavior:**
The `/api/auth/register` endpoint should:
1.  Correctly process valid registration requests, including appropriate schema detection based on the provided data (e.g., `role` in the request body) and possibly `refererUrl` or other contextual headers if used by the backend for this endpoint.
2.  Return a 201 Created (or 200 OK) status with a success message and user data upon successful registration.
3.  Return clear JSON errors (e.g., 400 for invalid data like weak passwords or missing fields, 409 for duplicate email) rather than a generic schema error for seemingly valid frontend requests.

**Frontend Context:**
- The frontend `authApi.js` service calls the `/api/auth/register` endpoint using `fetchPost`.
- The `requestBody` sent by `authApi.register` is structured as (example for auth owner):
  ```json
  {
    "name": "PlaywrightOwner",
    "email": "playwrightowner_timestamp@example.com",
    "password": "TestPassword123!",
    "role": "owner" // This is derived from `userType` in the frontend
  }
  ```
- The `fetch.js` utility correctly stringifies this body and sets `Content-Type: application/json`.

**Request to Backend Team:**
Please investigate the following for the `/api/auth/register` endpoint:
1.  The root cause of the "Schema could not be determined for the request" error during registration.
2.  Ensure schema detection mechanisms and role assignment during registration are functioning correctly.
3.  Verify that all registration paths provide appropriate JSON responses (for success, specific validation failures, and other error conditions).
4.  Review related unit tests (e.g., in `backend/src/controllers/auth.test.js` or similar for registration) to ensure they cover these scenarios. Many frontend unit tests for API integration (e.g., in `authApi.integration.test.js` and `authStore.integration.test.js`) related to registration are also failing due to these unexpected 400 errors from the registration API. 