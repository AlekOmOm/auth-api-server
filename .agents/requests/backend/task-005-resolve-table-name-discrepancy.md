---
id: 2024-12-19T10-20-00Z-task-005
from: orchestrator-agent
to: backend-developer-agent
priority: high
status: pending
sent-at: 2024-12-19T10:20:00Z
meta:
  source-request: schema-detection-orchestration
  task-number: 5
  optimization_level: enhanced
  direct_file_references: 5
---

## Task: Investigate and Resolve Table Name Discrepancy (`client_server` vs `client_servers`)

### Critical Files to Investigate (Direct References):
- **Query Definitions**: `src/repo/connection/queries/index.js` (uses `client_server` singular)
- **Service Layer**: `src/services/clientServer.js` (error mentions `client_servers` plural)
- **Database Migrations**: Check migration files in `src/db/migrations/` or similar
- **ORM Models**: Any model definitions for client server entity
- **Error Generation**: Trace where the error message with `client_servers` originates

### Specific Error Context:
**Error Message**: `Service pipeline error for ClientServer: Operation 'getByUrl' not found for table 'client_servers'.`
- Note: Error uses plural `client_servers`
- But `queries/index.js` defines operations for `client_server` (singular)

### Investigation Steps:

1. **Determine Actual Database Table Name**:
   - Check migration files for `CREATE TABLE` statements
   - Look for the canonical table name in the database schema
   - Verify if there's a table aliasing mechanism

2. **Trace Error Message Source**:
   - Find where "Operation 'getByUrl' not found for table 'client_servers'" is generated
   - This might be in a repository base class or error handler
   - Determine why it's using the plural form

3. **Check for Dynamic Table Name Construction**:
   - Some ORMs pluralize model names for table names
   - Check if `ClientServer` model is being auto-pluralized to `client_servers`

4. **Verify Query Definitions**:
   - Confirm that `client_server` in `queries/index.js` correctly maps to the actual table
   - Check if there's a table name mapping configuration

### Required Fixes:

**If the database table is actually `client_servers` (plural)**:
- Update `queries/index.js` to use `client_servers` instead of `client_server`
- Ensure all query implementations reference the correct table

**If the database table is actually `client_server` (singular)**:
- Fix the source of the error message to use singular form
- Update any code that dynamically constructs the plural table name

### Deliverable:
1. Report confirming the canonical database table name
2. Modified files ensuring consistent table name usage throughout:
   - `src/repo/connection/queries/index.js` (if needed)
   - Error generation code (if needed)
   - Any other files with incorrect table references

### Context:
This discrepancy is causing confusion and may lead to runtime errors even after fixing the `getByUrl` issue. Consistent naming is crucial for the schema detection mechanism to work properly, preventing unnecessary fallbacks to the default schema in `loginController.js`. 