# Analysis: Auth Service Breakdown in Login Flow

This document details the "Complete Auth Service Breakdown" issue, focusing on its manifestation during the user login process. The primary symptom is an `AuthError: Failed to execute repository operation or resource not found` originating from `backend/src/services/auth.js`.

## 1. The Problem: AuthError During Login

During login attempts, the system throws an `AuthError` from `backend/src/services/auth.js` (specifically mentioning lines around 143 and 417 in `issues.backend.md`). This error indicates a failure in executing a repository operation or an inability to find a required resource, leading to a complete failure of the login mechanism and other authentication-dependent operations.

## 2. Key Files & Components in the Login Flow

*   **Entry Point:** `backend/src/routes/auth.js` defines the `/api/auth/login` route, which uses `validation.login` middleware and the `login` controller.
*   **Controller:** `backend/src/controllers/auth.js` (function: `login`) orchestrates the login process, calling `authService.login`.
*   **Core Service:** `backend/src/services/auth.js` (function: `login`). This is where the main logic resides and where the error is reported to originate. It involves:
    *   Calling `userService.get` to find and validate the user.
    *   Calling `sessionService.create` to establish a new session for the user.
    *   Internal helper functions like `execute`, `prep`, and `check` (line 143) might be involved in wrapping repository calls or handling their results.
*   **Dependent Services:**
    *   `backend/src/services/user.js` (function: `get`): Retrieves user data and verifies passwords against the database via the repository.
    *   `backend/src/services/session.js` (function: `create`): Creates a new session record in the database via the repository.
*   **Data Models:**
    *   `backend/src/models/User.js`
    *   `backend/src/models/Session.js`
*   **Repository Layer:**
    *   `backend/src/repo/index.js` (Class: `Repo`): The generic repository class that handles database interactions.
    *   `backend/src/repo/connection/queries/index.js`: Contains configurations for specific table operations, including `paramExtractor` functions.
    *   `backend/src/repo/connection/queries/user.js`: SQL for user lookup (e.g., `getByEmail`).
    *   `backend/src/repo/connection/queries/session.js`: SQL for session creation (`create`).
*   **Error Handling:** `backend/src/middleware/errorHandler.js` (Global error handler).

## 3. Login Flow and Potential Failure Points

The login process generally follows these steps (refer to the Login Process flow diagram for a visual):

1.  **Client Request:** POST to `/api/auth/login` with credentials.
2.  **Routing & Validation:** Request goes through `routes/auth.js` and `utils/validation.js`.
3.  **Controller:** `controllers/auth.js#login` calls `services/auth.js#login`.
4.  **User Verification (`services/auth.js#login` calling `services/user.js#get`):
    *   `userService.get` attempts to fetch the user from the database via `repo.query()`.
    *   **Failure Point 1:** The repository call within `userService.get` might fail (DB error, connection issue). This could lead to `userResult.success` being false.
    *   The `check(userResult?.success ...)` call in `services/auth.js` (around line 143 in `auth.js` in the `issues.backend.md` context) would then throw an `AuthError` if `userResult` is not successful.
5.  **Session Creation (`services/auth.js#login` calling `services/session.js#create`):
    *   If user verification is successful, `sessionService.create` is called to create a session record in the database via `repo.query()`.
    *   **Failure Point 2:** The repository call within `sessionService.create` might fail.
    *   Failures here could also trigger an `AuthError` within `services/auth.js`, possibly through generic error handling in its `execute` helper (around line 417 in `auth.js` in the `issues.backend.md` context) or similar logic if the session creation result is not successful.
6.  **Response:** If all steps succeed, a success response is sent; otherwise, an error (propagated to the global error handler) is returned.

**The `AuthError: Failed to execute repository operation or resource not found` message suggests that the issue is likely occurring when `services/auth.js` (or the services it calls like `userService` or `sessionService`) attempts to interact with the database through the `Repo` class, and this interaction fails.**

## 4. Debugging Focus Areas

Based on `issues.backend.md` and the flow:

*   **Repository Calls from Services:**
    *   Examine the exact parameters being passed from `userService.get` and `sessionService.create` to `repo.query()`.
    *   Verify the SQL queries being generated and executed for user lookup and session creation are correct for the current database schema.
*   **`services/auth.js` Logic:**
    *   **Line 143 (approx.):** The `check()` utility or similar logic validating the result of `userService.get`. How does it differentiate between "user not found" (a valid scenario for incorrect credentials) and an actual repository failure?
    *   **Line 417 (approx.):** If this is within a generic helper like `execute` or `prep`, how are errors from the repository layer (`repo.query()`) caught and processed? Is it possible that specific DB errors are being masked by the generic "Failed to execute repository operation or resource not found" message?
*   **Database Connection & Repository Health (`repo/index.js`):**
    *   Ensure the database pool (`this.pool` in `Repo`) is being initialized and connected correctly for the given schema.
    *   Log any errors caught directly within `repo.query()` to see the raw database error messages, codes, and details.
*   **Promise Handling:** Review promise chains in `services/auth.js`, `services/user.js`, `services/session.js`, and `repo/index.js` to ensure errors are being correctly propagated and not swallowed or mischaracterized.
*   **Error Differentiation:** Improve error differentiation. A "resource not found" during user lookup (e.g., email doesn't exist) is different from a database connection error or a malformed query. The system should distinguish these for clearer error reporting and handling.

By focusing on the interaction points between the service layer (`auth.js`, `user.js`, `session.js`) and the repository layer (`repo/index.js`), and by ensuring that database errors are being specifically caught and interpreted, the root cause of the "Complete Auth Service Breakdown" can be identified. 