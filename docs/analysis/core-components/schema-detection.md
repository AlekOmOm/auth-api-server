# Schema Detection Middleware

## Purpose

Automatically determine **which PostgreSQL schema and connection pool context** a request should operate against based on the request source and user type. This is the core of the multi-tenant design – ensuring data isolation between client applications and auth-system operations.

```
┌─────────────┐    HTTP Request     ┌─────────────────┐
│  Browser /  │  ─────────────────▶ │ detectSchema()  │
│   Client    │                    │  middleware     │
└─────────────┘                    └────────┬────────┘
                                            │
                 decides poolContext & schema│
                                            ▼
                               req.session.{ poolContext, schema }
                                            │
                                            ▼
                            Down-stream routers / services
```

## Detection Logic (Priority Order)

1. **Existing authenticated session** – Preserve current schema context
2. **User Type Detection** – Auth-system vs client app user determination
3. **URL-based Detection** – Referer header matching for client apps
4. **Fallback** – Default to template schema

## User Type Detection

### Registration Flow
**File**: `frontend/src/routes/card/Register.svelte:20-26`

```javascript
// Auto-detect user type based on return URL presence
if (storedReturnUrl) {
  userType = 'client';      // Client App User
} else {
  userType = 'auth';        // Auth System Owner  
}
```

### User Type Mapping

| User Type | Target Schema   | Pool Context    | Description                           |
| --------- | --------------- | --------------- | ------------------------------------- |
| `auth`    | `auth_internal` | `AUTH_INTERNAL` | Owner/admin managing client apps      |
| `client`  | `client_*`      | `CLIENT_TENANT` | User of a specific client application |

### URL Detection for Client Apps

**File**: `frontend/src/routes/card/Register.svelte:86-94`

When users arrive from client applications:
1. **Referer header** contains originating client app URL
2. **Match against** `auth_internal.client_servers`:
   - `identifier_url` (exact match)
   - `authorized_urls` array (prefix match)
3. **Schema assigned** from `assigned_schema_name`

## Detection Sources (Priority Order)

1. **Existing Session** – if user already logged in, preserve schema context
2. **User Type (Registration)** – `userType='auth'` → `auth_internal`
3. **Referer Header** – match client app URLs → tenant schema  
4. **Query Parameter** – explicit `identifierUrl` parameter
5. **Fallback** – default to `client_template`

## Pool Context Types

| Context         | Schema Example       | Use Case                       |
| --------------- | -------------------- | ------------------------------ |
| `AUTH_INTERNAL` | `auth_internal`      | Owner panel, client management |
| `CLIENT_TENANT` | `client_trading_sim` | Client app users               |
| `DEFAULT`       | `client_template`    | Fallback/unmatched requests    |

**File**: `backend/src/utils/pool.js`

## Runtime Artifacts

After successful detection:

```javascript
req.session.poolContext   // POOL_CONTEXTS.AUTH_INTERNAL, etc.
req.session.schema        // "auth_internal" or "client_trading_sim"
req.session.poolMetadata  // Helper data (client_id, user_role, etc.)

// Convenience accessor
req.schema = req.session.schema
```

## Implementation Files

- **Main Middleware**: `backend/src/middleware/detection.js`
- **Pool Contexts**: `backend/src/utils/pool.js`
- **Frontend Logic**: `frontend/src/routes/card/Register.svelte`

### Key Exports

```javascript
export const detectSchema               // Main middleware
export const detectSchemaFromReturnUrl  // URL-based detection
export const getSchemaFromRequest       // Utility for controllers
```

## Detection Flow

```mermaid
flowchart TD
    A[Incoming Request] --> B{Existing Session?}
    B -->|yes| C[Preserve session schema]
    B -->|no| D[Check user registration type]
    D --> E{userType = 'auth'?}
    E -->|yes| F[AUTH_INTERNAL + auth_internal]
    E -->|no| G{Referer header present?}
    G -->|yes| H[Lookup client_servers by URLs]
    H -->|found| I[CLIENT_TENANT + tenant schema]
    H -->|not found| J[DEFAULT + client_template]
    G -->|no| J
    --> K[next()]
```

## Client Registration Query

```sql
-- Match referer against registered client URLs
SELECT client_id, assigned_schema_name, authorized_urls
FROM auth_internal.client_servers
WHERE 
  $1 LIKE (identifier_url || '%') OR 
  $1 = ANY(authorized_urls);
```

The middleware performs:
```javascript
const referer = req.headers.referer;
const match = 
  referer.startsWith(client.identifier_url) ||
  client.authorized_urls.some(url => referer.startsWith(url));
```

## Auth-System User Detection

### Direct Access (No Referer)
```
User visits: https://auth.example.com/register
Result: userType='auth' → auth_internal schema
```

### Client App Redirect
```
User clicks login on: https://trading-sim.com/app
Referer: https://trading-sim.com/app
Result: userType='client' → client_trading_sim schema
```

## Error & Fallback Handling

- **No match found**: Request uses `DEFAULT` context with `client_template` schema
- **Invalid schema**: Fallback to template schema
- **Database errors**: Graceful fallback with logging

## Security Notes

- Schema values are **server-side only** – never trust client data
- **Owner/admin** users are always routed to `auth_internal`
- **Complete isolation** between tenant schemas
- **SQL injection protection** via parameterized queries

## Usage in Controllers

```javascript
import { getSchemaFromRequest } from "../middleware/detection.js";

export async function getUsers(req, res) {
  const schema = getSchemaFromRequest(req);  // "client_trading_sim"
  const users = await db.query(`
    SELECT * FROM ${ident(schema)}.users WHERE active = true
  `);
  res.json(users);
}
```

## Configuration

### Environment Variables
```bash
SEED_SCHEMA=client_template  # Fallback schema name
```

### Database Requirements
- `auth_internal.client_servers` table with URL configurations
- Per-tenant schemas created dynamically
- `client_template` schema as fallback

## Troubleshooting

### Common Issues
1. **Wrong schema detected**: Check `authorized_urls` configuration
2. **Fallback schema used**: Verify referer header and URL matching
3. **Cross-tenant access**: Validate middleware execution order
4. **Auth-system users in wrong schema**: Check `userType` logic

### Debug Information
```javascript
console.log('Schema Detection:', {
  referer: req.headers.referer,
  userType: req.body.userType,
  detectedSchema: req.schema,
  poolContext: req.session.poolContext
});
``` 