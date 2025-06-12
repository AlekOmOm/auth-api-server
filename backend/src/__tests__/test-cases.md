Okay, I understand. The backend developer is focusing on fixing the immediate test setup and mocking issues, particularly in `clientServer.service.test.js`.

While they work on that, I can document the test cases and intended flow for the unit tests we've designed and written so far. This will be valuable for `issues.backend.md` to provide clarity on what aspects of the system these tests are intended to verify once the test environment issues are resolved.

Here's a breakdown of the created unit tests, their intended flow, and key test cases:

## Unit Test Documentation

Here's a summary of the unit test suites created, their purpose, and the flow of key test cases.

### 1. `backend/src/utils/__tests__/uuid.test.js`

*   **Purpose:** To verify the correctness and reliability of the UUID generation utility (`generateUuidV4` from `../uuid.js`).
*   **Component Tested:** `generateUuidV4` function.
*   **General Approach:** Calls the function and asserts properties of the returned value. No complex mocking is needed as it's a self-contained utility (assuming the underlying `uuid` library works).
*   **Key Test Cases & Intended Flow:**
    *   **Type Check:** Ensures `generateUuidV4()` returns a string.
    *   **Format Validation:** Checks if the returned string conforms to the standard v4 UUID regex pattern.
    *   **Length Check:** Verifies the UUID string is 36 characters long (standard length).
    *   **Uniqueness:** Calls `generateUuidV4()` multiple times and asserts that the generated UUIDs are unique.
    *   **Version Check:** Confirms the UUID contains the v4 identifier ("-4-") at the correct position (15th character, index 14).

### 2. `backend/src/utils/__tests__/hashing.test.js`

*   **Purpose:** To ensure the password hashing and comparison utilities (`hashing.hash` and `hashing.same` from `../hashing.js`) work correctly and securely.
*   **Components Tested:** `hashing.hash()`, `hashing.same()`.
*   **General Approach:** Uses a sample password, hashes it, and then compares it. It also tests edge cases and invalid inputs. Relies on the `bcryptjs` library for underlying operations.
*   **Key Test Cases & Intended Flow:**
    *   **`hashing.hash()`:**
        *   **Return Type:** Ensures it returns a string.
        *   **Difference from Original:** Confirms the hash is not the same as the plain password.
        *   **Valid bcrypt Hash:** Checks if the output matches the bcrypt hash format and can be compared by `bcrypt.compareSync`.
        *   **Salting (Uniqueness for same password):** Verifies that hashing the same password multiple times produces different hashes (due to unique salts).
    *   **`hashing.same()`:**
        *   **Correct Password:** Ensures it returns `true` when a correct plain password is compared against its hash.
        *   **Incorrect Password:** Ensures it returns `false` for an incorrect password.
        *   **Malformed Hash:** Checks that it returns `false` if the provided hash is not a valid bcrypt hash.
        *   **Different Password's Hash:** Confirms it returns `false` if comparing a password against a hash generated from a *different* password.
        *   **Empty Password:** Tests correct handling of hashing and comparing an empty password string.
        *   **Empty Hash String:** Ensures comparison against an empty string hash returns `false`.

### 3. `backend/src/models/__tests__/User.test.js`

*   **Purpose:** To thoroughly test the `User` model (`../../models/User.js`), including its constructor logic, ID generation, validation, static factory methods, instance methods for transformations, and data output methods.
*   **Component Tested:** `User` class.
*   **General Approach:** Mocks all external dependencies (`generateUuidV4`, `hashing`, `validateUserForContext`, `BaseModel` static methods if necessary) to isolate `User` model logic. It instantiates `User` objects with various inputs and asserts their properties and method return values.
*   **Key Test Cases & Intended Flow (`describe` blocks):**
    *   **`Constructor`:**
        *   Verifies correct property assignment when all arguments are provided.
        *   **Crucially tests that `generateUuidV4` is called and an ID is set if no `id` is passed to the constructor.**
        *   Checks that `hashing.hash` is called for plain passwords and that provided `passwordHash` is used if available.
        *   Confirms `validate()` is implicitly called.
        *   Includes tests for the developer-added logging around UUID generation failures.
    *   **`Validation (validate method)`:**
        *   Tests various valid and invalid scenarios for user properties (name, email, role, password strength, length, format) based on OpenAPI specs.
        *   Checks "lookup contexts" (e.g., validation when only `id` or `email` is provided).
    *   **`Static Factory Methods` (`User.fromCredentials`, `User.fromRequestBody`, `User.fromDb`, `User.forAuth`):**
        *   For each factory, tests successful instance creation with valid inputs.
        *   Tests correct property mapping and default value assignments (e.g., default role).
        *   Checks for appropriate error throwing (e.g., `ValidationError`) with invalid inputs.
        *   `User.fromRequestBody` specifically tests handling of schema for context-aware validation and different ways the request body might be structured.
    *   **`Immutable Transformation Methods` (`withRole`, `withName`, `withEmail`, `withPassword`):**
        *   Ensures each method returns a *new* `User` instance.
        *   Verifies that only the intended property is updated and others are preserved.
        *   Checks that password hashing occurs correctly in `withPassword`.
    *   **`Data Transformation Methods` (`User.update`, `toDatabaseObject`, `toDatabaseArray`, `toApiResponse`, `toJwtPayload`):**
        *   `User.update`: Tests updating allowed fields, ignoring disallowed fields, and returning a new instance.
        *   Others: Verify that the methods return objects/arrays in the expected format, excluding sensitive data where appropriate (e.g., `toApiResponse`).
    *   **`Predicate Methods` (`hasRole`, `isPrivileged`, `canManage`, `verifyPassword`):**
        *   Tests the boolean logic of these methods for different user roles and states.
        *   `verifyPassword`: Confirms it calls the (mocked) `hashing.verify` (or `hashing.same`) correctly and handles cases where `passwordHash` is missing.

### 4. `backend/src/utils/__tests__/validationSchemas.test.js`

*   **Purpose:** To test the schema-based user validation logic in `../validationSchemas.js`, ensuring that the correct rule sets (`ownerValidationRules` vs. `clientUserValidationRules`) are applied and that errors are reported correctly.
*   **Components Tested:** `validateUserForContext()`, `getRequiredFieldsForSchema()`, and implicitly `ownerValidationRules` and `clientUserValidationRules`.
*   **General Approach:** Mocks static validation methods from the `User` model (`User.validateStringLength`, `User.isValidEmail`, `User.validatePasswordStrength`) to isolate the logic within `validationSchemas.js`.
*   **Key Test Cases & Intended Flow:**
    *   **`validateUserForContext`:**
        *   **`auth_internal` schema context:**
            *   Verifies successful validation for valid owner data.
            *   Ensures `ownerValidationRules` are used (e.g., accepts "owner" and "admin" roles, rejects "user").
            *   Tests handling of case variations for roles (e.g., "Owner").
            *   Checks that `ValidationError` is thrown if individual mocked `User` static validations fail (e.g., name, email, password strength).
            *   Tests the redundant role check present in `validateUserForContext` for the `auth_internal` context.
        *   **Client schema context (e.g., `client_some_app`):**
            *   Verifies successful validation for valid client user data.
            *   Ensures `clientUserValidationRules` are used (e.g., only accepts "user" role).
            *   Tests handling of case variations for the "user" role.
            *   Tests the redundant role check present in `validateUserForContext` for client schemas.
        *   **General Error Handling:**
            *   Confirms that a `ValidationError` with a summary message and an array of specific field errors is thrown when multiple validations fail.
            *   Checks that `schemaContext` is correctly set on the error.
            *   Ensures valid data is returned if all validations pass.
    *   **`getRequiredFieldsForSchema`:**
        *   Verifies it returns the correct array of field names (keys from the respective rule objects) for `auth_internal` and other (client) schemas.

### 5. `backend/src/services/__tests__/user.service.test.js`

*   **Purpose:** To test the `UserService` (`../user.js`), ensuring it correctly orchestrates calls to the `User` model (for instantiation and data preparation) and the `Repo` (for database operations).
*   **Components Tested:** All exported functions from `userService` (e.g., `getUsers`, `createUser`, `getUserById`, `get`, `updateUser`, `deleteUser`). The internal `pipeline` function is tested implicitly.
*   **General Approach:** Mocks the `User` model's static methods (especially `fromRequestBody` and `update`), the `Repo` class (specifically its `query` method), and the `hashing` utility.
*   **Key Test Cases & Intended Flow:**
    *   **`getUsers`:** Checks that `User.fromRequestBody` (by the pipeline) and `repo.query('getAll', ...)` are called.
    *   **`createUser`:**
        *   Tests successful user creation, ensuring `User.fromRequestBody` and `repo.query('create', ...)` are called with correct data.
        *   Tests `ConflictError` being thrown if the (mocked) repository indicates a duplicate email (e.g., by rejecting with a specific DB error code).
        *   Verifies that a `ValidationError` from `User.fromRequestBody` is propagated.
    *   **`getUserById`, `getUserByNameAndEmail`:** Test successful retrieval and `NotFoundError` when the (mocked) repository returns `null`.
    *   **`get` (composite function):**
        *   Tests routing to `getUserById` or `getUserByNameAndEmail` based on provided parameters.
        *   Checks error handling for missing parameters.
        *   **Password Validation:** Verifies correct calls to (mocked) `hashing.same` and appropriate success/failure returns based on password match, incorrect password, or missing `password_hash` on the user object.
        *   **`returnPwd` flag:** Ensures `password_hash` is included/excluded based on this flag.
    *   **`updateUser`:**
        *   Verifies that `getUserById` is called first to fetch the existing user.
        *   Ensures `User.update` (static method) is called to prepare update data.
        *   Checks that `repo.query('update', ...)` is called with the merged data.
        *   Tests `NotFoundError` if the user to update isn't found initially.
    *   **`deleteUser`:** Tests successful deletion flow and potentially `NotFoundError` (depending on how the delete operation in the repo is configured and mocked).

### 6. `backend/src/services/__tests__/auth.service.test.js`

*   **Purpose:** To test the `AuthService` (`../auth.js`), which handles core authentication flows like login, registration, and logout. It verifies the orchestration of calls to `UserService`, `SessionService`, `ClientServerService`, and `sessionUtils`.
*   **Components Tested:** All exported functions from `authService` (e.g., `login`, `logout`, `register`, `getSessions`, `getCurrentUser`, `getSession`, `validateUserSchemaAccess`). The internal `execute` and `prep` helper functions are tested implicitly.
*   **General Approach:** Mocks all external service dependencies (`userService`, `sessionService`, `clientServerService`), model static methods (`User.fromRequestBody`, `Session.fromRequestBody`), and `sessionUtils`.
*   **Key Test Cases & Intended Flow:**
    *   **`login`:**
        *   Successful login: verifies calls to `userService.get`, `Session.fromRequestBody` (via `execute`), `sessionService.create`, `clientServerService.getAllowedUrls`, `sessionUtils.setObj`, and `req.session.save`. Checks the structure of the successful response.
        *   Failure scenarios: Tests throwing `AuthError` if `userService.get` fails (user not found/wrong password) or if `sessionService.create` fails.
        *   Graceful handling: Ensures login proceeds (with empty `allowedUrls`) even if `clientServerService.getAllowedUrls` fails, logging a warning.
    *   **`register`:**
        *   Successful registration: Checks calls to `userService.get` (for email existence check - expecting `NotFoundError`), `userService.createUser`, `sessionService.create`, `sessionUtils.setObj`, and `req.session.save`.
        *   Failure scenarios: Tests `ConflictError` if `userService.get` finds an existing email, `AuthError` if `userService.createUser` fails, or if `sessionService.create` fails post-registration.
    *   **`logout`:**
        *   Successful logout: Verifies `Session.fromRequestBody` (via `execute`) and `sessionService.deleteSession` are called.
        *   Failure: Tests `AuthError` if `sessionService.deleteSession` reports failure.
    *   **`getSessions`, `getCurrentUser`:**
        *   Tests successful data retrieval by ensuring the correct model (`Session` or `User`) is used with `fromRequestBody` (via `execute`) and the appropriate service method (`sessionService.getSessionsByUser` or `userService.getUser`) is called.
        *   Checks `AuthError` if required parameters like `userId` are missing.
    *   **`getSession`:** Verifies correct formatting of session data based on input. Tests `AuthError` if `userId` is missing.
    *   **`validateUserSchemaAccess`:**
        *   Tests access grant if user schema matches target schema.
        *   Tests access grant if user is owner/admin in `auth_internal`.
        *   Tests `AuthError` for unauthorized cross-schema access.
        *   Tests `AuthError` if the user is not found during the validation.
        *   Tests `AuthError` if required parameters are missing.

This documentation should provide the backend developer with a clear overview of what each unit test suite aims to achieve. Once the test environment issues are resolved, the results from these tests will be very informative for updating `issues.backend.md` by pinpointing verified working parts and specific broken units.