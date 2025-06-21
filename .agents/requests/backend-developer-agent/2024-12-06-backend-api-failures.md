---
id: 2024-12-06-backend-api-failures
from: orchestrator-agent
to: backend-developer-agent
priority: high
status: pending
sent-at: 2024-12-06T11:40:00Z
meta:
  source-request: documentation-agent-report
  original-from: system
  documentation-ref: .agents/docs-requests/processed/response_to_doc_request_backend_api_failures.md
  task_file_path: .agents/requests/backend-developer-agent/2024-12-06-backend-api-failures.md
---

## Task: Fix Backend API Authentication Flow Failures

### Critical Files to Examine (Direct References):
- **Main Server**: `backend/server.js` (IPv6/IPv4 binding configuration)
- **Schema Detection**: `backend/src/middleware/detection.js` (core issue location)
- **Auth Controller**: `backend/src/controllers/auth.js` (login/register/session endpoints)
- **Environment Config**: `backend/src/config/env.js` (BACKEND.HOST variable)

### Supporting Documentation:
- **Analysis Report**: `.agents/docs-requests/processed/response_to_doc_request_backend_api_failures.md`
- **Schema Detection Logic**: `docs/core-components/schema-detection.md`
- **Frontend URL Detection**: `docs/core-components/frontend-url-detection.md`
- **OpenAPI Specs**: `docs/core-components/OpenAPI-Specs.yaml`

### Specific Error Contexts:

#### 1. Schema Detection Failure
**Error Message**: `"Schema could not be determined"`
**Affected Endpoints**: `/api/auth/login`, `/api/auth/register`
**Root Cause Analysis** (from documentation agent):
- Missing/incorrect `Referer` headers preventing client identification
- `userType` detection logic issues based on `returnUrl`
- Client configuration mismatches in `auth_internal.client_servers` table

**Detection Logic Flow** (from `backend/src/middleware/detection.js`):
1. Check existing authenticated session
2. Determine based on `userType` and URL (`Referer` header or `identifierUrl` query)
3. Match against `auth_internal.client_servers` configurations
4. Fallback to template schema (from `SEED_SCHEMA` env var)

#### 2. IPv6 Connection Failure
**Error Message**: `ECONNREFUSED ::1:3001`
**Problem Location**: `backend/server.js`
**Issue**: Server not explicitly binding to IPv6 loopback
**Current Code Pattern**: `app.listen(PORT, () => { ... })` (missing host parameter)
**Available but Unused**: `BACKEND.HOST` from `backend/src/config/env.js`

#### 3. Cascade Session Failure
**Error**: `/api/auth/session` returns 401 Unauthorized
**Dependency**: Requires successful `/api/auth/login` (which currently fails)
**Controller**: `backend/src/controllers/auth.js` (function `me`)

### Required Fixes (Prioritized):

#### High Priority:
1. **Schema Detection Enhancement** (`backend/src/middleware/detection.js`):
   - Add detailed logging to trace detection failures
   - Implement fallback mechanisms for missing headers
   - Validate client configuration matches in database

2. **Server Binding Fix** (`backend/server.js`):
   - Use `BACKEND.HOST` environment variable in `app.listen()`
   - Explicitly configure for both IPv4 and IPv6
   - Add health check endpoint reporting binding addresses

#### Medium Priority:
3. **Error Handling** (`backend/src/controllers/auth.js`):
   - Return specific error messages for schema detection failures
   - Include diagnostic information in development mode
   - Add request ID tracking for debugging

### Testing Requirements:
- Unit tests for schema detection with various header combinations
- Integration tests for auth flow with different client configurations
- Network connectivity tests for both IPv4 and IPv6 endpoints

### Expected Outcomes:
- Backend service starts without module import errors
- Schema detection works with proper fallback mechanisms
- Server accepts connections on both IPv4 (`127.0.0.1:3001`) and IPv6 (`[::1]:3001`)
- Authentication flow completes successfully from login through session validation

### Database Context:
- **Schema Storage**: `auth_internal.client_servers` table
- **Required Fields**: `identifier_url`, `authorized_urls`, `assigned_schema_name`
- **Fallback Schema**: Value from `SEED_SCHEMA` environment variable 