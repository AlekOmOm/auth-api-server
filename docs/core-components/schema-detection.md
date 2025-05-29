# Schema Detection Middleware

## Purpose

Automatically determine **which PostgreSQL schema and connection pool context** a request should operate against based on who is calling the Auth-System and how they are calling it.

This is the *heart* of the multi-tenant design – every request must be routed to the correct tenant-specific schema so that data remains isolated between client applications.

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

## Detection Sources (priority order)

1. **Existing authenticated session** – if a user is already logged-in we keep the context that is stored in the session cookie.
2. **Browser Referer header** – for frontend login flows, the middleware inspects the `Referer` header and matches it against:
   - The client's registered `identifier_url` (exact match)
   - Any URL in the client's `authorized_urls` array (prefix match)
   - Optionally, an explicit `identifierUrl` query parameter can override the Referer
3. **Bearer JWT** – used in *api-auth-server* mode.  The JWT embeds the tenant schema (handled by `detectSchemaFromApiToken`).
4. **User role** – if the caller is an **owner** or **admin** we force the `auth_internal` schema.
5. **Fallback** – default to `process.env.SEED_SCHEMA || 'client_template'` (usually an empty template schema).

## Runtime Artefacts

After successful detection these three values are guaranteed to exist:

```js
req.session.poolContext // one of POOL_CONTEXTS.*
req.session.schema      // e.g. "client_acme_corp"
req.session.poolMetadata// assorted helper data (client_id, user_role …)

// Convenience mirror for services that don't have access
req.schema = req.session.schema
```

## Pool Context Enum

| Constant | Description |
|----------|-------------|
| `AUTH_INTERNAL` | Auth-System core & management (admins / owners) |
| `CLIENT_TENANT` | Browser users of a client application |
| `API_CLIENT`    | Server-to-server JWT calls |
| `DEFAULT`       | Fallback when nothing matches |

## Main Files

```
backend/src/middleware/detection.js         ← **detectSchema** orchestrator
backend/src/utils/pool.js                   ← POOL_CONTEXTS enum
```

Key exported helpers:

```js
export const detectSchema               // Combined middleware (app.use)
export const detectSchemaFromReturnUrl  // Sub-middleware (returnUrl)
export const detectSchemaFromApiToken   // Sub-middleware (JWT)
export const getSchemaFromRequest       // Utility used by controllers
```

## High-level Flow (simplified)

```mermaid
flowchart TD
    A[Incoming Express request] --> B{Is user already authenticated?}
    B -->|yes| C[Preserve session schema]
    B -->|no| D{Referer header or identifierUrl param?}
    D -->|yes| E[lookup auth_internal.client_servers\nby identifier_url or authorized_urls]
    E -->|found| F[set CLIENT_TENANT + tenant schema]
    D -->|no| G{Bearer token present?}
    G -->|yes| H[verifyApiToken -> schema]
    H -->|valid| I[set API_CLIENT + tenant schema]
    G -->|no| J{User role == owner/admin?}
    J -->|owner or admin| K[set AUTH_INTERNAL + auth_internal]
    J -->|none| L[set DEFAULT + client_template]
    --> M[next()]
```

## Query Used for `identifier_url` / Referer Matching

```sql
SELECT *
FROM auth_internal.client_servers  -- core registry
UNION ALL
SELECT * FROM public.client_servers -- optionally public mirror
```
The middleware then performs matching against `identifier_url` and `authorized_urls`:
```js
const referer = req.headers.referer;
const match =
  referer.startsWith(client.identifier_url) ||
  client.authorized_urls.some((url) => referer.startsWith(url));
```

## Error & Fallback Handling
* If no match is found the request proceeds with the **DEFAULT** context – the template schema is isolated and contains no real data.
* Invalid / expired JWT tokens are ignored and fallback applies.

## Security Notes
* All tenant-extracted values are stored **server-side** in the session – never trust client data alone.
* Administrators & owners are always forced into the `auth_internal` schema to avoid accidental cross-tenant data access.

---

### Quick Reference for Developers

```js
// Use inside any controller / service
import { getSchemaFromRequest } from "../middleware/detection.js";

const schema = getSchemaFromRequest(req);  // e.g. "client_trading_sim"
await pool.query(`SELECT * FROM ${ident(schema)}.users WHERE id = $1`, [id]);
``` 