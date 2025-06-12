---
id: 2024-12-19T09-55-00Z-task-000-summary
from: orchestrator-agent
to: backend-developer-agent
priority: critical
status: pending
sent-at: 2024-12-19T09:55:00Z
meta:
  source-request: schema-detection-orchestration
  task-type: summary
  total-tasks: 6
  optimization_level: enhanced
---

## Summary: Backend Tasks for Schema Detection Bug Fix

### Overview
E2E tests are failing due to schema detection issues. The frontend is implementing `X-Schema-Context` headers, but the backend has a critical bug preventing proper schema resolution for external clients. These tasks fix the backend issues to enable proper multi-tenant schema detection.

### Context from Recent Changes
- `loginController.js` now defaults to `config.SCHEMAS.AUTH_INTERNAL` if no schema is provided
- This is a fallback mechanism - the primary schema detection should happen in middleware
- The goal is to fix the middleware/service layer so the controller fallback is rarely needed

### Task Execution Order

#### Phase 1: Analysis (Task 1)
- **Task 001**: Analyze whether existing `getByReferer` can replace the missing `getByUrl`
- This determines the path for Tasks 2-4

#### Phase 2: Implementation (Tasks 2-4)
**Path A** (if getByReferer is suitable):
- **Task 002a**: Modify ClientServer service to use `getByReferer`

**Path B** (if new getByUrl is needed):
- **Task 003b**: Define `getByUrl` operation in queries/index.js
- **Task 004b**: Implement `getByUrl` SQL query in queries/clientServer.js

#### Phase 3: Consistency (Task 5)
- **Task 005**: Resolve table name discrepancy (`client_server` vs `client_servers`)
- Can be done in parallel with Phase 2

#### Phase 4: Testing (Task 6)
- **Task 006**: Create comprehensive unit tests for URL-based client lookup
- Must be done after Phases 2 and 3

### Success Criteria
1. No more "Operation 'getByUrl' not found" errors
2. Schema detection works correctly when frontend sends `X-Schema-Context` with refererUrl
3. Table naming is consistent throughout the codebase
4. All unit tests pass with >90% coverage
5. E2E registration tests pass without schema detection errors

### Key Files Summary
- `backend/src/middleware/detection.js` - Schema detection middleware
- `backend/src/services/clientServer.js` - Service needing the fix
- `backend/src/repo/connection/queries/index.js` - Query definitions
- `backend/src/repo/connection/queries/clientServer.js` - SQL implementations
- `backend/issues.backend.md` - Full problem analysis

### Coordination Notes
- Multiple developers can work on these tasks in parallel following the phases
- Task 1 must be completed first to determine the implementation path
- Task 5 can be done independently
- Regular sync recommended after Phase 1 to ensure consistent approach 