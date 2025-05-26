### Task 4: Resolve `joe@trader.com` Credential Failure (Ref: Issue #6)

**User Flow Affected:** Testing and usage involving the specific test user `joe@trader.com`.

**Sequence/Components:**
1.  User attempts to log in as `joe@trader.com` via Auth-System's `/login` page.
2.  Known passwords (e.g., `bjr5xph.uwa0bva7HRV`, `QYH5uky9cfx9vum-whg`) are entered.
3.  Auth-System Backend: Returns 401 Unauthorized, logs "Password mismatch".
4.  Auth-System Frontend: Displays "API error: 401".

**Relevant Files/Areas:**
-   Test data sources / documentation for `joe@trader.com` (e.g. `tests/user-login-credentials.md`).
-   Auth-System backend user database (`client_trading_sim` schema, `users` table) to check password hash or account status for `joe@trader.com`.

**Acceptance Criteria:**
-   A correct, working password for `joe@trader.com` is identified and documented.
-   Login with `joe@trader.com` and the correct password is successful (backend authentication passes).
-   Test data documentation for this user (e.g. `tests/user-login-credentials.md`) is updated and verified.

**Test Cases:**

**5.2 GUI Test Cases (using Playwright MCP Tool):**
*   **TC_GUI_LOGIN_JOE_TRADER_001: Verify successful login for joe@trader.com**
    *   **Description:** Ensure `joe@trader.com` can log in with the corrected/verified password.
    *   **Preconditions:** The correct password for `joe@trader.com` has been identified/reset.
    *   **Test Steps:**
        0. `mcp_playwright_browser_navigate` to client app: `http://localhost:5173/home`, click `sign in` button
        1.   `http://localhost:3000/login?return_url=http%3A%2F%2Flocalhost%3A5173%2F` (or any valid return URL).
        2.  `mcp_playwright_browser_type` email `joe@trader.com` into the email field.
        3.  `mcp_playwright_browser_type` the verified correct password into the password field.
        4.  `mcp_playwright_browser_click` the "Login" button.
    *   **Expected Result:**
        *   Login is successful (no API error 401).
        *   Browser redirects to the specified `return_url`.

--- 