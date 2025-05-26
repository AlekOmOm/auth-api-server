### Task 2: Fix Incorrect Initial Redirect to Login (Ref: Issue #4)

**User Flow Affected:** New user registration initiated from a client application.

**Sequence/Components:**
1.  Client App (e.g., Trading-Sim) directs user to Auth-System: `GET /register?return_url=<client_app_url>`.
2.  CURRENT: Auth-System frontend incorrectly redirects to `/login`. The `return_url` is lost or not visible to the `/login` page initially. (This was the reported issue, now resolved).
3.  EXPECTED: Auth-System frontend serves the `/register` page, and the `return_url` is preserved and available to the registration page/logic.

**Relevant Files (Likely Frontend):**
-   Auth-System Svelte routes/components responsible for handling the `/register` path and initial routing logic (e.g., `frontend/src/routes/card/Register.svelte`, `frontend/src/App.svelte` or main router).

**Acceptance Criteria:**
-   [X] When a client app redirects to `auth-system/register?return_url=...`, the user lands directly on the Auth-System's registration page.
-   [X] The `return_url` query parameter is present in the browser URL and accessible to the registration page.

**Test Cases:**

**5.2 GUI Test Cases (using Playwright MCP Tool):**
*   **TC_GUI_REGISTER_REDIRECT_001: Verify direct navigation to register page with return_url**
    *   **Description:** Ensure navigating from a client app to the auth-system's register page with a return_url lands on the register page and preserves the URL.
    *   **Preconditions:** Client app (e.g., Trading-Sim) is running.
    *   **Test Steps:**
        1.  Simulate client app redirect: `mcp_playwright_browser_navigate` to `http://localhost:3000/register?return_url=http%3A%2F%2Flocalhost%3A5173%2F`.
    *   **Expected Result:**
        *   Browser URL is `http://localhost:3000/register?return_url=http%3A%2F%2Flocalhost%3A5173%2F`.
        *   Page snapshot shows the registration form (fields for name, email, password).
    *   **Actual Result: PASS**

--- 
**Task Status: DONE** 