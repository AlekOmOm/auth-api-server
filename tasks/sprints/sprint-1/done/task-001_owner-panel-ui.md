### Task 1: Fix Owner Panel Role Detection & UI Accessibility (Ref: Issue #3)

**User Flow Affected:** Owner attempts to access Owner Panel functionality after creating a client server, including direct navigation/login to `/owner`.

**Sequence/Components:**
1.  User (initially `role: 'user'`) logs in (session `poolContext: 'default'`).
2.  User successfully calls `/api/clientServer/user/register` to create a client app. (Role becomes `owner`, context `auth_internal`)
3.  User attempts to access an owner-protected API route (e.g., `/api/owner/stats`).
4.  User attempts to log in with `return_url=/owner` or navigate to `/owner` when already logged in as owner.

**Relevant Files (from Issue #3 & UI observation):**
-   `backend/src/middleware/schemaDetection.js` (role detection logic - VERIFIED IMPROVED)
-   `backend/src/services/auth.js` (login role handling - VERIFIED IMPROVED)
-   `frontend/src/routes/owner/OwnerPanel.svelte` (UI display logic - PARTIALLY ADDRESSED, still shows Loading...)

**Acceptance Criteria:**
-   [X] A user who registers and then creates a client server can immediately access owner-specific API endpoints (e.g., `/api/owner/stats`) without needing to log out and log back in. (Verified via API - This part of the backend logic for role elevation seems fine now due to schemaDetection and authService changes).
-   [X] Session `role` is updated to `'owner'` and `poolContext` to `'auth_internal'` after client server creation and subsequent authenticated requests. (Verified for backend logic via schemaDetection and authService changes).
-   [ ] Owner panel UI (`http://localhost:3000/owner`) becomes accessible and functional, displaying owner-specific data (e.g., client list, stats) when an owner user navigates or is redirected there. (PENDING - UI shows "Loading..." instead of error for non-owner, and not yet tested with a true owner due to test data setup).
-   [ ] Logging in as an owner with `return_url=/owner` successfully redirects to and renders the `/owner` panel, not a "Loading..." page. (PENDING - Redirects, but UI shows "Loading..." instead of error for non-owner or panel for true owner).

**Test Cases:**

**5.1 API Test Cases (Already Verified):**
*   **TC_API_OWNER_ROLE_001: Verify role elevation and API access**
    *   **Description:** Ensure user becomes owner and can access owner APIs after client server creation.
    *   **Steps:**
        1. Register new user.
        2. Login as new user (role 'user').
        3. Create client server for this user.
        4. Attempt to GET `/api/owner/stats`.
    *   **Expected Result:** HTTP 200 OK, response contains owner statistics. API call succeeds. (Verified)

**5.2 GUI Test Cases (using Playwright MCP Tool):**
*   **TC_GUI_OWNER_PANEL_LOAD_001: Verify Owner Panel UI loads after login with return_url=/owner**
    *   **Description:** Ensure an owner user logging in with `return_url=/owner` is redirected to the owner panel and the panel UI loads correctly.
    *   **Preconditions:**
        *   An existing user (e.g., `owner3@mail.com` from `../../tests/owner-login-credentials.md`) who has already created at least one client server and is thus an 'owner'. (NOTE: Current test user `owner3@mail.com` does NOT meet this precondition after direct registration - they have 0 client servers).
    *   **Test Steps:**
        1.  `mcp_playwright_browser_navigate` to `http://localhost:3000/login?return_url=/owner`.
        2.  `mcp_playwright_browser_type` email `owner3@mail.com` into the email field.
        3.  `mcp_playwright_browser_type` the correct password into the password field.
        4.  `mcp_playwright_browser_click` the "Login" button.
    *   **Expected Result (for a non-owner):** Redirect to /owner, page shows an access denied message.
    *   **Actual Result (for current non-owner `owner3@mail.com`):** Redirects to /owner, page shows "Loading..." indefinitely.
    *   **Expected Result (for a true owner):** Browser successfully navigates to `http://localhost:3000/owner`. Page snapshot shows the Owner Panel UI, not a "Loading..." message.

*   **TC_GUI_OWNER_PANEL_LOAD_002: Verify Owner Panel UI loads by direct navigation for logged-in owner**
    *   **Description:** Ensure an already logged-in owner can directly navigate to `/owner` and the panel UI loads.
    *   **Preconditions:**
        *   User `owner3@mail.com` is already logged in and is an 'owner' (with client_count > 0).
    *   **Test Steps:**
        1.  `mcp_playwright_browser_navigate` to `http://localhost:3000/owner`.
    *   **Expected Result:**
        *   Browser successfully displays `http://localhost:3000/owner`.
        *   Page snapshot shows the Owner Panel UI.

--- 