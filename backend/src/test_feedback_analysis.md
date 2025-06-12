# Backend Unit Test Failure Analysis & Action Plan

Date: 2024-07-17

This document analyzes the recent Vitest output and provides a structured plan to address the failures. The goal is to stabilize the test environment and then use the tests to pinpoint application logic errors.

## I. Critical Test Environment / Mocking Failures (Blockers)

These errors prevent many unit tests from running correctly and providing meaningful feedback on the application code. They must be addressed first.

### 1. `TypeError: any() expects to be passed a constructor function...`
   *   **File(s):** `src/services/__tests__/clientServer.service.test.js` (and potentially others involving class mocks).
   *   **Error Snippet:** `TypeError: any() expects to be passed a constructor function. Please pass one or use anything() to match any object.` when using `expect.any(ClientServer)`.
   *   **Reason:** When `ClientServer` (or other classes) is mocked using `vi.mock`, the `ClientServer` identifier within the test file refers to the *mock object/function*, not the actual class constructor. `expect.any()` requires the actual constructor.
   *   **Action Plan (Developer):**
        1.  **Import the actual class for `expect.any()`:**
            ```javascript
            import { ClientServer as ActualClientServer } from '../../models/ClientServer.js'; // Actual class
            vi.mock('../../models/ClientServer.js', ...); // Your existing mock setup
            // ... in your test
            expect(mockRepoQueryFn).toHaveBeenCalledWith("getByReferer", expect.any(ActualClientServer));
            ```
        2.  Alternatively, if checking the type broadly is acceptable and the mock structure is consistent, use `expect.anything()` or check for specific properties that an instance would have.

### 2. `TypeError: Cannot read properties of undefined (reading 'mockResolvedValue')`
   *   **File(s):** `src/services/__tests__/auth.service.test.js`
   *   **Error Snippet:** `TypeError: Cannot read properties of undefined (reading 'mockResolvedValue')` for `sessionService.getSessionsByUser.mockResolvedValue(...)`.
   *   **Reason:** The mock for `../session.js` is not correctly providing the `getSessionsByUser` function (and potentially others) on the mocked `sessionService` object.
   *   **Action Plan (Developer):**
        *   Ensure the `vi.mock('../session.js', ...)` factory function returns an object that includes all functions from `sessionService` that `authService` calls, each assigned a `vi.fn()`. Example:
          ```javascript
          vi.mock('../session.js', () => ({
            __esModule: true, // If session.js is an ES module
            default: { // If sessionService is a default export
              create: vi.fn(),
              deleteSession: vi.fn(),
              getSessionsByUser: vi.fn(), // Ensure this is defined
              // ... other methods used by authService
            },
            // If they are named exports:
            // create: vi.fn(),
            // deleteSession: vi.fn(),
            // getSessionsByUser: vi.fn(), 
          }));
          ```
        *   Verify if `sessionService` uses default or named exports and structure the mock accordingly.

### 3. Errors related to `__vite_ssr_export_default__` or `Symbol($$jest-matchers-object)` (If they reappear after fixing above)
    *   **File(s):** Previously noted in model tests and `clientServer.service.test.js` linter output.
    *   **Reason:** These usually indicate deeper issues with ES Module/CommonJS interop, Vitest's SSR-emulated environment for tests, or incorrect mocking of default class exports.
    *   **Action Plan (Developer - if issues persist):**
        1.  **Consistent `__esModule: true`:** Ensure all `vi.mock` factories for ES modules include `__esModule: true` in their returned object.
        2.  **Mocking Default Exports of Classes:** When mocking a module that default exports a class (e.g., `export default class MyClass {...}`), the mock factory should return `{ default: MockedClassConstructor, __esModule: true }`.
        3.  **Review `vitest.config.js`:** Check for any configurations that might affect module resolution or transformation in a way that conflicts with the mocking approach.

## II. Unit Test Failures Potentially Indicating Application Logic or Test Logic Issues

Once the above blockers are resolved, these failures will provide more reliable information.

### 1. `src/services/__tests__/authService.test.js` (The older, non-`.unit.` version)
    *   **Numerous Failures:** `AuthError`, `NotFoundError`, assertion errors, `No "default" export is defined on the "../../utils/request/session.js" mock`.
    *   **Reason:** This test file seems to have an outdated or incorrect mocking strategy, especially for `sessionUtils`. It might be attempting integration-level tests without the necessary live dependencies or proper mocks.
    *   **Action Plan (Developer):**
        1.  **Align Mocks:** Update the mock for `sessionUtils` to correctly reflect its default export structure (it seems to be `export default sessionUtilsObject`).
            ```javascript
            vi.mock('../../utils/request/session.js', () => ({
              __esModule: true,
              default: {
                setObj: vi.fn(),
                getSession: vi.fn(),
                // ... other functions used by authService
              }
            }));
            ```
        2.  **Review Test Scope:** Decide if this file is meant for unit or integration tests. If unit, ensure all external dependencies are thoroughly mocked. If integration, it needs a different setup (like a running server, real database, which is out of scope for *these specific unit test fixes*).
        3.  **Focus on `auth.service.test.js` first:** The newer `auth.service.test.js` (which we recently wrote) has a more modern and potentially more correct mocking approach. Prioritize getting those tests to pass. This older `authService.test.js` might be redundant or need a major overhaul.

### 2. `src/services/__tests__/user.service.test.js`
    *   **Failures:** `AssertionError: promise resolved "{...}" instead of rejecting`, `AssertionError: expected "spy" to be called with arguments: [...]`, `AssertionError: expected 'hashed_password123' to be undefined`.
    *   **Reason:** These indicate mismatches between the expected behavior (defined by the test assertions) and the actual behavior of `userService` when its dependencies (`User` model, `Repo.query`, `hashing`) are mocked.
    *   **Action Plan (Developer):**
        1.  **Verify Mocked `Repo.query` Behavior:** For tests like `createUser > should throw ConflictError`, ensure `mockRepoQuery.mockRejectedValueOnce(dbError)` is actually causing the `pipeline` in `userService` to throw a `ConflictError`. The test currently shows it resolves successfully.
        2.  **Trace `get` function logic:** For password validation and `returnPwd` tests, carefully trace the `get` function in `userService`. The issue with `hashing.same` not being called, or `password_hash` not being stripped, suggests the conditions within `get` are not being met as expected by the test, or the mocked user data isn't flowing correctly.
        3.  **`updateUser` Arguments:** The failure `expected "spy" to be called with arguments: [ { name: 'Updated Name' }, …(1) ]` for `User.update` suggests the arguments passed to the mocked `User.update` static method inside `userService.updateUser` are not what the test expects. The actual received arguments show a nested structure. Debug the `updateUser` function in `userService` to see what `existingUserForUpdate` (second argument to `User.update`) actually contains. It seems it might be the full `{ success: true, data: ..., message: ... }` object from the `getUserById` pipeline call, instead of just the user data object.

### 3. `src/utils/__tests__/validationSchemas.test.js`
    *   **Failures:** `AssertionError: expected [Function] to not throw an error but 'ValidationError: ...' was thrown` (for normalized role checks) and `AssertionError: expected 2 to be greater than or equal to 3` (for aggregated errors).
    *   **Reason (Normalized Role Checks):** The previous fix to make role validation case-insensitive and trim whitespace in `validationSchemas.js` might have an issue, or the test setup for these specific cases is not correctly mocking dependencies if `User` static methods are involved in a way that's not accounted for.
    *   **Reason (Aggregated Errors):** The number of errors being collected in `validateUserForContext` is less than expected for a multi-failure scenario.
    *   **Action Plan (Developer):**
        1.  **Review Role Normalization:** Re-verify the `role` validation functions within `ownerValidationRules` and `clientUserValidationRules` in `validationSchemas.js`. Ensure `value.trim().toLowerCase()` is correctly applied and compared *before* the error message is generated or the result is returned.
        2.  **Debug `validateUserForContext` Error Aggregation:** Step through `validateUserForContext` in a debug session for the failing multi-error test case. Check how `errors.push` is behaving and if all individual rule failures are correctly identified and added to the `errors` array.

### 4. `src/middleware/__tests__/detection-middleware.test.js`
    *   **Failure:** `expect(consoleSpy).toHaveBeenCalledWith(...)` failing.
    *   **Action Plan (Developer):** Review the logic in `detectUserRole` middleware and the corresponding test. The spy is not capturing the expected `console.error` call, meaning either the error condition isn't being triggered as the test expects, or the console call itself is different.

## III. Integration Test Failures (Separate Issue Category)

*   **Files:** `auth.integration.test.js`, `clientServer.integration.test.js`, `session.integration.test.js`, `user.integration.test.js`.
*   **Error:** `ECONNREFUSED` (cannot connect to `localhost:3001`).
*   **Reason:** These tests require the backend application server to be running. They are not unit tests.
*   **Action Plan (Developer - separate from unit test fixes):**
    1.  Ensure the backend server can be started (`npm run dev` or `npm start`).
    2.  Run these integration tests only when the server is active in the background, or adapt the test scripts (e.g., in `package.json`) to start the server before running integration tests and shut it down afterwards.
    3.  Currently, the priority is to fix the unit tests.

## IV. General Recommendations for Developer:

1.  **Fix `hashing.verify` Discrepancy:** In `src/models/User.js`, `verifyPassword` calls `hashing.verify()`. However, `src/utils/hashing.js` only exports `hash()` and `same()`. Decide whether to add `verify` to `hashing.js` (e.g., as an alias for `same`) or change `User.js` to use `hashing.same()`. This will affect the `User.test.js` mocks and the actual runtime behavior.
2.  **Iterative Approach:** Fix the critical test environment/mocking issues (Section I) first. Then, address unit test failures one file or one `describe` block at a time.
3.  **Focus on Unit Tests First:** Get the unit tests (`*.service.test.js`, `*.test.js` in `utils` and `models`) passing before deeply troubleshooting the integration tests. Unit tests provide more isolated feedback.
4.  **Update `issues.backend.md`:** As components are verified by passing unit tests or as specific bugs are confirmed by failing unit tests (after fixing mock issues), update `issues.backend.md` to reflect this more granular status.

This structured approach should help systematically resolve the test failures and improve confidence in the codebase. 