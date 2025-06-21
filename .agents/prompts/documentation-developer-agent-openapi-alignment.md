# Documentation Developer Agent: OpenAPI Database Alignment

## Mission
Update the OpenAPI specification to accurately reflect the actual database schema requirements and system behavior discovered during backend testing.

## Context
The backend developer's comprehensive test analysis revealed significant mismatches between what the OpenAPI spec documents and what the database/backend actually requires. These mismatches are causing confusion and implementation errors.

## Critical Misalignments to Fix

### 1. ClientServer Schema - Missing Required Fields

The database `auth_internal.client_servers` table requires fields not documented in OpenAPI:

**Current OpenAPI Schema:**
```yaml
ClientServer:
  properties:
    client_id: string
    client_secret: string
    app_name: string
    allowed_return_urls: array
    assigned_schema_name: string
```

**Actual Database Requirements:**
```yaml
ClientServer:
  properties:
    # ... existing fields ...
    identifier_url:        # MISSING - Required for schema detection
    entry_point_url:      # MISSING - Client app entry point
    authorized_urls:      # MISSING - URLs for schema detection
    owner_id:            # MISSING - User who owns this client
```

### 2. Password Validation Requirements

**Current Documentation:** "password: string, minLength: 8"

**Actual Validation:**
```javascript
// Requires uppercase, lowercase, and digit
/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/

// Example valid: "Password123"
// Example invalid: "password123" (no uppercase)
```

### 3. X-Schema-Context Header

This header is REQUIRED for multi-tenant operations but completely undocumented:

```yaml
parameters:
  - name: X-Schema-Context
    in: header
    required: true
    schema:
      type: string
    description: |
      URL or JSON object for schema detection in multi-tenant system.
      Can be: "https://app.com" or {"refererUrl": "https://app.com"}
    example: "http://localhost:3000/"
```

### 4. Role Permissions Clarification

Current OpenAPI implies owners have admin access, but they don't:

**Add to documentation:**
- `admin` role: Full system access, all schemas
- `owner` role: Manage own client applications only
- `user` role: Basic user operations in assigned schema

## Files to Update

### Primary File:
`docs/core-components/OpenAPI-Specs.yaml`

### Consider Creating:
`docs/core-components/multi-tenant-architecture.md` - Explain schema detection, tenant isolation

## Specific Changes Needed

### 1. Update ClientServer Schema
```yaml
ClientServer:
  type: object
  required:
    - app_name
    - allowed_return_urls
  properties:
    client_id:
      type: string
      description: Unique client identifier (generated)
      example: "client_f47ac10b58cc4372a567"
    client_secret:
      type: string
      description: Client secret (only returned on registration)
    app_name:
      type: string
      description: Human-readable application name
    identifier_url:
      type: string
      format: uri
      description: Primary URL for schema detection (defaults to first allowed_return_url)
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
      description: URLs authorized for schema detection (defaults to allowed_return_urls)
    allowed_return_urls:
      type: array
      items:
        type: string
        format: uri
      description: OAuth redirect URLs
    assigned_schema_name:
      type: string
      description: PostgreSQL schema assigned to this client
      example: "client_myapp_1234567890"
    owner_id:
      type: string
      format: uuid
      description: User ID of the client owner
```

### 2. Update Password Fields
Everywhere password is used, update description:
```yaml
password:
  type: string
  minLength: 8
  pattern: '^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$'
  description: |
    Password must be at least 8 characters and contain:
    - At least one uppercase letter
    - At least one lowercase letter  
    - At least one digit
  example: "Password123"
```

### 3. Add Global Header Parameter
```yaml
components:
  parameters:
    SchemaContext:
      name: X-Schema-Context
      in: header
      required: false  # Required for multi-tenant ops, optional for auth_internal
      schema:
        type: string
      description: |
        URL or JSON for multi-tenant schema detection.
        Required when operating on tenant-specific data.
        Format: URL string or {"refererUrl": "URL"}
```

### 4. Update Endpoint Descriptions
For each endpoint, clarify which role can access:
- `/api/admin/*` - Requires 'admin' role
- `/api/owner/*` - Requires 'owner' role (owns the client)
- `/api/users/*` - Depends on schema context

## Additional Documentation Needed

### 1. Multi-Tenant Architecture
Create a section explaining:
- How schema detection works
- When X-Schema-Context is required
- Schema naming conventions
- Tenant isolation principles

### 2. Role Permissions Matrix
Create a clear table:
| Endpoint Pattern | Admin | Owner | User |
| ---------------- | ----- | ----- | ---- |
| /api/admin/*     | ✓     | ✗     | ✗    |
| /api/owner/*     | ✓     | ✓*    | ✗    |
| /api/users/*     | ✓     | ✗     | ✓    |

*Owner can only manage their own clients

## Reference Materials
- Backend test analysis: `backend/.agents/backend-test-analysis-summary.md`
- Database schema: `db/sql/schemas/auth_internal_complete.sql`
- Alignment analysis: `backend/test-api-schema-alignment.md`

## Success Criteria
- All database-required fields documented in OpenAPI
- Password complexity requirements clear
- X-Schema-Context header documented
- Role permissions explicitly defined
- No ambiguity about required vs optional fields

## Testing Your Changes
1. Validate OpenAPI spec syntax
2. Check that all example values match validation patterns
3. Ensure field names match exactly with database
4. Verify required/optional field designations

Remember: Accurate documentation prevents implementation confusion and test failures. 