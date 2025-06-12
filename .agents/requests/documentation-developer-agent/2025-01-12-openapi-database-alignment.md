---
id: 2025-01-12T11-30-00-openapi-database-alignment
from: orchestrator-agent
priority: high
intent: documentation
status: pending
---

# Align OpenAPI Specification with Database Requirements

## Context
Backend test analysis revealed significant mismatches between the OpenAPI specification and actual database schema requirements. These mismatches are causing client registration failures and confusion about required fields.

## Critical Misalignments Found

### 1. ClientServer Schema Missing Fields
**Database requires but OpenAPI doesn't document:**
- `identifier_url` - Primary URL for schema detection
- `entry_point_url` - Entry point for the client application
- `authorized_urls` - Array of authorized URLs beyond allowed_return_urls

### 2. Password Validation Requirements
**Actual requirements stricter than documented:**
- Must include uppercase letter (not mentioned in OpenAPI)
- Current validation: `/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/`

### 3. Owner Role Permissions
**OpenAPI implies owner has admin access, but implementation differs:**
- Owner role not recognized for admin endpoints
- Need to clarify: Should owner = admin or limited permissions?

### 4. Missing Headers in Documentation
**Required by backend but not in OpenAPI:**
- `X-Schema-Context` header for schema detection
- Used by frontend and tests but undocumented

## Files to Update
- `docs/core-components/OpenAPI-Specs.yaml` - Main OpenAPI specification
- Consider creating supplementary documentation for multi-tenant architecture

## Specific Updates Needed

### ClientServer Schema
```yaml
ClientServer:
  type: object
  properties:
    # Existing fields...
    identifier_url:
      type: string
      format: uri
      description: Primary URL for schema detection
      example: "https://myapp.com"
    entry_point_url:
      type: string
      format: uri
      description: Entry point URL for the client application
    authorized_urls:
      type: array
      items:
        type: string
        format: uri
      description: URLs authorized for schema detection beyond OAuth callbacks
```

### Password Field
Update password field descriptions to include complexity requirements.

### Role Permissions
Add clear documentation about owner vs admin permissions.

## Reference Documentation
- Backend analysis: `backend/.agents/backend-test-analysis-summary.md`
- Database schema: `db/sql/schemas/auth_internal_complete.sql`
- Test alignment: `backend/test-api-schema-alignment.md`

## Success Criteria
- OpenAPI spec accurately reflects all required fields
- Password requirements clearly documented
- Role permissions explicitly defined
- Multi-tenant headers documented 