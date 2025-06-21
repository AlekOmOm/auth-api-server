---
id: 2024-12-19T10-15-00Z-task-004b
from: orchestrator-agent
to: backend-developer-agent
priority: critical
status: pending
sent-at: 2024-12-19T10:15:00Z
meta:
  source-request: schema-detection-orchestration
  task-number: 4b
  conditional: true
  depends-on: task-003b
  optimization_level: enhanced
  direct_file_references: 2
---

## Task: Implement `getByUrl` SQL Query

**CONDITIONAL TASK**: Only execute if Task 3B is completed (getByUrl operation defined)

### Critical Files to Modify (Direct References):
- **Primary Target**: `src/repo/connection/queries/clientServer.js`
- **Reference**: Database schema for `client_server` table structure

### Required Implementation:

1. **Create `getByUrl` Function**:
   - Export a new function that implements the SQL query for URL-based lookup
   - Follow the pattern of existing functions in the file (e.g., `getByReferer`)

2. **SQL Query Logic**:
   ```javascript
   export function getByUrl(url) {
     return this.knex('client_servers')
       .where('identifier_url', url)  // Or appropriate column
       .first();
   }
   ```

3. **Key Decisions**:
   - Determine the correct column to query against:
     - If `identifier_url` stores full URLs, use it directly
     - If it stores domains only, may need URL parsing
   - Handle URL normalization if needed (trailing slashes, protocols)

4. **Error Handling**:
   - Return `null` or appropriate value when no match is found
   - Maintain consistency with other query functions

### Additional Sub-task:
After implementing the query, update `src/services/clientServer.js`:
- Ensure it correctly calls the new `getByUrl` operation
- Pass the URL parameter in the expected format

### Testing Scenarios:
1. URL with exact match in database
2. URL with no match (should return null/empty)
3. URL variations (with/without trailing slash, different protocols)

### Deliverable:
- Modified `src/repo/connection/queries/clientServer.js` with complete `getByUrl` implementation
- Updated `src/services/clientServer.js` if needed to use the new operation

### Context:
This implementation completes the chain: Frontend sends `X-Schema-Context` with refererUrl → `detectSchemaFromUrl` middleware → `ClientServer` service → `getByUrl` query → proper schema detection. This prevents unnecessary fallbacks to the default schema in `loginController.js`. 