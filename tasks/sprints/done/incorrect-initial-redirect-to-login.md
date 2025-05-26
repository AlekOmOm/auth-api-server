# Task 2: Fix Incorrect Initial Redirect to Login (Ref: Issue #4)
## toc
- [Task](#task)
- [Issue](#issue)
  - [Acceptance Criteria](#acceptance-criteria)
  - [Related Files](#related-files)
  - [Sequence Diagram](#sequence-diagram)


## Task:


**User Flow Affected:** New user registration initiated from a client application.

**Sequence/Components:**
1.  Client App (e.g., Trading-Sim) directs user to Auth-System: `GET /register?return_url=<client_app_url>`.
2.  CURRENT: Auth-System frontend incorrectly redirects to `/login`. The `return_url` is lost or not visible to the `/login` page initially.
3.  EXPECTED: Auth-System frontend serves the `/register` page, and the `return_url` is preserved and available to the registration page/logic.

**Relevant Files (Likely Frontend):**
-   Auth-System Svelte routes/components responsible for handling the `/register` path and initial routing logic (e.g., `frontend/src/routes/card/Register.svelte`, `frontend/src/App.svelte` or main router).

**Acceptance Criteria:**
-   When a client app redirects to `auth-system/register?return_url=...`, the user lands directly on the Auth-System's registration page.
-   The `return_url` query parameter is present in the browser URL and accessible to the registration page.

---

## Issue #4: Incorrect Initial Redirect to Login from Client App's Register Action

**Date**: May 27, 2025
**Priority**: HIGH
**Status**: ❌ **NEW - REQUIRES INVESTIGATION**

### Problem Description
When a client application (e.g., Trading-Sim) attempts to redirect a user to the Auth-System's registration page (`/register?return_url=...`), the user is instead landing on the Auth-System's login page (`/login`). Furthermore, the `return_url` query parameter appears to be lost in this process, as observed by the Playwright tool not showing it in the browser's address bar upon landing on `/login`.

**Observed Behavior (Playwright Test)**:
1. Client App (Trading-Sim `http://localhost:5173/`) "Get Started" button clicked (intended for registration).
2. Browser redirects to Auth-System's `/login` page (`http://localhost:3000/login`).
3. The `return_url` (e.g., `?return_url=http%3A%2F%2Flocalhost%3A5173%2F`) is missing from the URL.

**Expected Behavior**:
1. Client App (Trading-Sim) "Get Started" button clicked.
2. Browser redirects to Auth-System's `/register` page (`http://localhost:3000/register?return_url=http%3A%2F%2Flocalhost%3A5173%2F`).
3. The `return_url` is preserved.

### Suspected Cause
- Internal routing logic within Auth-System frontend might be incorrectly redirecting `/register` requests to `/login` under certain conditions, possibly before the `return_url` is processed or stored.
- The client application's redirection mechanism might be flawed, though feedback suggests Trading-Sim constructs the URL correctly.

### Impact
- Prevents new users from directly accessing the registration page as intended by client applications.
- Breaks the seamless registration flow (UC2 from PRD).
- If `return_url` is indeed lost, users cannot be redirected back to the client application even if they manually navigate from `/login` to `/register` and complete registration.

### Next Steps
- Investigate Auth-System frontend routing for the `/register` path.
- Verify how the `return_url` is handled upon initial entry to the Auth-System.
- Confirm if the client app (Trading-Sim) is correctly forming and sending the `/register` URL with the `return_url`.

---