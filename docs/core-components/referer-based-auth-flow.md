# Referer Header-Based Authentication Flow

## Overview
The auth-system uses the browser's `Referer` header to automatically detect which client application a user belongs to when they're redirected to the login page. This enables seamless multi-tenant authentication without requiring explicit parameters.

## How It Works

### 1. Client Configuration
Each client application registers these URLs in `auth_internal.client_servers`:
```sql
INSERT INTO auth_internal.client_servers (
  client_id, 
  identifier_url,      -- Primary URL that identifies the client
  entry_point_url,     -- Where to redirect after successful login
  authorized_urls,     -- Additional URLs that can initiate login
  assigned_schema_name -- Database schema for this tenant
) VALUES (
  'trading_sim',
  'https://trading-sim.com',
  'https://trading-sim.com/app',
  ARRAY['https://trading-sim.com/dashboard', 'https://trading-sim.com/trade'],
  'client_trading_sim'
);
```

### 2. Authentication Flow

```
User on Client App → Redirects to Auth System → Login → Redirect Back
```

1. **User accesses protected route** (e.g., `https://trading-sim.com/dashboard`)
2. **Client app checks authentication**:
   ```js
   const res = await fetch("/api/auth/session", { credentials: "include" });
   if (res.status !== 200) {
     // Redirect to auth-system login
     window.location.replace("https://auth.example.com/login");
   }
   ```
3. **Browser sends Referer header** automatically:
   ```
   GET https://auth.example.com/login
   Referer: https://trading-sim.com/dashboard
   ```
4. **Auth-system detects tenant**:
   - Checks if `Referer` matches any client's `identifier_url` or `authorized_urls`
   - Sets the correct database schema (`client_trading_sim`)
5. **User logs in** with credentials
6. **Session created** in the correct tenant schema
7. **Redirect to client's entry_point_url**

### 3. Key Benefits

- **No query parameters needed** - The Referer header is automatic
- **Works from any page** - Deep links like `/dashboard` or `/trade` work if included in `authorized_urls`
- **Secure by default** - Server-side validation prevents spoofing
- **Seamless UX** - Users don't see or worry about tenant selection

### 4. Fallback Options

If Referer header is not available (rare cases):
```js
// Client can explicitly specify its identifier
const identifierUrl = encodeURIComponent("https://trading-sim.com");
window.location.replace(`https://auth.example.com/login?identifierUrl=${identifierUrl}`);
```

### 5. Security Considerations

- **Prefix matching** prevents subdomain hijacking
- **HTTPS required** in production to ensure Referer is sent
- **Allowlist only** - Only registered URLs are accepted
- **Server-side validation** - Client never controls the redirect destination

## Implementation Details

The detection happens in the schema detection middleware:
- `backend/src/middleware/detection.js` - Main detection logic
- `docs/core-components/frontend-url-detection.md` - Detailed component docs
- `docs/core-components/schema-detection.md` - Complete middleware documentation

## Testing

```bash
# Test with curl including Referer header
curl -H "Referer: https://trading-sim.com/dashboard" \
     -X GET https://auth.example.com/login

# The auth-system will detect this as coming from the trading_sim tenant
``` 