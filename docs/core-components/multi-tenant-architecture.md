# Multi-Tenant Architecture

## Overview

The Auth System implements a multi-tenant architecture using PostgreSQL schemas to provide complete data isolation between different client applications. Each client application gets its own dedicated schema with isolated user data, sessions, and authentication records.

## Schema Detection

The system uses intelligent schema detection to determine which tenant's data to access:

### 1. X-Schema-Context Header

The primary method for schema detection is the `X-Schema-Context` header. This header can contain:

- **URL String**: `"https://myapp.com"`
- **JSON Object**: `{"refererUrl": "https://myapp.com"}`

Example:
```http
POST /api/auth/login
X-Schema-Context: http://localhost:3000/
Content-Type: application/json

{
  "credentials": {
    "email": "user@example.com",
    "password": "Password123"
  }
}
```

### 2. Automatic Detection

When the X-Schema-Context header is not provided, the system attempts to detect the schema using:

1. **Referer Header**: Extracts the domain from the HTTP Referer
2. **Client Registration URLs**: Matches against `identifier_url` or `authorized_urls` in the client_servers table
3. **Default Schema**: Falls back to `auth_internal` for system operations

## When X-Schema-Context is Required

The header is **required** for:
- User authentication in client schemas (`/auth/login`, `/auth/register`)
- Accessing tenant-specific user data
- Any operation that needs to identify which client's data to access

The header is **optional** for:
- Operations in the `auth_internal` schema
- Admin operations that span multiple schemas
- Public endpoints like client registration

## Schema Naming Conventions

Client schemas follow a strict naming pattern:
```
client_<app_name>_<timestamp>
```

Example: `client_trading_sim_1736123456789`

This ensures:
- Unique schema names
- Easy identification of client ownership
- Chronological ordering

## Tenant Isolation

Each client schema contains isolated tables:
- `users`: Client-specific user accounts
- `sessions`: Active user sessions
- `refresh_tokens`: Authentication tokens
- `login_attempts`: Security tracking

## Role-Based Access

### System-Wide Roles (auth_internal)
- **admin**: Full system access, can manage all schemas
- **owner**: Can manage their own client applications
- **user**: Basic user in auth_internal

### Client Schema Roles
- **admin**: Administrative access within the client schema
- **user**: Standard user access

## Security Considerations

1. **Complete Isolation**: No cross-schema queries are allowed at the database level
2. **Schema Validation**: All schema names are validated before use
3. **SQL Injection Protection**: Schema identifiers are properly escaped
4. **Access Control**: Role-based permissions enforce who can access which schemas

## Client Registration Flow

When a new client registers:

1. Client provides `app_name` and `allowed_return_urls`
2. System generates:
   - Unique `client_id`
   - Secure `client_secret`
   - Schema name: `client_<app_name>_<timestamp>`
3. Database creates new schema with required tables
4. URLs are stored for schema detection:
   - `identifier_url`: Primary URL (defaults to first allowed_return_url)
   - `authorized_urls`: All URLs for schema detection

## Best Practices

1. **Always Include X-Schema-Context**: When building client applications, always include this header for consistent behavior
2. **Use HTTPS**: Schema detection relies on URLs, ensure all URLs use HTTPS in production
3. **Validate Return URLs**: Only register URLs you control to prevent schema hijacking
4. **Handle Schema Errors**: Implement proper error handling for schema detection failures

## Error Handling

Common schema-related errors:

- **400 Bad Request**: Schema could not be determined and no valid default exists
- **403 Forbidden**: User doesn't have access to the requested schema
- **404 Not Found**: Schema doesn't exist or has been deleted

Example error response:
```json
{
  "message": "Schema could not be determined for the request, and default schema is invalid or not configured.",
  "errors": []
}
``` 