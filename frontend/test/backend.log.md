## Backend Errors from Playwright Test Run - $(date +"%Y-%m-%d %H:%M:%S")

The following backend-related errors were observed during the Playwright test run:

1.  **Missing Table (Persistent for Registration)**: `error: relation "auth_internal.users" does not exist`
    *   **Context**: This error occurs when the backend attempts to perform database operations during user registration.
    *   **Impact**: Causes the `/api/auth/register` endpoint to return a 500 Internal Server Error.
    *   **Affected Test**: `should test backend registration API directly`.
    *   **Stack Trace Snippet (from backend registration API response):**
        ```
        <pre>error: relation "auth_internal.users" does not exist<br> &nbsp; &nbsp;at /usr/src/app/node_mo
        dules/pg-pool/index.js:45:11<br> &nbsp; &nbsp;at process.processTicksAndRejections (node:internal/process/ta
        sk_queues:95:5)<br> &nbsp; &nbsp;at async Repo.query (file:///usr/src/app/src/repo/index.js:119:25)<br> &nbs
        p; &nbsp;at async pipeline (file:///usr/src/app/src/services/user.js:22:17)<br> &nbsp; &nbsp;at async getUse
        rByNameAndEmail (file:///usr/src/app/src/services/user.js:165:11)<br> &nbsp; &nbsp;at async Object.get (file
        :///usr/src/app/src/services/user.js:95:20)<br> &nbsp; &nbsp;at async Module.register (file:///usr/src/app/s
        rc/services/auth.js:283:29)<br> &nbsp; &nbsp;at async register (file:///usr/src/app/src/controllers/auth.js:
        56:29)</pre>
        ```

2.  **Resource Not Found / Authentication Failure (Persistent for Owner Login)**: `AuthError: Failed to execute repository operation or resource not found.`
    *   **Context**: This error occurs when the backend attempts to log in the user `guitestowner@example.com`.
    *   **Impact**: Causes the `/api/auth/login` endpoint to return a 401 Unauthorized Error for this specific user.
    *   **Affected Test**: `should test backend login API directly` (when attempting to log in `guitestowner@example.com`).
    *   **Stack Trace Snippet (from backend login API response for guitestowner@example.com):**
        ```
        <pre>AuthError: Failed to execute repository operation or resource not found.<br> &nbsp; &nbsp;at check (fil
        e:///usr/src/app/src/services/auth.js:417:13)<br> &nbsp; &nbsp;at Module.login (file:///usr/src/app/src/serv
        ices/auth.js:143:4)<br> &nbsp; &nbsp;at process.processTicksAndRejections (node:internal/process/task_queues
        :95:5)<br> &nbsp; &nbsp;at async login (file:///usr/src/app/src/controllers/auth.js:105:57)</pre>
        ```

**Overall Impact on UI Tests**:
Due to these backend errors, all UI tests involving user registration or logging in (especially as an owner) are failing. The application cannot proceed past login/registration steps, thus preventing owner panel access and other authenticated actions from being tested.

**Recommendation Summary**:
The backend developer needs to:
1.  Ensure the `auth_internal.users` table is correctly created, accessible, and initialized in the test environment database before tests run. This is crucial for registration.
2.  Verify that the `guitestowner@example.com` user is correctly provisioned in the test database and can be authenticated by the backend. This is crucial for owner-specific tests.

---
*Previous Log Entries Appended Below This Line If Any*

## Backend Errors from Playwright Test Run - $(date +"%Y-%m-%d %H:%M:%S")

The following backend-related errors were observed during the Playwright test run:

1.  **Missing Table**: `error: relation "auth_internal.users" does not exist`
    *   **Context**: This error occurs when the backend attempts to perform database operations (e.g., during user registration or login attempts).
    *   **Impact**: Causes API endpoints like `/api/auth/register` and `/api/auth/login` to return a 500 Internal Server Error.
    *   **Affected Tests**:
        *   `should test backend registration API directly`
        *   `should test backend login API directly`
        *   Indirectly affects all UI tests that depend on user registration or login, preventing them from succeeding.

**Stack Trace Snippet (from backend API response):**
```
<pre>error: relation "auth_internal.users" does not exist<br> &nbsp; &nbsp;at /usr/src/app/node_mo
dules/pg-pool/index.js:45:11<br> &nbsp; &nbsp;at process.processTicksAndRejections (node:internal/process/ta
sk_queues:95:5)<br> &nbsp; &nbsp;at async Repo.query (file:///usr/src/app/src/repo/index.js:119:25)<br> &nbs
p; &nbsp;at async pipeline (file:///usr/src/app/src/services/user.js:22:17)<br> &nbsp; &nbsp;at async getUse
rByNameAndEmail (file:///usr/src/app/src/services/user.js:165:11)<br> &nbsp; &nbsp;at async Object.get (file
:///usr/src/app/src/services/user.js:95:20)<br> &nbsp; &nbsp;at async Module.register (file:///usr/src/app/s
rc/services/auth.js:283:29)<br> &nbsp; &nbsp;at async register (file:///usr/src/app/src/controllers/auth.js:
56:29)</pre>
```

**Recommendation**:
The backend developer needs to ensure that the `auth_internal.users` table and any other necessary database schema are correctly initialized and accessible in the test environment before the tests are run.
