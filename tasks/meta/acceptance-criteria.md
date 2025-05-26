# Guide to Formulating Acceptance Criteria

Acceptance Criteria (AC) are a set of predefined conditions that must be met for a task or user story to be considered "done" or "complete." They ensure shared understanding between the development team and stakeholders and provide a clear basis for testing.

## Characteristics of Good Acceptance Criteria:

*   **Clear and Concise:** Easy to understand, unambiguous, and stated in simple language.
*   **Testable:** Each criterion should be independently verifiable with a clear pass/fail outcome. Avoid subjective language.
*   **User-Focused (where applicable):** Often written from the perspective of the user, describing what they should be able to do or see.
*   **Business Value Driven:** Should reflect a specific need or value to the end-user or business.
*   **Complete:** Cover all essential aspects of the feature or fix.

## Common Formats:

### 1. Scenario-Oriented (Given/When/Then - GWT):
   Often used for user stories, good for describing behavior.
   - **Given** [initial context/precondition]
   - **When** [event/action occurs]
   - **Then** [expected outcome/result]

   **Example:**
   *Given* the user is on the Login page and has entered valid owner credentials,
   *When* the user clicks the "Login" button and the `return_url` is `/owner`,
   *Then* the user should be redirected to the `/owner` page and see the Owner Dashboard.

### 2. Rule-Oriented (Checklist):
   A list of rules or conditions that must be satisfied. Good for technical tasks or specific conditions.

   **Example for an API endpoint task:**
   - [ ] Endpoint `/api/owner/stats` is accessible via GET request.
   - [ ] Request must include a valid session cookie for an authenticated owner.
   - [ ] Response status code is 200 for a successful request.
   - [ ] Response body contains JSON data with `totalClientServers`, `totalUsers`, etc.
   - [ ] Response status code is 401/403 if the user is not an owner.
   - [ ] Response status code is 401 if the user is not authenticated.

## Project-Specific Considerations for Auth-System:

*   **API Endpoints:** Specify request method, URL, required authentication/authorization (roles), expected request body/params, and expected response (status code, body structure, key data points).
*   **UI/GUI Changes:**
    *   Describe the visual outcome (e.g., "Owner panel UI (`http://localhost:3000/owner`) becomes accessible and functional.").
    *   Specify key elements that should be visible or interactive.
    *   Mention behavior upon user interaction (e.g., "Clicking 'Logout' redirects to the login page.").
    *   Testing for UI will primarily use the Playwright MCP tool.
*   **Redirects:** Clearly state the expected URL and any preserved parameters (like `return_url`).
*   **Role-Based Access:** Explicitly mention expected behavior for different user roles (`user`, `owner`, `admin`).
*   **Error Handling:** Define expected error messages or behavior for invalid inputs or error states.

By defining robust acceptance criteria, we ensure that development work directly addresses the requirements and that testing can comprehensively verify the solution. 