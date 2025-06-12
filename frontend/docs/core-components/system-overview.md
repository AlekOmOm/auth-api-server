# Auth-System Core Components Overview

## System Architecture

The Auth-System is a **multi-tenant authentication and authorization system** that supports:

- **Multi-tenant isolation** via PostgreSQL schemas
- **Session-based authentication** for web users
- **URL-based tenant detection** for seamless client app integration
- **Owner Panel management** for client application lifecycle

## Core Principles

1. **Multi-tenant**: Each client application gets isolated database schema
2. **Multi-schema**: Database separation ensures complete tenant isolation  
3. **Owner Panel Management**: Auth-system users register → login → manage client-servers
4. **URL Management**: Client apps configured via URLs in Owner Panel
5. **Easy Client Integration**: Single session endpoint for authorization verification

## User Types & Detection Logic

### User Types (determined during registration)

**Registration determines user type via `userType` field:**
- **File**: `frontend/src/routes/card/Register.svelte:31-36`

```javascript
userType = 'client'  // Client App User (default if returnUrl present)
userType = 'auth'    // Auth System Owner (default if no returnUrl)
```

### Detection Cases

| Case                   | Source                                | Schema            | User Type       | Context         |
| ---------------------- | ------------------------------------- | ----------------- | --------------- | --------------- |
| **URL Detection**      | Referer header or identifierUrl param | `client_*`        | `user`          | `CLIENT_TENANT` |
| **Auth-System Direct** | No referer, userType='auth'           | `auth_internal`   | `owner`/`admin` | `AUTH_INTERNAL` |
| **Existing Session**   | Session cookie                        | From session      | From session    | From session    |
| **None (Fallback)**    | No match                              | `client_template` | N/A             | `DEFAULT`       |

**Implementation**: `backend/src/middleware/detection.js`

## Component Index

### 1. Session Management
**File**: [`session.md`](session.md)

- **Lines 1-50**: Session architecture overview
- **Lines 51-100**: Session data structure and lifecycle
- **Lines 101-150**: Performance enhancements with Redis caching
- **Lines 200-250**: Frontend session store integration
- **Lines 300-350**: Security features and tenant isolation

**Key Implementation**:
- Session storage: PostgreSQL + Redis cache
- Session endpoint: `/api/auth/session` (lines 250-280)
- Frontend store: `frontend/src/stores/authStore.js`

### 2. URL Management & Owner Panel
**File**: [`frontend-url-detection.md`](frontend-url-detection.md)

- **Lines 1-25**: URL detection purpose and client registration
- **Lines 26-50**: Detection logic and matching algorithm
- **Lines 51-77**: Request/redirect lifecycle

**Client Registration**:
```sql
-- Lines 12-22 in frontend-url-detection.md
INSERT INTO auth_internal.client_servers (
  identifier_url,    -- Unique identifier URL
  entry_point_url,   -- Post-login redirect target
  authorized_urls    -- Array of allowed initiating URLs
);
```

**Owner Panel URLs**:
- Registration: `frontend/src/routes/card/Register.svelte:86-94` (account type selection)
- Management: `/owner` route (accessed after owner login)
- Client creation: Owner Panel → Create Client Server functionality

### 3. Multi-Schema Architecture  
**File**: [`schema-detection.md`](schema-detection.md)

- **Lines 1-30**: Schema detection purpose and flow diagram
- **Lines 31-60**: Detection sources (priority order)
- **Lines 61-90**: Pool contexts and runtime artifacts
- **Lines 91-124**: Implementation details and security

**Schema Types**:
- `auth_internal`: Owner/admin accounts and client registrations
- `client_*`: Tenant-specific user data and sessions
- `client_template`: Fallback schema for unmatched requests

### 4. Session Endpoint (Authorization Verification)
**File**: [`auth-session-endpoint.md`](auth-session-endpoint.md)

- **Lines 1-20**: Endpoint purpose and consumers
- **Lines 21-40**: Route definition and handler stack  
- **Lines 41-60**: Implementation details
- **Lines 61-87**: Error responses and integration examples

**Single Source of Truth**: `/api/auth/session`
- **Consumed by**: Auth-System frontend, all client applications, tests
- **Returns**: User details + `authorized_urls` for client-side route protection
- **Format**: Aligned with OpenAPI `User` schema

## Authentication Flow Examples

### Auth-System Owner Registration/Login
```
1. User visits auth-system directly (no referer)
   └─ Detection: No referer → userType='auth' → auth_internal schema
2. User registers with userType='auth' 
   └─ Creates owner account in auth_internal.users
3. Owner logs in → session in auth_internal schema
4. Owner accesses /owner panel → manages client-servers
```

### Client App User Authentication  
```
1. User clicks "Login" on https://trading-sim.com/app
   └─ Detection: Referer matches authorized_urls → client_trading_sim schema
2. User registers with userType='client'
   └─ Creates user account in client_trading_sim.users  
3. User logs in → session in client_trading_sim schema
4. Redirect to entry_point_url with session cookie
```

## Configuration References

### OpenAPI Specification
**File**: [`OpenAPI-Specs.yaml`](OpenAPI-Specs.yaml)
- **Lines 50-80**: User schema with multi-tenant fields
- **Lines 150-200**: Authentication endpoints
- **Lines 300-350**: Session endpoint specification
- **Lines 400-450**: Client server management endpoints

### Database Schemas
**Auth-System Schema**: `db/sql/schemas/auth_internal_complete.sql`
- **Lines 15-25**: Owner/admin users table
- **Lines 35-45**: Client servers registry
- **Lines 25-35**: Auth-system sessions

**Client Schema Template**: `db/sql/schemas/client_server_template.sql`
- Template for tenant-specific schemas
- Created dynamically per client application

## Implementation Status

### Current (Production Ready)
✅ **Session-based authentication** for all web users  
✅ **Multi-tenant schema detection** via URL/referer  
✅ **Owner Panel registration** and login flows  
✅ **Client application URL management**  
✅ **Session endpoint** for authorization verification  

### Future Implementation  
🔄 **JWT tokens** - Reserved for server-to-server API authentication  
🔄 **Redis caching** - Performance enhancement for session validation  
🔄 **Admin role** - System-wide administration capabilities  

## Integration Guide

### For Client Applications
1. **Register** client app with auth-system owner
2. **Configure** `identifier_url`, `entry_point_url`, `authorized_urls`
3. **Redirect** login attempts to auth-system with proper referer
4. **Verify** authorization via `/api/auth/session` endpoint
5. **Check** `authorized_urls` for client-side route protection

### For Auth-System Development
1. **Session management**: Use `authStore.js` and session middleware
2. **Schema detection**: Implement `detectSchema` middleware
3. **URL management**: Configure via Owner Panel interface
4. **Multi-tenancy**: Always use schema-aware database queries

## Troubleshooting Guide

### Common Issues
- **Login redirects to login page**: Check schema detection logic
- **Session not persisting**: Verify cookie configuration and session storage
- **Wrong tenant data**: Validate schema detection middleware order
- **URL detection failing**: Confirm client `authorized_urls` configuration

### Debug Locations
- **Session data**: `req.session` after `detectSchema` middleware
- **Schema detection**: Console logs in `backend/src/middleware/detection.js`
- **Frontend auth**: Browser storage and `authStore` state
- **URL matching**: Database queries in client_servers table 