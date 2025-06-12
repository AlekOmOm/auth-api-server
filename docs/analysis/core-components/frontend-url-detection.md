# Frontend URL Detection & Client App Management

## Purpose

The Auth-System automatically detects which tenant a user belongs to based on the **URL they came from**. This enables:

1. **Correct schema selection** for database operations
2. **Secure redirect** back to the client application after authentication
3. **Owner Panel management** of client application URLs

## Core URL Configuration

Every client application registered in the Owner Panel has three URL configurations:

| URL Type          | Purpose                                 | Example                                                        |
| ----------------- | --------------------------------------- | -------------------------------------------------------------- |
| `identifier_url`  | Primary URL that identifies the client  | `https://trading-sim.com/app`                                  |
| `entry_point_url` | Where users return after login          | `https://trading-sim.com/dashboard`                            |
| `authorized_urls` | Additional URLs that can initiate login | `["https://trading-sim.com", "https://trading-sim.com/login"]` |

**Storage**: `auth_internal.client_servers` table
**Management**: Via Owner Panel interface

## URL Detection Logic

### Browser Login Flow
```
1. User on client app (https://trading-sim.com/app) clicks "Login"
2. Browser redirects to: https://auth.example.com/login
3. Auth-System detects Referer: https://trading-sim.com/app
4. Matches against client_servers.authorized_urls or identifier_url
5. Sets schema to client_trading_sim
6. After login, redirects to entry_point_url
```

### Detection Implementation
**File**: `backend/src/middleware/detection.js`

```javascript
const referer = req.headers.referer;
const matchingClient = allClients.find(client =>
  referer.startsWith(client.identifier_url) ||
  client.authorized_urls.some(url => referer.startsWith(url))
);

if (matchingClient) {
  req.session.schema = matchingClient.assigned_schema_name;
}
```

## Owner Panel URL Management

### Client Registration
**Frontend**: Owner Panel → Create Client Application

```sql
-- Created via Owner Panel
INSERT INTO auth_internal.client_servers (
  client_id, 
  app_name,
  identifier_url,        -- Primary identifier
  entry_point_url,       -- Post-login destination  
  authorized_urls,       -- Array of allowed origins
  assigned_schema_name   -- Tenant schema
) VALUES (
  'trading_sim',
  'Trading Simulator',
  'https://trading-sim.com/app',
  'https://trading-sim.com/dashboard', 
  ARRAY['https://trading-sim.com', 'https://trading-sim.com/login'],
  'client_trading_sim'
);
```

### URL Management Features
- **Add/Edit URLs**: Owner can modify `authorized_urls` via Owner Panel
- **Change Entry Point**: Update where users land after login
- **URL Validation**: Ensure URLs are valid and secure
- **Multiple Origins**: Support multiple domains/subdomains per client

## Request Lifecycle Examples

### Auth-System Owner Access
```
1. Owner visits: https://auth.example.com/register (no referer)
2. userType = 'auth' → auth_internal schema
3. Registration creates owner account
4. Login redirects to: https://auth.example.com/owner
```

### Client App User Access
```  
1. User visits: https://trading-sim.com/app
2. Clicks "Login" → redirects with Referer header
3. URL matches authorized_urls → client_trading_sim schema  
4. Registration/login in tenant context
5. Redirect to: https://trading-sim.com/dashboard
```

### Explicit URL Parameter
```
Alternative: https://auth.example.com/login?identifierUrl=https://trading-sim.com
- Overrides Referer header detection
- Useful for server-side redirects
```

## Security Features

### URL Validation
- **Whitelist only**: No wildcard domains allowed
- **Exact prefix matching**: Prevents open redirect attacks
- **HTTPS enforcement**: Production validation  
- **Owner-controlled**: Only authenticated owners can modify URLs

### Protection Against Attacks
```javascript
// Safe prefix matching prevents attacks
const isValidOrigin = authorizedUrls.some(url => 
  referer.startsWith(url) && 
  referer.length > url.length ? referer[url.length] === '/' : true
);
```

## Owner Panel Implementation

### URL Configuration Interface
**Location**: `/owner` route after owner authentication

**Features**:
- List all client applications
- Add new client with URL configuration
- Edit existing client URLs
- Validate URL formats
- Test URL matching

### Frontend Registration Logic
**File**: `frontend/src/routes/card/Register.svelte:16-26`

```javascript
// Auto-detect user context
if (storedReturnUrl) {
  userType = 'client';    // From client app 
} else {
  userType = 'auth';      // Direct auth-system access
}
```

## API Integration

### Client App Setup
```javascript
// Client app login button
function redirectToAuth() {
  // Simple redirect - referer automatically set
  window.location.href = 'https://auth.example.com/login';
}

// Alternative with explicit URL
function redirectToAuthExplicit() {
  const identifierUrl = encodeURIComponent('https://trading-sim.com/app');
  window.location.href = `https://auth.example.com/login?identifierUrl=${identifierUrl}`;
}
```

### Post-Login Integration
```javascript
// Client app checks authentication
fetch('https://auth.example.com/api/auth/session', {
  credentials: 'include'  // Include session cookie
}).then(response => {
  if (response.ok) {
    // User authenticated, session includes authorized_urls
    const userData = await response.json();
    // userData.data.authorized_urls contains client's allowed URLs
  }
});
```

## Configuration Examples

### Single Domain Client
```sql
identifier_url: 'https://trading-sim.com'
entry_point_url: 'https://trading-sim.com/dashboard'  
authorized_urls: ['https://trading-sim.com']
```

### Multi-Domain Client
```sql
identifier_url: 'https://app.example.com'
entry_point_url: 'https://app.example.com/home'
authorized_urls: [
  'https://app.example.com',
  'https://www.example.com', 
  'https://example.com/login'
]
```

### Development vs Production
```sql
-- Development
authorized_urls: ['http://localhost:3000', 'http://localhost:5173']

-- Production  
authorized_urls: ['https://app.example.com', 'https://www.example.com']
```

## Troubleshooting

### Common Issues
1. **Login redirects to wrong place**: Check `entry_point_url` configuration
2. **Schema not detected**: Verify referer URL in `authorized_urls`
3. **CORS issues**: Ensure auth-system allows client domain
4. **URL mismatch**: Check exact URL formatting and paths

### Debug Information
```javascript
console.log('URL Detection Debug:', {
  referer: req.headers.referer,
  identifierUrl: req.query.identifierUrl,
  matchedClient: matchingClient?.app_name,
  assignedSchema: req.session.schema
});
```

### Testing URLs
```bash
# Test client app origin
curl -H "Referer: https://trading-sim.com/app" \
     https://auth.example.com/api/auth/session

# Test explicit URL parameter  
curl "https://auth.example.com/login?identifierUrl=https://trading-sim.com"
```

---

**Integration Summary**: Client applications simply redirect to the auth-system login page. The referer header automatically identifies the tenant, handles authentication in the correct schema, and redirects back to the configured entry point. The Owner Panel provides a user-friendly interface for managing all URL configurations. 