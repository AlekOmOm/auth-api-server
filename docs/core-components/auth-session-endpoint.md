# `/api/auth/session` Endpoint

## Purpose

Returns the **current authentication & authorization context** of the caller. This endpoint serves as the **single source of truth** for:

- **Auth-System frontend**: Owner/admin dashboard authentication
- **Client applications**: Route protection and user authorization  
- **Automated tests**: Session validation and debugging
- **Monitoring systems**: Authentication health checks

## OpenAPI Specification

**Reference**: [`OpenAPI-Specs.yaml:280-320`](OpenAPI-Specs.yaml)

```yaml
/auth/session:
  get:
    summary: Get current session
    security:
      - sessionAuth: []
    responses:
      '200':
        description: Session retrieved successfully
        content:
          application/json:
            schema:
              allOf:
                - $ref: '#/components/schemas/ApiResponse'
                - type: object
                  properties:
                    data:
                      $ref: '#/components/schemas/User'
```

## Route Definition

```javascript
Method:  GET
URL:     /api/auth/session
Auth:    Cookie-based session (sessionAuth)
Returns: 200 – JSON user details (OpenAPI User schema)
         401 – Not authenticated / session expired
         403 – Session exists but revoked
```

## Implementation Stack

```javascript
app.get("/api/auth/session",
  detectSchema,        // Multi-tenant schema detection
  requireAuthSession,  // Session validation middleware
  authController.me    // Response assembly
)
```

**Middleware Flow**:
1. `detectSchema` – Determines tenant context from session/referer
2. `requireAuthSession` – Validates session exists and is active
3. `authController.me` – Assembles OpenAPI-compliant response

## Response Format

### Success Response (200)
**Aligned with OpenAPI `User` schema**:

```json
{
  "message": "User retrieved successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Alice",
    "email": "alice@example.com", 
    "role": "user",
    "schema": "client_trading_sim",
    "authorized_urls": [
      "https://trading-sim.com",
      "https://trading-sim.com/app"
    ]
  }
}
```

### Error Responses

| Status  | Condition            | Response Body                      |
| ------- | -------------------- | ---------------------------------- |
| **401** | No session / expired | `{ "error": "NOT_AUTHENTICATED" }` |
| **403** | Session revoked      | `{ "error": "SESSION_REVOKED" }`   |

## Implementation Details

### Controller Logic
**File**: `backend/src/controllers/auth.js`

```javascript
export async function me(req, res) {
  const schema = getSchemaFromRequest(req);          // From detectSchema
  const user = await usersRepo.getById(schema, req.session.userId);
  const client = await clientServersRepo.getBySchema(schema);

  res.json({
    message: "User retrieved successfully",
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,          // OpenAPI enum: user|admin|owner
      schema: schema,           // Tenant identifier
      authorized_urls: client?.authorized_urls || []
    }
  });
}
```

### Schema-Aware Data Retrieval
```javascript
// User data from correct tenant schema
const user = await db.query(`
  SELECT id, name, email, role 
  FROM ${ident(schema)}.users 
  WHERE id = $1
`, [req.session.userId]);

// Client URLs from auth_internal (if client tenant)
const client = await db.query(`
  SELECT authorized_urls 
  FROM auth_internal.client_servers 
  WHERE assigned_schema_name = $1
`, [schema]);
```

## Multi-Tenant Behavior

### Auth-System Users (Owner/Admin)
```json
// Schema: auth_internal
{
  "data": {
    "role": "owner",
    "schema": "auth_internal", 
    "authorized_urls": []  // No client URLs for owners
  }
}
```

### Client App Users  
```json
// Schema: client_trading_sim
{
  "data": {
    "role": "user",
    "schema": "client_trading_sim",
    "authorized_urls": ["https://trading-sim.com", "https://trading-sim.com/app"]
  }
}
```

## Client Integration

### Frontend Session Check
```javascript
// Auth-System frontend (Svelte)
import { authStore } from '../stores/authStore.js';

async function checkSession() {
  const response = await fetch('/api/auth/session', {
    credentials: 'include'  // Include session cookie
  });
  
  if (response.ok) {
    const sessionData = await response.json();
    authStore.update({
      isAuthenticated: true,
      user: sessionData.data  // OpenAPI User schema
    });
  }
}
```

### Client Application Integration
```javascript
// Client app route protection
async function checkAuth() {
  const response = await fetch('https://auth.example.com/api/auth/session', {
    credentials: 'include'
  });
  
  if (response.ok) {
    const { data } = await response.json();
    
    // Check if current URL is authorized
    const currentUrl = window.location.origin + window.location.pathname;
    const isAuthorized = data.authorized_urls.some(url => 
      currentUrl.startsWith(url)
    );
    
    if (!isAuthorized) {
      // Redirect to auth system or show access denied
      window.location.href = 'https://auth.example.com/login';
    }
    
    return data; // User info for app use
  } else {
    // Not authenticated, redirect to login
    window.location.href = 'https://auth.example.com/login';
  }
}
```

## Authorization Pattern

### Why Include `authorized_urls`?

The session endpoint returns `authorized_urls` to enable **client-side route protection**:

1. **Efficiency**: Client apps can validate access without additional API calls
2. **Offline capability**: URLs cached for route guard decisions
3. **Real-time updates**: Session refresh gets updated URL permissions
4. **Security**: Server-controlled URL permissions, not client-controlled

### Route Protection Example
```javascript
// Client app router guard
function canAccessRoute(requestedPath, authorizedUrls) {
  const fullUrl = `${window.location.origin}${requestedPath}`;
  return authorizedUrls.some(url => fullUrl.startsWith(url));
}

// Usage in route guard
if (!canAccessRoute('/admin', userData.authorized_urls)) {
  throw new Error('Access denied');
}
```

## Testing & Debugging

### Manual Testing
```bash
# Test unauthenticated
curl -i https://auth.example.com/api/auth/session
# Expected: 401 NOT_AUTHENTICATED

# Test with session cookie (after login)
curl -i -b cookies.txt https://auth.example.com/api/auth/session
# Expected: 200 with user data
```

### Automated Testing
```javascript
// Test session endpoint
test('should return user data for authenticated session', async () => {
  const session = await createTestSession('owner', 'auth_internal');
  
  const response = await request(app)
    .get('/api/auth/session')
    .set('Cookie', session.cookie);
    
  expect(response.status).toBe(200);
  expect(response.body.data.role).toBe('owner');
  expect(response.body.data.schema).toBe('auth_internal');
});
```

### Debug Information
```javascript
// Add to controller for debugging
console.log('Session endpoint debug:', {
  sessionId: req.session.sessionId,
  schema: req.schema,
  userId: req.session.userId,
  userRole: user.role
});
```

## Performance Considerations

### Caching Strategy
- **Session data**: Cached in Express session store
- **User data**: Database query per request (real-time accuracy)
- **Client URLs**: Cached in client applications

### Response Time
- **Typical**: 50-100ms (database query + JSON serialization)
- **Optimization**: Consider caching user data for high-traffic scenarios

## Security Features

### Session Validation
- **HTTP-only cookies**: Prevents XSS access to session data
- **CSRF protection**: SameSite cookie configuration
- **Secure transmission**: HTTPS enforcement in production
- **Schema isolation**: Users can only access their tenant data

### Data Exposure
- **No sensitive data**: Password hashes never included
- **Minimal user info**: Only necessary fields for authorization
- **Controlled URLs**: Only authorized URLs exposed to client

## Error Handling

### Common Error Scenarios
```javascript
// Session expired
if (!session || session.expires_at < new Date()) {
  return res.status(401).json({ error: "NOT_AUTHENTICATED" });
}

// User not found (data integrity issue)
if (!user) {
  return res.status(401).json({ error: "NOT_AUTHENTICATED" });
}

// Session revoked (security)
if (session.revoked) {
  return res.status(403).json({ error: "SESSION_REVOKED" });
}
```

---

**Bottom Line**: This endpoint provides both authentication verification ("Who are you?") and authorization context ("Where can you go?") in a single, efficient call that aligns with the OpenAPI specification and supports the multi-tenant architecture.