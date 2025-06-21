# Backend Issue Log: Current API Test Failures

**Date:** June 12, 2025  
**Status:** Critical  
**Updated By:** backend-developer-agent

## 1. Executive Summary

Backend API tests show 0% success rate (0/18 tests passing). The server is running and responding, but multiple issues prevent successful API operations:

1. **Schema Detection Failures** - Frontend sends `X-Schema-Context` header but backend fails to process it
2. **Authentication Flow Broken** - Login now returns "User not found" instead of password mismatch
3. **Schema Routes Fixed** - Previously 404, now return 401 (routes are mounted but require auth)
4. **ClientServer SQL Error** - Registration fails with "SQL identifier cannot be null or undefined"
5. **Cascading Auth Failures** - Initial login failure prevents all authenticated endpoints from working

## 2. Schema Detection Issues

### Current Behavior
The test suite sends `X-Schema-Context: http://localhost:3000/` header, but the backend:
- Sets `requestSchemaContext: "Schema not detected on request object"` in error responses
- Server logs show repeated `detectSchemaFromUrl_V3` attempts that fail
- Error: "ClientServer not found or operation failed" when trying to detect from URL

### Server Log Evidence
```
[DETECT_SCHEMA_V3_MAIN] X-Schema-Context Referer URL found: "http://localhost:3000/", attempting schema detection from URL.
[ClientServer DIAGNOSTIC] fromRequestBody called with: http://localhost:3000/
❌ Error in detectSchemaFromUrl_V3 for referer "http://localhost:3000/": ClientServer not found or operation failed.
```

### Root Cause
The `detectSchemaFromUrl_V3` middleware is:
1. Receiving the `X-Schema-Context` header value
2. Trying to look up a ClientServer record with that URL
3. Using `getByReferer` operation which exists in the queries
4. Failing to find any ClientServer record for `http://localhost:3000/`

## 3. Authentication Failures

### POST /auth/register (400)
- Error: "Schema could not be determined for the registration request"
- The schema detection failure prevents registration

### POST /auth/login (404)
- Error: "User not found"
- Changed from previous "Password is incorrect" error
- Indicates the test user data may not exist in the database

### Cascading Failures
All these endpoints fail with "Authentication required" due to login failure:
- GET /auth/session
- GET /auth/me
- GET /auth/admin
- POST /auth/sessions
- POST /auth/logout
- POST /clientServer/user/register
- GET /clientServer/user/clients
- GET /owner/stats

## 4. ClientServer Issues

### POST /clientServer/register (500)
- Error: "Operation failed in ClientServer service: SQL identifier cannot be null or undefined"
- This is supposed to be a public endpoint but something in the SQL layer is expecting an identifier

### Bearer Token Endpoints (401)
- GET /clientServer/me
- PUT /clientServer/me
- Both fail with "Authorization header with Bearer token required"
- Cannot test further without successful client registration and handshake

## 5. User Management Issues

### GET /users (400)
- Error: "Schema could not be determined for the request"
- The endpoint cannot determine which schema to query users from

## 6. Schema Management Routes

**Good News**: Routes are now mounted! (Previously returned 404)

### Current Status (401 for all)
- GET /schema
- POST /schema
- PUT /schema/1
- DELETE /schema/1

All return "Authentication required", which is correct behavior. They need authenticated session to test further.

## 7. Recommended Fixes

### Immediate Actions

1. **Fix Schema Detection**
   - Ensure `http://localhost:3000/` is registered as a ClientServer in the database
   - OR modify detection logic to recognize auth system's own frontend URL
   - OR fix the middleware to properly read the `X-Schema-Context` header

2. **Fix User Data**
   - Check if test users exist in database with correct passwords
   - Run `generateHashes.js` or seed scripts to ensure data exists
   - Test password should be `password123` not `OwnerPassword123!`

3. **Fix ClientServer Registration**
   - Debug why SQL identifier is null in public registration
   - Check if the endpoint is incorrectly requiring user context

4. **Schema Context for Tests**
   - Consider adding logic to default to `auth_internal` for test scenarios
   - Or ensure schema detection works for the test context

### Testing Strategy

After fixes, test in this order:
1. Fix schema detection or seed ClientServer data
2. Ensure test users exist with correct passwords
3. Test auth flow (register → login → session)
4. Test authenticated endpoints with session cookie
5. Test client registration → handshake → bearer token flow
6. Test client-authenticated endpoints

## 8. Progress from Previous Issues

### ✅ Fixed
- Schema routes are now mounted (were 404, now 401)

### 🔄 Changed
- Login error changed from "Password incorrect" to "User not found"
- Schema detection actively tries `getByReferer` but fails to find records

### ❌ Still Broken
- Schema detection from URL/header
- User authentication flow
- ClientServer registration
- All authenticated operations

## 9. Related Files

- Test Suite: `backend/test-backend-api.js`
- Server Logs: Show `detectSchemaFromUrl_V3` diagnostic output
- Analysis Docs: `docs/analysis/current-api-state-analysis.md`
- Quick Reference: `docs/analysis/api-quick-reference.md` 