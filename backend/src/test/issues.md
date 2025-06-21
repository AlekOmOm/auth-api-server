# Backend API Issues and Status Report (Last updated based on GUI Testing Results: 2025-06-11 11:15:00)

This document details current issues affecting the backend API system, including recently resolved functional issues and newly discovered critical infrastructure problems through end-to-end and GUI testing.

## RESOLVED ISSUES (Fixed 2024-12-XX)

### ✅ 1. Client User Self-Registration into Tenant Schemas
*   **Status:** RESOLVED
*   **Resolution:** Modified `register` and `login` functions in `src/controllers/auth.js` to use dynamic `req.schema` from `detectSchema` middleware instead of hardcoding `"auth_internal"`.
*   **Impact:** Users can now self-register into tenant-specific schemas based on URL detection.

### ✅ 2. URL/Referer Detection: Automatic `req.headers.referer` Usage  
*   **Status:** RESOLVED
*   **Resolution:** Enhanced `detectSchema` middleware in `src/middleware/detection.js` to automatically use `req.headers.referer` as fallback when explicit `refererUrl` is not provided.
*   **Impact:** Automatic tenant context setting now works for direct browser navigations.

### ✅ 3. URL Matching Logic: Exact vs. Prefix for `authorized_urls`
*   **Status:** RESOLVED
*   **Resolution:** Implemented prefix matching fallback in `getByUrl` function in `src/services/clientServer.js`. System now attempts exact match first, then secure prefix matching.
*   **Impact:** More flexible URL matching for client applications.

### ✅ 4. Session Data Structure Documentation (`/api/auth/session`)
*   **Status:** RESOLVED
*   **Resolution:** Updated JSON examples in `docs/core-components/auth-session-endpoint.md` and `docs/core-components/client-app-authorization.md` to reflect correct nested structure.
*   **Impact:** Documentation now accurately represents API response format.

---

## CRITICAL CURRENT ISSUES (Findings from End-to-End and GUI Testing as of 2025-06-11)

### 🚨 0. Critical Validation Error: Role Validation Failure on Registration
*   **Issue:** `ValidationError: User data validation failed for the given context.` Specifically, `"Owner role must be 'owner' or 'admin'."`
*   **Location:** `/usr/src/app/src/utils/validationSchemas.js:164:13` (as per latest logs)
*   **Impact:** Prevents new user registration if the `role` field is not 'owner' or 'admin'. This is a high-priority issue blocking a core user flow.
*   **Log Evidence:** Confirmed in recent backend logs for `/api/auth/register` endpoint.
*   **Note:** This issue was previously suspected but is now confirmed with log evidence and takes precedence or is a key part of registration failures.

### 🚨 1. Critical Repository Layer Failure in Authentication Service
*   **Issue:** `AuthError: Failed to execute repository operation or resource not found`. The backend cannot execute basic database operations for any authentication function.
*   **Location:** `/usr/src/app/src/services/auth.js:417:13` and `/usr/src/app/src/services/auth.js:143:4`.
*   **Impact:** Complete failure of ALL authentication operations (login, registration, session validation, user lookup). The system is currently unusable.
*   **GUI Confirmed:**
    *   ✅ Both valid and invalid login attempts result in identical backend errors displayed in the UI.
    *   ✅ Registration attempts fail, often surfacing backend error messages directly to the user.
*   **Test Evidence:**
    *   Login attempts fail with auth service errors (e.g., `auth-system\\owner-panel-access.spec.js:234:34` - login API returning non-200 status).
    *   Multiple authentication attempts in `login-owner.spec.js` report errors related to the auth service.

### 🚨 2. Database Schema: User ID Auto-Generation Failure
*   **Issue:** User table ID field not auto-generating properly, causing null constraint violations during user creation.
*   **Error:** `null value in column "id" of relation "users" violates not-null constraint`
*   **Impact:** Complete registration system failure. All user creation operations are failing with Status 500. This is a significant contributing factor to overall system failure. This issue is now compounded by the Role Validation Failure (Issue #0) for registrations attempting to set other roles.
*   **File Flow (Registration):**
    1.  **Request:** `POST /api/auth/register` with user data
    2.  **Controller:** `register` function (`src/controllers/auth.js`) → calls `authService.register`
    3.  **Service:** `authService.register` (`src/services/auth.js`) → calls `userService.createUser`
    4.  **Service:** `userService.createUser` (`src/services/user.js:22:17`) → calls repository layer
    5.  **Repository:** `repo.query("create", userInstance)` (`src/repo/index.js:119:25`) → executes SQL
    6.  **Database:** PostgreSQL constraint violation due to null ID field
    7.  **Stack Trace (Registration):** `/usr/src/app/node_modules/pg-pool/index.js:45:11 → /usr/src/app/src/repo/index.js:119:25 → /usr/src/app/src/services/user.js:22:17`
*   **GUI Confirmed:** ✅ Registration form shows "Registration failed" message or directly displays database constraint violation errors.
*   **Test Evidence:**
    *   `login-owner.spec.js:169:4` - Direct call to backend registration API `/api/auth/register` failed with Status: 500. File: `test\\playwright-tests\\login-owner.spec.js:187:54`.
*   **Root Cause Analysis (for this specific issue):**
    *   Database schema likely missing `SERIAL PRIMARY KEY` or `GENERATED ALWAYS AS IDENTITY` for users table ID column.
    *   User model (`src/models/User.js`) may not be properly handling ID generation or expecting an ID.
    *   Repository queries (`src/repo/connection/queries/user.js`) might be incorrectly structured for auto-generated IDs.

### 🚨 3. Session Management System Failure (Consequence of Repository Failure)
*   **Issue:** `/api/auth/session` endpoint returns 401 Unauthorized for all requests.
*   **Impact:** Frontend cannot validate authentication state, leading to a complete session validation failure affecting all protected routes.
*   **GUI Confirmed:** ✅ Browser console shows "Failed to load resource: the server responded with a status of 401 (Unauthorized)" for session API calls.
*   **Details:** Session validation is failing because the underlying authentication service (Issue #1) cannot perform necessary database lookups or operations.
*   **Test Evidence:**
    *   `auth-system\\owner-panel-access.spec.js:247:43` - session endpoint not returning expected data structure (now confirmed as returning 401).

### 🚨 4. API Error Response Format Inconsistency
*   **Issue:** Backend returning HTML error pages instead of JSON error responses during critical failures.
*   **Impact:** Client applications expecting JSON cannot properly parse or handle error responses. Raw HTML stack traces and technical error details are displayed directly in the UI.
*   **GUI Confirmed:** ✅ Login and registration forms show complete HTML error pages, including `<pre>` tags with database stack traces, when backend errors occur. This provides an extremely poor user experience.
*   **Evidence:** Test reports (e.g., from registration failures like `login-owner.spec.js:187:54`) mention "HTML error page with database constraint violation".
*   **Proposed Actions (Covered in Action Plan):**
    *   Review global error handler configuration.
    *   Ensure all endpoints consistently use `standardizeResponse` utility for error cases.
    *   Add specific error handling middleware for database constraint violations to format them as JSON.

### 🚨 5. Concurrent Registration Handling Failure (Blocked by Core Issues)
*   **Issue:** System cannot handle multiple simultaneous registration attempts; all attempts fail.
*   **Impact:** High-load scenarios and concurrent user onboarding are completely non-functional.
*   **Root Cause:** This is a direct consequence of the critical repository layer failure (Issue #1) and the database ID auto-generation failure (Issue #2). Registrations cannot succeed individually, let alone concurrently.
*   **Test Evidence:** `login-owner.spec.js:264:59` - concurrent registration attempts all failing due to underlying database and service issues.

---

## IMMEDIATE ACTION PLAN (Updated Priorities as of 2025-06-11)

### Phase 1: Critical System Restoration (CRITICAL - 0-3 hours)
1.  **Validation Fix (NEW TOP PRIORITY):**
    *   **Action:** Investigate and resolve the `ValidationError: Owner role must be 'owner' or 'admin'` originating from `src/utils/validationSchemas.js:164:13`. Determine if this validation is too restrictive for general registration or if the registration flow is incorrectly attempting to set a role that requires admin/owner privileges.
    *   **Goal:** Allow users to register with appropriate default roles, or clarify the conditions under which 'owner' or 'admin' roles are assigned.
2.  **Repository Fix (HIGH PRIORITY):**
    *   **Action:** Resolve `AuthError: Failed to execute repository operation or resource not found` in `/usr/src/app/src/services/auth.js:417:13` and `/usr/src/app/src/services/auth.js:143:4`.
    *   **Goal:** Restore basic database operation capabilities for the authentication service. This is essential for any login, registration, or session function.
3.  **Database Schema Fix (HIGH PRIORITY):**
    *   **Action:** Examine users table schema in `auth_internal` and all client schemas. Verify and implement proper auto-increment configuration for the ID column (e.g., `SERIAL PRIMARY KEY` or `GENERATED ALWAYS AS IDENTITY`).
    *   **Action:** Review and ensure `src/repo/connection/queries/user.js` (CREATE queries) and `src/models/User.js` are compatible with auto-generated IDs.
    *   **Goal:** Enable successful user record creation without ID constraint violations.
4.  **Authentication Pipeline Review:**
    *   **Action:** Once repository and DB ID issues are stable, review and fix the authentication logic within `src/services/auth.js` (e.g., user lookup and verification logic around line `300:31` for login).
    *   **Goal:** Ensure the authentication pathway can function correctly post-dependency fixes.

### Phase 2: Error Handling & Stability (HIGH - 2-4 hours)
1.  **Standardize JSON Error Responses:**
    *   **Action:** Implement or ensure a global error handler consistently converts all error types (especially database constraint violations and service errors) into a standardized JSON format using the `standardizeResponse` utility.
    *   **Goal:** Provide predictable and parsable error responses for client applications.
2.  **User-Friendly Error Messages:**
    *   **Action:** Implement proper error handling in controllers and services to return user-friendly error messages instead of raw stack traces or technical error codes in the JSON response.
    *   **Goal:** Improve user experience by abstracting technical failure details.

### Phase 3: System Validation & Refinement (MEDIUM - 4-8 hours)
1.  **Comprehensive End-to-End Testing:**
    *   **Action:** Re-run all Playwright tests to verify the fixes and overall system stability.
2.  **Validate Core Flows:**
    *   **Action:** Specifically validate that user registration, login (for different roles/tenants), and session management (`/api/auth/session`) operate as expected.
3.  **Test Concurrent Operations:**
    *   **Action:** Re-test concurrent registration scenarios to ensure the system can handle them once the core blocking issues are resolved.

---

**Status Summary (Updated 2025-06-11):** The backend API system is currently in a **critical and unstable state**. A newly confirmed critical validation error (`ValidationError: Owner role must be 'owner' or 'admin'`) is preventing user registrations. This is compounded by a fundamental failure in the authentication service's repository layer (specifically at `auth.js:417:13`) which prevents ALL authentication operations, including login, registration, and session validation. Additionally, database schema problems related to user ID auto-generation block any successful user creation. API error responses are inconsistent, often returning HTML stack traces instead of JSON, severely impacting client-side error handling and user experience. Urgent fixes to the validation logic, repository layer, and database schema are paramount to restore any basic functionality to the authentication system.
