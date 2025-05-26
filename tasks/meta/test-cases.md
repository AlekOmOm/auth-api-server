# Guide to Formulating Test Cases

Test cases are specific steps performed to verify that a particular feature or functionality of the application behaves as expected. They are derived from user stories and acceptance criteria.

## Characteristics of Good Test Cases:

*   **Accurate:** Test the intended requirement precisely.
*   **Economical:** No unnecessary steps or activities.
*   **Repeatable:** Can be performed multiple times with the same expected results.
*   **Traceable:** Linked to specific requirements or acceptance criteria.
*   **Self-contained:** Has all necessary preconditions and steps defined.
*   **Clear Expected Results:** Defines what the outcome should be for a pass.

## Test Case Structure (Example):

*   **Test Case ID:** Unique identifier (e.g., TC_LOGIN_001)
*   **Feature/User Story:** Link to the story or task being tested.
*   **Description:** Brief overview of what the test case verifies.
*   **Preconditions:** Conditions that must be true before executing the test (e.g., user exists, service is running).
*   **Test Steps:** Numbered sequence of actions to perform.
*   **Test Data:** Specific input values to be used (e.g., username, password).
*   **Expected Result:** The observable outcome if the test passes.
*   **Actual Result:** (Filled in during test execution)
*   **Status:** (Pass/Fail - filled in during test execution)
*   **Notes:** Any additional relevant information.

## Project-Specific Testing Approaches for Auth-System:

Refer to [END-TO-END.testing.md](../../tests/END-TO-END.testing.md) for general E2E testing context.

### 1. API Testing:
   *   **Tooling:** PowerShell (`.ps1`) or Bash (`.sh`) scripts using tools like `Invoke-WebRequest` (PowerShell) or `curl` (Bash).
   *   **Focus:** Verifying endpoint functionality, request/response contracts, authentication/authorization, error handling, and data validation at the API layer.
   *   **Script Location:** Store scripts in `tests/api-tests/`.
   *   **Test Case Example (for an API test script step):
      *   **Action:** Execute `Invoke-WebRequest -Uri "http://localhost:3003/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session`
      *   **Test Data:** `$loginBody = '{"credentials": {"email": "test@example.com", "password": "P@ssword1!"}}'`
      *   **Expected Result:** HTTP 200 OK, response body contains a success message and user session details including a specific role.

### 2. GUI Testing (Frontend Behavior):
   *   **Tooling:** Playwright MCP (Multi-turn Conversation Protocol) tool.
        *   Key tool calls include: `mcp_playwright_browser_navigate`, `mcp_playwright_browser_click`, `mcp_playwright_browser_type`, `mcp_playwright_browser_snapshot`.
   *   **Focus:** Verifying user interface behavior, navigation flows, form submissions, display of data, client-side validation, and redirects from the user's perspective in a browser.
   *   **Test Case Example (for a Playwright test flow):
      *   **Test Case:** Verify successful login and redirect to Owner Panel.
      *   **Preconditions:** An existing user `owner@example.com` with owner privileges.
      *   **Test Steps:**
          1.  `mcp_playwright_browser_navigate` to `http://localhost:3000/login?return_url=/owner`.
          2.  `mcp_playwright_browser_type` email `owner@example.com` into the email field.
          3.  `mcp_playwright_browser_type` password into the password field.
          4.  `mcp_playwright_browser_click` the "Login" button.
      *   **Expected Result:** Browser navigates to `http://localhost:3000/owner`, and the Owner Panel content (e.g., a heading "Owner Dashboard") is visible in the browser snapshot.

### 3. Negative Test Cases:
   Ensure to include test cases for invalid inputs, error conditions, and unauthorized access attempts for both API and GUI tests.
   *   **Example (API):** Attempt to access an owner-only API endpoint with a non-owner user session.
   *   **Example (GUI):** Enter an invalid email format on the registration page and verify an error message is displayed.

By defining comprehensive test cases covering both positive and negative scenarios, and utilizing the appropriate testing approach (API or GUI), we can ensure the quality and robustness of the Auth-System. 