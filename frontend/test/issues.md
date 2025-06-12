# Frontend Issues & Areas for Focused Verification

Last Updated: (Gemini, based on review up to user query on YYYY-MM-DD HH:MM)

This document tracks current discrepancies, potential issues, and areas requiring focused testing or refinement in the frontend application.

## azolinI. Owner Panel - Client Server Management (`CreateClientModal.svelte` & related flows)

While the overall structure for client server CRUD operations in `OwnerPanel.svelte` is in place, the detailed implementation within `CreateClientModal.svelte` (used for both creating and editing client servers) requires thorough verification.

1.  **Issue/Verification**: Comprehensive management of Client Server URLs.
    *   **Description**: The modal must correctly handle the input, validation, and data structuring for `identifier_url`, `entry_point_url`, and especially the `authorized_urls` array.
    *   **Details for `authorized_urls`**: Needs robust UI for adding/removing multiple URLs, ensuring they are correctly formatted and sent as an array to the backend.
    *   **Context**: This is critical for the system's URL-based tenant detection.
    *   **Files**: `src/routes/owner/components/CreateClientModal.svelte`, `src/services/clientServerApi.js`.
    *   **Status**: VERIFIED & REFACTORED. `CreateClientModal.svelte` now uses `clientServerApi.js` for operations. It uses a textarea for `allowed_return_urls` (mapping to `authorized_urls` for the service) which matches OpenAPI `ClientServer` schema for registration. Basic URL validation is present. JSDoc in `clientServerApi.js` for `createClientServer` was corrected to align with OpenAPI spec and resolve linter issues.

2.  **Issue/Verification**: Data integrity for client server creation and updates.
    *   **Description**: Confirm that the data payload sent by `CreateClientModal.svelte` (via `clientServerApi.js`) to the backend for creating or updating client servers perfectly matches the expected backend schema and data types.
    *   **Files**: `src/routes/owner/components/CreateClientModal.svelte`, `src/services/clientServerApi.js`.
    *   **Status**: VERIFIED & REFACTORED. `CreateClientModal.svelte` now uses `clientServerApi.js`. Payload for create (`app_name`, `authorized_urls` mapped to `allowed_return_urls` by service) aligns with OpenAPI `/clientServer/register`. Update payload (`app_name`, `client_mode`, `allowed_return_urls`) aligns with `ClientServer` schema properties for update. Validation is present.

3.  **Issue/Verification**: State handling in edit mode for `CreateClientModal.svelte`.
    *   **Description**: When editing an existing client server, ensure the modal is accurately pre-filled with all current data, including all `authorized_urls`.
    *   **Files**: `src/routes/owner/components/CreateClientModal.svelte`.
    *   **Status**: VERIFIED. Form fields are pre-populated, and `schemaName` is disabled in edit mode.

4.  **Issue/Verification**: Error handling and user feedback in `CreateClientModal.svelte`.
    *   **Description**: Implement and test robust display of validation errors (both client-side, if any, and server-side from API responses) within the modal. Provide clear feedback to the user on success or failure of create/update operations.
    *   **Files**: `src/routes/owner/components/CreateClientModal.svelte`.
    *   **Status**: VERIFIED. Client-side validation, API error display, loading states, and a dedicated success view (with secret display for new clients) are implemented.

## II. Service Layer Robustness (Inferred Files)

These files are inferred to handle API communications. Their error handling is crucial.

1.  **Issue/Verification**: Comprehensive error handling in `src/services/authApi.js`.
    *   **Description**: Ensure all methods within `authApi.js` (handling login, registration, logout, session checks) have thorough error catching, logging, and propagate errors or user-friendly messages appropriately to `authStore.js`.
    *   **Files**: `src/services/authApi.js`.
    *   **Status**: REVIEWED. Error handling uses try-catch blocks, logs errors with `console.error`, and returns a consistent `{ message: ..., success: false }` structure. Relies on `fetchGet`/`fetchPost` for underlying HTTP error management. Console logs (debug) have been cleaned.

2.  **Issue/Verification**: Comprehensive error handling in `src/services/clientServerApi.js`.
    *   **Description**: Ensure all methods (handling CRUD for client servers, fetching stats) have thorough error catching, logging, and propagate errors or user-friendly messages to `OwnerPanel.svelte` and its components.
    *   **Files**: `src/services/clientServerApi.js`.
    *   **Status**: REVIEWED. Error handling is robust: uses try-catch, logs with `console.error`, returns consistent error objects. Includes specific handling for 401/403 errors, providing enhanced feedback. No debug console logs found. Relies on `../util/fetch.js` for base HTTP operations.

## III. Edge Cases & User Experience

1.  **Issue/Verification**: Edge cases in URL handling (`returnUrlHandler.js` & `authStore.js` `extractRefererHeader`).
    *   **Description**: Test the `returnUrl` and `Referer` header logic with various scenarios: complex URLs, malformed URLs, empty referrers, or unexpected clearing of `sessionStorage` for `auth_return_url`.
    *   **Files**: `src/util/returnUrlHandler.js`, `src/stores/authStore.js` (`extractRefererHeader`).
    *   **Status**: REVIEWED & ENHANCED. `authStore.js` `extractRefererHeader` is simple and relies on backend fallbacks for empty referrer. `returnUrlHandler.js` logic for query param and `sessionStorage` fallback is sound. Added `try...catch` to `sessionStorage.setItem` in `returnUrlHandler.js` for robustness against storage errors. `encodeURIComponent` is correctly used. `sessionStorage.getItem` typically handles non-existence gracefully by returning null.

2.  **Issue/Verification**: User experience in Owner Panel during API calls.
    *   **Description**: Ensure consistent and clear loading indicators and feedback messages during all asynchronous operations (loading client servers, create/update/delete actions) within `OwnerPanel.svelte` and its modals.
    *   **Files**: `src/routes/owner/OwnerPanel.svelte`, `src/routes/owner/components/CreateClientModal.svelte`.
    *   **Status**: IMPROVED. `OwnerPanel.svelte` now uses inline success/error messages for delete operations and for feedback after modal operations (create/edit success), replacing `alert()`. Modals (`CreateClientModal`, `UserManagementModal`) have their own internal loading/error feedback. The main panel shows a global loading indicator during these operations.

## IV. General

1.  **Issue/Verification**: Console Log Cleanup.
    *   **Description**: Review and remove or conditionalize extensive `console.log` statements seen in components like `Login.svelte`, `Register.svelte`, `OwnerPanel.svelte` before any production deployment.
    *   **Status**: DONE. All identified files (`Login.svelte`, `Register.svelte`, `OwnerPanel.svelte`, `CreateClientModal.svelte`, `authApi.js`, `fetch.js`, `returnUrlHandler.js`) have had debug logs commented out. Reviewed `UserManagementModal.svelte`, `OwnerStats.svelte`, and `clientServerApi.js`; no debug logs were found in these.

*(This list should be updated as issues are resolved or new ones are identified.)*
