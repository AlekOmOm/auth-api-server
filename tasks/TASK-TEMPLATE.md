# Task Title: [Brief & Descriptive Title - e.g., Fix User Login Redirect Loop]

**Reference Issue(s):** Link to relevant issue(s) in `issues.md` (e.g., `[Issue #X](../issues.md#issue-x)`)

**Date Created:** YYYY-MM-DD
**Priority:** LOW | MEDIUM | HIGH | CRITICAL
**Status:** BACKLOG | WIP | DONE

## 1. Problem Description / User Story:

*Briefly describe the problem this task solves or the user story it implements. What is the current behavior vs. the expected behavior? Why is this important?*

**Example:**
*Currently, when a user successfully logs in with a `return_url` specified, they are not redirected back to the client application. Instead, they remain on the login page. This task aims to fix the frontend logic to ensure correct redirection.*

## 2. Affected User Flow(s) & Components:

*Identify the key user flows impacted by this task. List the primary components (frontend/backend files, modules, services, database tables) likely involved or requiring changes.*

**Example:**
*   **User Flow:** User Authentication via Client Application.
*   **Components:**
    *   Frontend: `frontend/src/routes/card/Login.svelte`, `frontend/src/util/loginRedirect.js`
    *   Backend: (If applicable, e.g., `backend/src/services/auth.js` for how `returnUrl` is passed)

## 3. Proposed Solution (Optional):

*Outline any specific technical approach or changes discussed or suggested in the related issue, if applicable. This can be brief or detailed as needed.*

**Example (from Issue #3):**
*   Update `detectUserRole()` in `backend/src/middleware/schemaDetection.js` to always check for role updates.
*   Add a role update trigger in `registerClientServerForUser()` in `backend/src/services/clientServerService.js`.

## 4. Acceptance Criteria:

*List clear, testable acceptance criteria. Refer to `[Guide to Formulating Acceptance Criteria](./meta/acceptance-criteria.md)` for best practices.*

**Example (Rule-Oriented):**
- [ ] After a successful login on `http://localhost:3000/login` initiated with a `return_url` (e.g., `http://localhost:5173/`), the browser is redirected to the specified `return_url`.
- [ ] The redirect occurs for users logging in directly.
- [ ] The redirect occurs for users logging in immediately after completing registration.
- [ ] The `return_url` is correctly preserved and utilized by the frontend redirection logic.

**Example (Scenario-Oriented - GWT):**
*   **Given** a user is on the login page (`http://localhost:3000/login`) with `return_url=http://client.app/dashboard` in the query string,
*   **And** the user enters valid credentials,
*   **When** the user clicks the "Login" button and authentication is successful,
*   **Then** the browser should redirect to `http://client.app/dashboard`.

## 5. Test Cases:

*Outline specific test cases to verify the acceptance criteria. Distinguish between API and GUI tests. Refer to `[Guide to Formulating Test Cases](./meta/test-cases.md)` and `[END-TO-END.testing.md](../../tests/END-TO-END.testing.md)` for context.*

### 5.1. API Test Cases (if applicable):
*Describe tests using PowerShell/Bash scripts for backend verification.*
*   **TC_API_XXX_001:**
    *   **Description:** ...
    *   **Steps:** ...
    *   **Expected Result:** ...

### 5.2. GUI Test Cases (using Playwright MCP Tool):
*Describe tests using Playwright MCP tool calls for frontend/E2E verification.*
*   **TC_GUI_LOGIN_REDIRECT_001: Successful redirect after login to client app**
    *   **Description:** Verify user is redirected to `return_url` after successful login.
    *   **Preconditions:** User `test@example.com` exists and is registered with a client app whose `return_url` is `http://localhost:5173/`.
    *   **Test Steps:**
        1.  `mcp_playwright_browser_navigate` to `http://localhost:3000/login?return_url=http%3A%2F%2Flocalhost%3A5173%2F`.
        2.  `mcp_playwright_browser_type` email `test@example.com` into email field (e.g., `ref=e10`).
        3.  `mcp_playwright_browser_type` password into password field (e.g., `ref=e11`).
        4.  `mcp_playwright_browser_click` the login button (e.g., `ref=e12`).
    *   **Expected Result:** Browser successfully navigates to `http://localhost:5173/`. Page snapshot shows client application content.

*   **TC_GUI_XXX_002:**
    *   **Description:** ...
    *   **Steps:** ...
    *   **Expected Result:** ...

## 6. Notes / Dependencies / Blockers:

*Add any other relevant information, such as dependencies on other tasks, potential blockers, or important considerations.*

--- 