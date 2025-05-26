# Task Title: Fix Backend Code Quality Issues in Authentication Flow

**Reference Issue(s):** Discovered during Issue #3 testing - Multiple Backend Bugs

**Date Created:** 2025-05-26
**Priority:** MEDIUM
**Status:** BACKLOG

## 1. Problem Description / User Story:

During testing of the Owner Panel authentication, multiple code quality issues were discovered in the backend authentication flow that indicate potential reliability and maintenance problems. These include typos in schema names, email handling inconsistencies, and case sensitivity issues that could cause authentication failures.

**Issues Identified:**
- Schema name typos: `'auth_innternal'` (double 'n') instead of `'auth_internal'`
- Email creation typos: `'realoowner@mail.com'` (double 'o') during user creation
- Case sensitivity problems: Login searches for `'realOwner@mail.com'` but database contains `'realowner@mail.com'`
- Inconsistent email handling between registration and login flows

**Impact:**
- Authentication failures due to case sensitivity
- Data integrity issues from typos in database operations
- Potential runtime errors from malformed schema names
- Debugging complexity from inconsistent logging

## 2. Affected User Flow(s) & Components:

**User Flows:**
- User Registration Process
- User Login Authentication
- Schema Detection and Database Operations

**Components:**
- Backend: `backend/src/services/auth.js` (login/registration)
- Backend: `backend/src/repo/repositories/userRepository.js` (user CRUD)
- Backend: `backend/src/middleware/schemaDetection.js` (schema operations)
- Backend: Database connection pools and schema management

## 3. Proposed Solution (Optional):

Code quality improvements needed:
1. **Email normalization**: Implement consistent email case handling (toLowerCase) across all operations
2. **Schema name validation**: Add validation to prevent typos in schema names
3. **Input sanitization**: Ensure consistent input handling in user creation/lookup
4. **Code review**: Implement linting rules to catch common typos
5. **Unit tests**: Add tests for edge cases like case sensitivity

## 4. Acceptance Criteria:

- [ ] Email addresses are consistently handled (case-insensitive) across registration and login
- [ ] Schema names are validated and cannot contain typos like double letters
- [ ] User lookup operations are case-insensitive for email addresses
- [ ] Registration and login flows use identical email normalization
- [ ] Database operations use consistent schema name references
- [ ] Error logging provides clear information about authentication failures
- [ ] Input validation prevents common data entry errors

## 5. Test Cases:

### 5.1. API Test Cases:
*   **TC_API_EMAIL_CASE_SENSITIVITY_001:**
    *   **Description:** Verify email case insensitivity in authentication
    *   **Steps:** 
        1. Register user with email `Test@Example.com`
        2. Attempt login with `test@example.com` (all lowercase)
        3. Attempt login with `TEST@EXAMPLE.COM` (all uppercase)
    *   **Expected Result:** All login attempts succeed regardless of case

*   **TC_API_SCHEMA_VALIDATION_002:**
    *   **Description:** Verify schema name validation prevents typos
    *   **Steps:** 
        1. Attempt operation with invalid schema name `auth_innternal`
        2. Verify proper error handling
    *   **Expected Result:** Operation fails with clear error message about invalid schema

### 5.2. GUI Test Cases (using Playwright MCP Tool):
*   **TC_GUI_CASE_INSENSITIVE_LOGIN_001: Case Insensitive Login**
    *   **Description:** Verify users can login with different email case variations
    *   **Preconditions:** User registered with `Owner3@Mail.com`
    *   **Test Steps:**
        1. `mcp_playwright_browser_navigate` to login page
        2. `mcp_playwright_browser_type` email `owner3@mail.com` (lowercase)
        3. `mcp_playwright_browser_type` password
        4. `mcp_playwright_browser_click` login button
    *   **Expected Result:** 
        - Login succeeds despite case difference
        - User is properly authenticated

*   **TC_GUI_REGISTRATION_CONSISTENCY_002: Registration Email Consistency**
    *   **Description:** Verify registration creates users with consistent email format
    *   **Test Steps:**
        1. Register user with mixed case email `NewUser@Example.Com`
        2. Verify database stores consistent format
        3. Test login with various case combinations
    *   **Expected Result:** 
        - Email stored in consistent format
        - Login works with any case variation

## 6. Notes / Dependencies / Blockers:

**Code Quality Standards Needed:**
- Email normalization function (e.g., `email.toLowerCase().trim()`)
- Schema name validation regex
- Input sanitization middleware
- Consistent error messaging

**Database Considerations:**
- Email column should use case-insensitive collation or normalization
- Existing data may need migration for consistency
- Index optimization for case-insensitive searches

**Testing Requirements:**
- Unit tests for email normalization functions
- Integration tests for authentication flows
- Database constraint testing

**Related Issues:**
- May affect other authentication flows beyond owner panel
- Could impact client server user management
- Relates to overall system reliability

**Priority Justification:**
- While not breaking core functionality, these issues indicate technical debt
- Could cause confusing authentication failures for users
- Important for long-term system maintainability

--- 