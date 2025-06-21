# Backend Architecture Clarification: Schema Detection & Client Server Management

## Overview
This document clarifies the expected behavior of schema detection and client server management in the Auth System's multi-tenant architecture. The backend developer has made significant progress (10/18 tests passing) but needs clarification on the remaining architectural concepts.

## Part 1: Schema Detection Architecture

### Core Concept
The Auth System uses **PostgreSQL schemas** for tenant isolation. Each client application gets its own schema, and the middleware automatically routes requests to the correct schema based on various detection methods.

### Schema Types

| Schema Name                 | Purpose                   | Example                                               |
| --------------------------- | ------------------------- | ----------------------------------------------------- |
| `auth_internal`             | Auth system owners/admins | `auth_internal.users`, `auth_internal.client_servers` |
| `client_template`           | Template/fallback schema  | Used when no specific client detected                 |
| `client_{name}_{timestamp}` | Tenant-specific schemas   | `client_tradingsimulator_1748187540074`               |

### Detection Priority Order

1. **API Token** (highest priority)
   - Header: `Authorization: Bearer <token>`
   - Token obtained from `/clientServer/handshake`
   - Directly maps to client's assigned schema

2. **X-Schema-Context Header**
   - Can be JSON: `{"refererUrl": "https://trading-sim.com"}`
   - Or direct URL: `"https://trading-sim.com"`
   - Used by tests to simulate client context

3. **Explicit Referer URL** (body/query params)
   - `req.body.refererUrl` or `req.query.refererUrl`
   - Used during registration flows

4. **HTTP Referer Header**
   - Standard browser header
   - Automatically sent by browsers

5. **Session Schema** (if logged in)
   - Preserved from initial detection
   - Stored in `req.session.schema`

### Why Tests Are Failing

The test sends `X-Schema-Context: "http://localhost:3000/"` but this URL isn't registered to any client server. The detection logic:

1. Looks for a client_server with `identifier_url` or `authorized_urls` matching the provided URL
2. If found, uses that client's `assigned_schema_name`
3. If not found, falls back to `client_template`

**Current Issue**: No client server is registered with `http://localhost:3000/` as an authorized URL, so schema detection can't determine which tenant schema to use.

## Part 2: Client Server Management

### Registration Flow

#### 1. Public Registration (`POST /clientServer/register`)
```javascript
// Expected fields
{
  "app_name": "Trading Simulator",
  "allowed_return_urls": ["https://app.com", "https://app.com/callback"],
  "identifier_url": "https://app.com",      // MISSING in current implementation
  "authorized_urls": ["https://app.com/*"], // MISSING in current implementation
  "client_mode": "frontend-login-proxy"     // OPTIONAL but recommended
}
```

**Current Issue**: The model expects `identifier_url` and `authorized_urls` for URL-based schema detection, but the test/controller only sends `app_name` and `allowed_return_urls`.

#### 2. Database Schema Creation
When a client registers, the system should:
1. Generate unique `client_id` and `client_secret`
2. Create a new PostgreSQL schema: `client_{sanitized_app_name}_{timestamp}`
3. Apply DDL templates to create tables in the new schema
4. Store the mapping in `auth_internal.client_servers`

#### 3. URL Matching Logic
```sql
-- The detection query looks for:
SELECT * FROM auth_internal.client_servers WHERE
  $1 LIKE (identifier_url || '%') OR    -- URL starts with identifier
  $1 = ANY(authorized_urls)             -- URL in authorized list
```

### Required Model Fields

The `ClientServer` model needs these fields for proper operation:

| Field                  | Purpose                       | Example                                     |
| ---------------------- | ----------------------------- | ------------------------------------------- |
| `client_id`            | Unique identifier             | `client_f47ac10b58cc4372a567`               |
| `client_secret`        | Authentication secret         | `550e8400-e29b-41d4-a716`                   |
| `app_name`             | Human-readable name           | `Trading Simulator`                         |
| `identifier_url`       | Primary URL for detection     | `https://trading-sim.com`                   |
| `authorized_urls`      | Additional URLs for detection | `["https://trading-sim.com/*"]`             |
| `allowed_return_urls`  | OAuth redirect URLs           | `["https://trading-sim.com/callback"]`      |
| `assigned_schema_name` | PostgreSQL schema             | `client_tradingsimulator_123`               |
| `client_mode`          | Operation mode                | `frontend-login-proxy` or `api-auth-server` |
| `owner_id`             | User who created it           | `user123` (from session)                    |

### Service Function Expectations

#### `register()` function should:
1. Validate all required fields
2. Generate `client_id` and `client_secret`
3. Create `assigned_schema_name`
4. Create the PostgreSQL schema
5. Apply DDL templates to new schema
6. Insert record into `auth_internal.client_servers`
7. Return complete client data

#### `registerClientServerForUser()` should:
1. Extract `userId` from session
2. Set `identifier_url` from first `allowed_return_url` if not provided
3. Set `authorized_urls` from `allowed_return_urls` if not provided
4. Call main `register()` function with enriched data

## Part 3: Fixing Remaining Test Failures

### 1. Schema Detection for Registration
**Problem**: Test expects schema detection during registration but provides no registered URL

**Solution Options**:
- A) Register a client with `http://localhost:3000/` as authorized URL before tests
- B) Update test to use a registered client's URL in X-Schema-Context
- C) Handle registration differently when no client context detected

### 2. Client Server Field Mapping
**Problem**: Field name mismatches between API and database

**Fix in service layer**:
```javascript
// Map API fields to model fields
const clientData = {
  app_name: req.body.app_name,
  identifier_url: req.body.identifier_url || req.body.allowed_return_urls[0],
  authorized_urls: req.body.authorized_urls || req.body.allowed_return_urls,
  allowed_return_urls: req.body.allowed_return_urls,
  client_mode: req.body.client_mode || 'frontend-login-proxy'
};
```

### 3. Schema Creation Process
**Problem**: Schema creation not implemented

**Fix**: Add schema creation to service:
```javascript
// After creating client record
const schemaName = clientServer.assigned_schema_name;
await schemaService.createSchema(schemaName);
await schemaService.applyTemplate(schemaName, 'client_template');
```

### 4. Owner Stats Query
**Problem**: Function name mismatch in repository

**Fix**: Either rename the function in the repository or update the service to use the correct name:
```javascript
// In ownerPanel service
const stats = await clientServerRepo.getOwnerStatistics(ownerId);
// OR rename in repo from getTotalOwnerStats to getOwnerStatistics
```

## Summary

The Auth System implements a sophisticated multi-tenant architecture where:

1. **Schema Detection** automatically routes requests to the correct PostgreSQL schema based on client context
2. **Client Server Management** handles registration and management of tenant applications
3. **URL-based Detection** matches incoming requests to registered clients

The remaining test failures stem from:
- Missing field mappings between API and model layers
- Incomplete schema creation during client registration
- Test data not matching expected detection patterns
- Minor function naming inconsistencies

With these clarifications, the backend developer can complete the remaining fixes to achieve 100% test success. 