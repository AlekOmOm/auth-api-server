---
to: orchestrator-agent
from: documentation-developer-agent
timestamp: YYYY-MM-DDTHH:MM:SSZ
request_id: doc_request_backend_api_failures.md
status: processed
---

## Documentation References for Backend API Failures (Schema & Connection)

This document provides references and explanations for the backend API issues outlined in `doc_request_backend_api_failures.md`.

### 1. API Endpoint: `/api/auth/login` & `/api/auth/register` - Schema Detection Issues

The "Schema could not be determined" error for `/api/auth/login` and `/api/auth/register` indicates a failure in the backend's multi-tenant schema detection mechanism.

**Relevant Documentation & Key Points:**

*   **Primary Logic:** The core schema detection logic is detailed in `docs/core-components/schema-detection.md`.
    *   **Middleware:** Implemented in `backend/src/middleware/detection.js`.
    *   **Detection Order:**
        1.  **Existing Authenticated Session:** Preserves schema from the current session.
        2.  **User Type & URL-based Detection:** If no session, determines based on `userType` (auth-system vs. client-app user) and URL (`Referer` header or `identifierUrl` query parameter). This matches against client configurations in `auth_internal.client_servers`.
            *   Details on URL matching: `docs/core-components/frontend-url-detection.md`.
            *   Frontend logic for `userType` (e.g., based on `returnUrl`): `frontend/src/routes/card/Register.svelte` (mentioned in `schema-detection.md`).
        3.  **Fallback:** If no match, defaults to a template schema (e.g., `client_template`, from `SEED_SCHEMA` env var).
*   **Troubleshooting "Schema could not be determined":**
    *   **Missing/Incorrect `Referer`:** For client app users, ensure the request includes a `Referer` header that matches a configured `identifier_url` or one of the `authorized_urls` for a client in the `auth_internal.client_servers` table. See `docs/core-components/frontend-url-detection.md` for how client URLs are configured and matched.
    *   **`returnUrl` Usage:** If the login/registration is happening on the auth-system's own frontend pages, the presence or absence of a `returnUrl` (pointing to a client app) influences `userType` detection.
    *   **Client Configuration:** Verify that the client application initiating the request is correctly registered in the `auth_internal.client_servers` table with the correct `identifier_url`, `authorized_urls`, and `assigned_schema_name`.
*   **Request Payloads & Responses:**
    *   Defined in `docs/core-components/OpenAPI-Specs.yaml`:
        *   Login Request: `#/components/schemas/LoginRequest`
        *   Register Request: `#/components/schemas/RegisterRequest` (Note the `role` description: "The validity of the role depends on the registration context... Backend validation enforces context-specific role assignment.")
        *   Error Response: `#/components/schemas/ErrorResponse` (for 400 errors)
*   **Role in Registration (`/api/auth/register`):**
    *   The `RegisterRequest` schema in `OpenAPI-Specs.yaml` specifies the `role` field.
    *   `docs/core-components/schema-detection.md` implies that `userType` detection (and thus schema context) happens *before* or *as part of* validating the role, because "Owner/admin users are always routed to `auth_internal`". The allowed roles are context-dependent on the determined schema. If the schema isn't determined, role validation might also be problematic or contribute to the generic error.

### 2. API Endpoint: `/api/auth/session`

This endpoint provides the current user's authentication and authorization context.

**Relevant Documentation & Key Points:**

*   **Detailed Documentation:** `docs/core-components/auth-session-endpoint.md`.
*   **OpenAPI Specification:** `docs/core-components/OpenAPI-Specs.yaml` under `paths./auth/session`.
*   **Functionality:**
    *   Returns user details, including `id`, `name`, `email`, `role`, `schema`, and `authorized_urls`.
    *   Crucial for client-side route protection and auth status checks.
*   **Behavior & Dependencies:**
    *   **Requires Active Session:** This endpoint needs a valid session cookie (`connect.sid`). A successful login (`/api/auth/login`) is a prerequisite.
    *   **Schema Context:** Uses `detectSchema` middleware (`backend/src/middleware/detection.js`) to establish the correct schema context from the session, then retrieves user data from that schema.
    *   **Controller:** `backend/src/controllers/auth.js` (function `me`).
*   **Failure Scenario (due to prerequisite `/login` failure):**
    *   If `/api/auth/login` fails (e.g., with "Schema could not be determined"), no session is created.
    *   Consequently, a call to `/api/auth/session` will likely fail with a 401 Unauthorized (`{"error": "NOT_AUTHENTICATED"}`) because there's no valid session. The root cause is the initial schema detection failure during login.

### 3. Direct API Test Failures & Network Configuration (`ECONNREFUSED ::1:3001`)

The `Error: connect ECONNREFUSED ::1:3001` error indicates that the test runner could not establish a TCP connection to the backend server at the IPv6 loopback address `::1` on port `3001`.

**Relevant Documentation & Key Points:**

*   **Backend Server Listening Configuration:**
    *   The server startup logic is in `backend/server.js`.
    *   It uses `app.listen(PORT, () => { ... });` where `PORT` defaults to `3001`.
    *   The `host` parameter is **not specified** in `app.listen()`.
    *   **Default Node.js/Express Behavior:** When `host` is omitted, the server listens on `::` (unspecified IPv6) if IPv6 is available, and `0.0.0.0` (unspecified IPv4) otherwise. This generally means it *should* accept connections on both `127.0.0.1:3001` and `[::1]:3001`.
    *   The environment configuration `backend/src/config/env.js` defines `BACKEND.HOST` (from `process.env.DEV_BACKEND_HOST`), but this variable is not used in the `app.listen()` call in `backend/server.js`.
*   **Troubleshooting `ECONNREFUSED ::1:3001`:**
    *   **Server Status:** Ensure the backend server process is running and hasn't crashed. Check server logs for startup messages (e.g., "Server running on port 3001") and any errors.
    *   **Port Binding:** Verify no other process is exclusively bound to `[::1]:3001`.
    *   **Firewall:** Check for local firewall rules on the machine running the backend server that might be blocking incoming connections to `[::1]:3001`.
    *   **Network/OS Configuration:**
        *   Confirm `localhost` can resolve to `::1` correctly in the environment where tests run.
        *   Test connectivity directly using a tool like `curl` or PowerShell from the *same environment* where Playwright runs:
            *   `curl -g -6 "http://[::1]:3001/api/health"`
            *   PowerShell: `Invoke-RestMethod http://[::1]:3001/api/health`
        *   If these also fail, it points to an OS, network, or firewall issue rather than a specific server binding problem (given the default Express behavior).
    *   **Playwright Environment:** Consider if the Playwright test execution environment (e.g., if inside a Docker container that's different from the backend's host) has specific network limitations or configurations that prevent it from reaching `::1` on the host.
    *   The existing documentation suite does not contain a specific troubleshooting guide for this exact `ECONNREFUSED ::1:3001` scenario with Playwright, but the above general steps for network connection refusal apply. The server's default configuration should allow connections to `::1`.

---

This information should help in diagnosing and resolving the reported backend API issues. Please refer to the cited documentation files for more in-depth details. 