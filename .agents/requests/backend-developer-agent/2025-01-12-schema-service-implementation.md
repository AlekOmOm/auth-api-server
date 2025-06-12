---
id: 2025-01-12T11-30-00-schema-service-implementation
from: orchestrator-agent
priority: high
intent: backend-development
status: pending
depends_on: 2025-01-12T11-30-00-uuid-sql-critical-fix
---

# Implement Schema Service Functions and Fix Owner Permissions

## Context
After fixing the critical UUID SQL syntax errors, the next priority is implementing missing schema service functions and fixing owner role permissions. These are blocking schema management endpoints and owner operations.

## Part 1: Schema Service Implementation

### Missing Functions
According to test analysis, these schema service functions are not implemented:
- `listSchemas()`
- `createSchema()`
- `getSchemaDetails()`
- `updateSchema()`
- `deleteSchema()`

### File to Update
- `backend/src/services/schema.js`

### Implementation Requirements
1. List schemas should query PostgreSQL information_schema
2. Create schema should:
   - Create PostgreSQL schema
   - Apply DDL templates from `backend/src/repo/DDL/`
   - Handle naming (client_{name}_{timestamp})
3. Schema operations should respect multi-tenant isolation

## Part 2: Owner Role Permissions

### Problem
Owner role not recognized for admin endpoints despite expectations:
- Owners can't access `/api/owner/*` endpoints
- Permission checks only look for 'admin' role

### Files to Update
- `backend/src/middleware/auth.js` - Update permission checks
- `backend/src/utils/roles.js` - Define owner permissions

### Solution
Either:
1. Grant owners admin-equivalent permissions
2. Create specific owner permissions separate from admin
3. Update middleware to check for owner OR admin role

## Part 3: ClientServer Registration Alignment

### Current Issue
Public registration expects fields not sent by API:
- `identifier_url` - should default from first allowed_return_url
- `authorized_urls` - should default from allowed_return_urls

### File to Update
- `backend/src/services/clientServer.js` - Update registration logic

## Success Criteria
- All 4 schema management endpoints working
- Owner role can access owner-specific endpoints
- ClientServer registration works with minimal fields
- Test success improves from current state

## References
- Test analysis: `backend/.agents/backend-test-analysis-summary.md`
- Architecture doc: `docs/analysis/backend-architecture-clarification.md` 