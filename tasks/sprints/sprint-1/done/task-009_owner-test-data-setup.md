# Task Title: Create Owner Test Data - Client Server Setup

**Reference Issue(s):** Database analysis shows owner3@mail.com has 0 client servers but backend reports owned_clients: '1'

**Date Created:** 2025-05-26
**Priority:** MEDIUM
**Status:** ✅ **ANALYSIS COMPLETE - KEY ISSUES IDENTIFIED**

## 1. Problem Description / User Story:

Database analysis revealed that the test owner user `owner3@mail.com` (fab6cbc8-d5af-4c07-9b74-b28b04963e8a) has no client servers in the database, yet the backend authentication logs show `owned_clients: '1'`. This creates inconsistent test data and may cause issues with Owner Panel functionality.

**Current State:**
- Owner user exists in auth_internal.users ✅
- Owner has 0 client servers in auth_internal.client_servers ❌
- Backend reports `owned_clients: '1'` ❌
- Owner Panel may not display correctly due to missing data

**Expected State:**
- Owner user has at least one client server for testing
- Backend correctly counts owned client servers
- Owner Panel displays client server management interface
- Consistent test data for reliable testing

## 2. Affected User Flow(s) & Components:

**User Flows:**
- Owner Panel Client Server Management
- Owner Dashboard Statistics
- Client Server Creation and Management

**Components:**
- Database: `auth_internal.client_servers` table
- Backend: Owner role detection logic
- Backend: Client server counting logic
- Frontend: Owner Panel client server display
- Testing: Owner Panel test cases

## 3. Database Evidence:

**Current Owner Query Result:**
```sql
-- Query: SELECT client_id, app_name, assigned_schema_name, user_id FROM auth_internal.client_servers WHERE user_id = 'fab6cbc8-d5af-4c07-9b74-b28b04963e8a';
Result: (0 rows)
```

**Backend Log Evidence:**
```
🔐 [AUTH SERVICE] User is an OWNER. Session updated. {
  user_role: 'owner',
  owned_clients: '1',  // <-- Inconsistent with database
  reason: 'login_is_actual_owner',
  target_page: '/owner'
}
```

## 4. Proposed Solution:

1. **Investigate owner detection logic** - understand how `owned_clients` is calculated
2. **Create test client server** for owner3@mail.com
3. **Update seed data** to include consistent owner test data
4. **Verify Owner Panel displays client server correctly**

## 5. Acceptance Criteria:

- [ ] owner3@mail.com has at least 1 client server in database
- [ ] Backend `owned_clients` count matches database reality
- [ ] Owner Panel displays client server management interface
- [ ] Client server has valid schema assignment (e.g., `client_owner3test_<timestamp>`)
- [ ] Client server has proper metadata (app_name, allowed_return_urls, etc.)
- [ ] API endpoint `/api/clientServer/user/clients` returns client data for owner
- [ ] Seed data includes this test setup for future runs

## 6. Test Cases:

### 6.1. Database Test Cases:
*   **TC_DB_OWNER_CLIENT_COUNT_001:**
    *   **Description:** Verify owner has client servers in database
    *   **Steps:** 
        1. Query: `SELECT COUNT(*) FROM auth_internal.client_servers WHERE user_id = 'fab6cbc8-d5af-4c07-9b74-b28b04963e8a'`
    *   **Expected Result:** Count >= 1

### 6.2. API Test Cases:
*   **TC_API_OWNER_CLIENTS_001:**
    *   **Description:** Verify owner client server API returns data
    *   **Steps:** 
        1. Login as owner3@mail.com
        2. GET `/api/clientServer/user/clients`
    *   **Expected Result:** 200 status with array of client server objects

### 6.3. GUI Test Cases:
*   **TC_GUI_OWNER_PANEL_CLIENT_DISPLAY_001:**
    *   **Description:** Verify Owner Panel shows client servers
    *   **Steps:** 
        1. Login as owner3@mail.com
        2. Navigate to Owner Panel
        3. Verify client server cards are displayed
    *   **Expected Result:** Client server management interface with at least 1 client card

## 7. Notes / Dependencies / Blockers:

**Dependencies:**
- task-008_session-expiration-fix.md (must be completed first for proper testing)

**Investigation Required:**
- How is `owned_clients` calculated in backend?
- Why does backend show count of 1 when database shows 0?
- What constitutes a valid client server for an owner?

**Suggested Test Client Server Data:**
```sql
INSERT INTO auth_internal.client_servers (
  client_id, 
  client_secret_hash, 
  app_name, 
  assigned_schema_name, 
  allowed_return_urls, 
  user_id, 
  client_mode
) VALUES (
  'owner3_test_app_001',
  '<hashed_secret>',
  'Owner3 Test Application',
  'client_owner3test_<timestamp>',
  '{http://localhost:5000,http://localhost:5001}',
  'fab6cbc8-d5af-4c07-9b74-b28b04963e8a',
  'frontend-login-proxy'
);
```

**Related Files:**
- `backend/src/repo/seed/` (seed data scripts)
- `db/sql/schemas/auth_internal/client_servers.sql` (table structure)
- Backend owner detection logic (location TBD)

--- 