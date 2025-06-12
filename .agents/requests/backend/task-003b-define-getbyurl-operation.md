---
id: 2024-12-19T10-10-00Z-task-003b
from: orchestrator-agent
to: backend-developer-agent
priority: critical
status: pending
sent-at: 2024-12-19T10:10:00Z
meta:
  source-request: schema-detection-orchestration
  task-number: 3b
  conditional: true
  depends-on: task-001-option-b
  optimization_level: enhanced
  direct_file_references: 1
---

## Task: Define New `getByUrl` Operation in Query Definitions

**CONDITIONAL TASK**: Only execute if Task 1 analysis concludes Option B (new getByUrl is needed)

### Critical File to Modify (Direct Reference):
- **Target**: `src/repo/connection/queries/index.js`

### Required Addition:
Add a new operation definition for `getByUrl` in the `client_server` table configuration.

### Implementation Details:

1. **Locate `client_server` Table Definition**:
   - Find the section where operations for `client_server` are defined
   - Note the pattern used for other operations like `getByReferer`

2. **Add `getByUrl` Operation**:
   ```javascript
   client_server: {
     // ... existing operations ...
     getByReferer: {
       // existing definition
     },
     getByUrl: {
       params: ['url'],
       // Additional configuration as per the pattern
     }
     // ... other operations ...
   }
   ```

3. **Ensure Consistency**:
   - Use `client_server` (singular) as the table alias, not `client_servers`
   - Follow the exact pattern of other operation definitions in the file
   - The parameter should likely be named `url` to match the service's usage

### Important Considerations:
- This operation will be called by `src/services/clientServer.js`
- The corresponding SQL implementation will be needed in Task 4
- The operation should handle full URLs (e.g., `https://client.example.com/app`)

### Deliverable:
- Modified `src/repo/connection/queries/index.js` with the new `getByUrl` operation
- Ensure the definition follows existing patterns and conventions

### Context:
This new operation is crucial for proper schema detection when the frontend sends a `refererUrl` in the `X-Schema-Context` header. Without it, the system falls back to the default schema in `loginController.js`, which may not be appropriate for external client applications. 