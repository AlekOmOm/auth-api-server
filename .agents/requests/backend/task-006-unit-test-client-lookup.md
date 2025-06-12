---
id: 2024-12-19T10-25-00Z-task-006
from: orchestrator-agent
to: backend-developer-agent
priority: high
status: pending
sent-at: 2024-12-19T10:25:00Z
meta:
  source-request: schema-detection-orchestration
  task-number: 6
  depends-on: tasks-2-through-5
  optimization_level: enhanced
  direct_file_references: 3
---

## Task: Create Unit Tests for Client Server URL Lookup

**PREREQUISITE**: Complete Tasks 2-5 (fix getByUrl/getByReferer and table name consistency)

### Critical Files to Test/Create (Direct References):
- **Service to Test**: `backend/src/services/clientServer.js`
- **Middleware to Test**: `backend/src/middleware/detection.js` (specifically `detectSchemaFromUrl`)
- **Test Files**: Create/update in `backend/src/services/__tests__/` or `backend/test/unit/services/`

### Test Scenarios for ClientServer Service:

1. **Mock Repository Layer Tests**:
   ```javascript
   describe('ClientServer.getByUrl', () => {
     it('should return client server when URL exists', async () => {
       // Mock repo.getByUrl or repo.getByReferer (depending on Task 1 outcome)
       // Assert service returns expected client server object
     });
     
     it('should return null when URL not found', async () => {
       // Mock repo to return null
       // Assert service handles gracefully
     });
     
     it('should handle URL normalization', async () => {
       // Test with trailing slashes, different protocols
       // Assert consistent behavior
     });
   });
   ```

2. **Integration with detectSchemaFromUrl Middleware**:
   ```javascript
   describe('detectSchemaFromUrl middleware', () => {
     it('should set req.schema when X-Schema-Context contains valid refererUrl', async () => {
       // Mock ClientServer service
       // Simulate request with X-Schema-Context header
       // Assert req.schema is set correctly
     });
     
     it('should not set schema when refererUrl not found', async () => {
       // Mock ClientServer to return null
       // Assert req.schema remains undefined
       // Verify loginController fallback would activate
     });
     
     it('should handle auth_internal context', async () => {
       // Test when X-Schema-Context is 'auth_internal'
       // Assert appropriate schema handling
     });
   });
   ```

### Additional Test Cases:

3. **Error Handling**:
   - Test behavior when database connection fails
   - Test invalid URL formats
   - Test missing configuration

4. **Performance Considerations**:
   - Mock slow database responses
   - Ensure appropriate timeouts

### Test Implementation Requirements:
- Use existing test framework (Jest, Mocha, etc.)
- Follow project's testing conventions
- Achieve >90% code coverage for modified code paths
- Include both positive and negative test cases

### Deliverable:
1. New/updated test files with comprehensive coverage
2. Test execution report showing all tests passing
3. Coverage report for the tested components

### Context:
These tests ensure the schema detection mechanism works reliably, reducing dependency on the `loginController.js` fallback. They validate the complete flow from frontend's `X-Schema-Context` header through to proper schema resolution. 