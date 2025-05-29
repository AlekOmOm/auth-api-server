# Front-End URL Detection (identifier_url & authorized_urls)

## Purpose
When a browser user is redirected from a client application to the Auth-System's `/login` page we need to know **which tenant they belong to** so that:

1. The correct database schema is selected (see *Schema Detection*).
2. After successful authentication we can safely redirect the user to the client's **`entry_point_url`**.

This component inspects the **`Referer`** header (or an optional `identifierUrl` query param) and maps it to the corresponding `client_servers` record.

## Core Idea
Every client application registers three things:

| Column | Purpose |
|--------|---------|
| `identifier_url` | Unique base URL that identifies the client (e.g. `https://trading-sim.com/trading`) |
| `entry_point_url`| Where the user should be sent *after* a successful login |
| `authorized_urls`| Array of additional URLs that are allowed to initiate the login flow |

```sql
INSERT INTO auth_internal.client_servers (
  client_id, app_name, client_secret_hash,
  identifier_url, entry_point_url, authorized_urls, assigned_schema_name
) VALUES (
  'trading_sim', 'Trading Sim', '...',
  'https://trading-sim.com/trading',
  'https://trading-sim.com/trading',
  ARRAY['https://trading-sim.com', 'https://trading-sim.com/app'],
  'client_trading_sim'
);
```

## Detection Logic (simplified)
```js
const referer = req.headers.referer;
const matchingClient = allClients.find((client) =>
  referer.startsWith(client.identifier_url) ||
  client.authorized_urls.some((url) => referer.startsWith(url))
);
```
If a client is found we attach its schema; otherwise the request proceeds in the **DEFAULT** context.

## Request / Redirect Lifecycle
```
Client ↔ Auth-System
──────────────────────────────────────────────────────────
1. User clicks "Login" → SPA redirects to https://auth.example.com/login (no params needed)
2. The login page POSTs credentials to /api/auth/login
3. detectSchema() uses the Referer header to find the tenant
4. Credentials validated → session created in tenant schema
5. Server responds 200 { redirect: client.entry_point_url }
6. Frontend redirects browser back to entry_point_url
```

> **Note:** Step 1 must originate from either `identifier_url` *or* one of the `authorized_urls` otherwise the login will fall back to default tenant (and will usually fail).

## Security Considerations
1. **Allow-list only** – no wildcard domains.
2. **Exact prefix match** – prevents open redirect attacks.
3. **HTTPS recommended** – validation can enforce `https://` in production.
4. **Separation of concerns** – The client never decides the redirect target; the server returns the trusted `entry_point_url`.

## Testing
```bash
# Positive test (originating from authorized URL)
curl -H "Referer: https://trading-sim.com/app" -X POST \
     https://auth.example.com/api/auth/login -d '{"email":"u","password":"p"}'

# Negative test – unknown origin
curl -H "Referer: https://evil.com" -X POST …   # falls back / 401
```

---

See also: *docs/components/schema-detection.md* for how the selected schema is used downstream. 