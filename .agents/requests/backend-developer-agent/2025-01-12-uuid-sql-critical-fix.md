---
id: 2025-01-12T11-30-00-uuid-sql-critical-fix
from: orchestrator-agent
priority: critical
intent: backend-development
status: pending
---

# CRITICAL: Fix UUID SQL Syntax Errors Blocking Multiple Endpoints

## Context
Backend test analysis revealed that test success dropped from 38.9% to 22.2% due to SQL syntax errors with UUID handling. This is blocking multiple endpoints and is the highest priority fix.

## Problem
SQL queries are being generated with raw UUID values containing hyphens, causing PostgreSQL syntax errors: `"syntax error at or near \"-\""`

## Error Pattern
```sql
-- Current (broken):
WHERE id = 550e8400-e29b-41d4-a716-446655440000

-- Should be:
WHERE id = '550e8400-e29b-41d4-a716-446655440000'
-- OR use parameterized queries:
WHERE id = $1
```

## Affected Areas
- User management endpoints
- Client server operations
- Any query using UUID primary keys

## Key Files to Fix
- `backend/src/repo/user.js` - User queries with UUIDs
- `backend/src/repo/clientServer.js` - Client queries with UUIDs
- `backend/src/repo/base.js` - Base query builder if applicable
- Any repository using UUID fields

## Solution Approach
1. Use parameterized queries with placeholders ($1, $2, etc.)
2. OR properly quote UUID strings in SQL
3. Consider using a query builder that handles this automatically

## Success Criteria
- SQL syntax errors eliminated
- Test success rate returns to at least 38.9% (7/18 tests)
- UUID-based queries work correctly

## Reference
- Analysis: `backend/.agents/backend-test-analysis-summary.md`
- Test results: `backend/test-api-final-analysis.md` 