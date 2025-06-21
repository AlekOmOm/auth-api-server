---
id: 2024-12-19T10-05-00Z-task-002a
from: orchestrator-agent
to: backend-developer-agent
priority: critical
status: pending
sent-at: 2024-12-19T10:05:00Z
meta:
  source-request: schema-detection-orchestration
  task-number: 2a
  conditional: true
  depends-on: task-001-option-a
  optimization_level: enhanced
  direct_file_references: 2
---

## Task: Modify ClientServer Service to Use `getByReferer` Operation

**CONDITIONAL TASK**: Only execute if Task 1 analysis concludes Option A (getByReferer is suitable)

### Critical Files to Modify (Direct References):
- **Primary Target**: `src/services/clientServer.js`
- **Reference**: `src/repo/connection/queries/index.js` (to confirm getByReferer signature)

### Current Problem:
The service is attempting to call a non-existent `getByUrl` operation, causing the error:
`Service pipeline error for ClientServer: Operation 'getByUrl' not found for table 'client_servers'`

### Required Changes:

1. **Locate the Failing Code Path**:
   - Find where `clientServer.js` attempts to call `getByUrl`
   - This is likely in a method that receives a URL parameter from `detectSchemaFromUrl` middleware

2. **Replace with `getByReferer`**:
   - Change the repository call from `getByUrl` to `getByReferer`
   - Ensure parameter passing matches the `getByReferer` signature from Task 1 analysis

3. **Parameter Mapping**:
   - Based on Task 1 findings, ensure the URL parameter is correctly formatted for `getByReferer`
   - If `getByReferer` expects a different format than what's provided, add necessary transformation

### Code Pattern Example:
```javascript
// Before (failing):
const clientServer = await this.repo.getByUrl(url);

// After (fixed):
const clientServer = await this.repo.getByReferer(url);
```

### Testing Considerations:
- The fix should resolve the "Operation 'getByUrl' not found" error
- Schema detection for external clients (with refererUrl) should work correctly
- The fallback in `loginController.js` should rarely be needed for client requests

### Deliverable:
- Modified `src/services/clientServer.js` with the corrected repository call
- Brief comment in code explaining why `getByReferer` is used for URL lookups

### Context:
Remember that this fix is part of the primary schema detection mechanism. The `loginController.js` fallback to `config.SCHEMAS.AUTH_INTERNAL` should only activate when this detection fails or for truly internal requests. 