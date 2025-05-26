### Task 3: Fix Post-Login Redirect to Client App (Ref: Issue #5) - CRITICAL

**User Flow Affected:** User login (both for existing users and after new registration).

**Sequence/Components:**
1.  User is on Auth-System's `/login` page (`http://localhost:3000/login`). The `return_url` for the client app is expected to be available to the frontend (either via URL param or internal state).
2.  User submits valid credentials.
3.  Auth-System Backend: Successfully authenticates user, logs include `returnUrl` in request.
4.  Auth-System Frontend (`Login.svelte` or similar): Receives successful login response from backend API.
5.  CURRENT: Frontend fails to redirect browser to the `return_url`. Browser remains on `/login` page. (Note: This was the original state, Playwright test now shows successful redirect).
6.  EXPECTED: Frontend successfully redirects browser to the client application's `return_url`.

**Relevant Files (Likely Frontend):**
-   `frontend/src/routes/card/Login.svelte` (or component handling login form submission and post-login logic).
-   `frontend/src/util/loginRedirect.js` (if still used, or similar utility for redirection).
-   JavaScript code responsible for handling API responses and triggering client-side redirects.

**Acceptance Criteria:**
-   After a successful login on `http://localhost:3000/login`, the browser is redirected to the `return_url` (e.g., `http://localhost:5173/`). (Verified with Playwright)
-   This works for users logging in directly and for users logging in immediately after completing registration. (Verified with Playwright for post-registration login)

--- 