---
id: {timestamp}-{uuid}
from: orchestrator-agent
to: documentation-developer-agent
priority: high
status: pending
sent-at: {iso_timestamp}
meta:
  source-request: "User query regarding frontend reports: backend_login_failures.md, backend_direct_api_test_failures.md, backend_registration_failures.md"
  original-from: "user"
---
## Documentation Request: Backend API Failures (Schema & Connection)

Please provide precise documentation references related to the following backend API issues reported by the frontend testing agent. The primary concerns involve schema determination errors for login and registration, and connection refused errors for direct API tests.

### 1. API Endpoint: `/api/auth/login`
   - **Issue**: Consistently returns `400 Bad Request` with `{"message":"Schema could not be determined for the request."}`.
   - **Documentation Needed**:
     - Detailed explanation of the schema detection mechanism for this endpoint.
     - Expected JSON request payload structure (including any conditional fields or headers like `refererUrl` that influence schema detection).
     - Expected JSON response formats for successful login (200 OK) and various error conditions (e.g., invalid credentials, schema errors, other 4xx/5xx errors).
     - Troubleshooting guide for "Schema could not be determined" errors.

### 2. API Endpoint: `/api/auth/register`
   - **Issue**: Consistently returns `400 Bad Request` with `{"message":"Schema could not be determined for the request."}`.
   - **Documentation Needed**:
     - Detailed explanation of the schema detection mechanism, particularly how `role` and other data influence it.
     - Expected JSON request payload structure.
     - Expected JSON response formats for successful registration (201 Created/200 OK) and various error conditions (e.g., validation errors, duplicate email, schema errors).
     - Troubleshooting guide for "Schema could not be determined" errors.

### 3. API Endpoint: `/api/auth/session`
   - **Issue**: Tests for this endpoint are failing during setup because a prerequisite direct API call to `/api/auth/login` fails with the "Schema could not be determined" error.
   - **Documentation Needed**:
     - Expected behavior and response format when a valid session exists.
     - Expected behavior and response format when no valid session exists or session is expired.
     - Dependencies on other services or successful prior API calls (like login).

### 4. Direct API Test Failures & Network Configuration
   - **Issue**: Direct API calls from Playwright's `apiRequestContext` to `http://localhost:3001/api/auth/register` and `http://localhost:3001/api/auth/login` result in `Error: connect ECONNREFUSED ::1:3001`.
   - **Documentation Needed**:
     - Backend server network configuration details, specifically regarding listening interfaces (IPv4 `127.0.0.1` vs. IPv6 `::1`).
     - How the backend handles requests from `localhost` when it resolves to `::1`.
     - Any known issues or configurations required when testing the API directly with tools like Playwright's `apiRequestContext` versus browser-initiated requests (e.g., differences in headers, source IP handling).
     - Troubleshooting guide for `ECONNREFUSED` errors when connecting to `localhost:3001`.

Please provide links to specific documentation pages, sections, or code comments that address these areas. 