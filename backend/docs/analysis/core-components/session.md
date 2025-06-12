# Session Management Documentation

## Overview

The Auth-System uses **session-based authentication** for all user-facing interactions. This provides secure, scalable, and user-friendly authentication experience with multi-tenant isolation.

## Authentication Method

### 🧑‍💻 User Authentication (All Users)
- **Method**: Express Sessions with PostgreSQL storage
- **Use Case**: All web application users (owners, admins, client app users)
- **Storage**: Session data persisted in tenant-specific PostgreSQL schemas
- **Benefits**: Secure by default, automatic session management, easy logout, multi-tenant isolation

## Session Architecture

### Session Storage Strategy
```
Primary Storage: PostgreSQL sessions in tenant-specific schemas
Tenant Isolation: Each schema maintains independent session storage
Schema Selection: Determined by detection middleware based on user type/URL
```

### Session Flow Diagram
```
User Login → Schema Detected → Session Created → Session Enhanced → Database Stored
     ↓           ↓              ↓               ↓              ↓
 Credentials → Tenant Info → Database Record → Full Session → Schema Storage

Session Validation:
Request → detectSchema → PostgreSQL lookup → Session validation
```

### Session Data Structure
```javascript
// Aligned with OpenAPI User schema
session = {
  userId: "user_123",           // Authenticated user ID  
  role: "user|owner|admin",     // User role from OpenAPI enum
  schema: "client_app_123",     // Database schema (tenant identifier)
  sessionId: "session_uuid",    // Unique session identifier
  isAuthenticated: true,        // Authentication status
  authorized_urls: ["https://client.com/dashboard"], // From client_servers table
}
```

### Session Storage by Schema
```
auth_internal.sessions        // Owner/admin sessions
client_trading_sim.sessions   // Trading sim user sessions  
client_another_app.sessions   // Another client app sessions
```

## Session Lifecycle

### 1. Session Creation (Login)
```javascript
// Location: backend/src/controllers/auth.js
const sessionId = uuidv4();
session.userId = user.id;
session.role = user.role;
session.schema = detectedSchema;

// Save to correct tenant schema
await db.createSession(schema, [user.id, sessionId, expires_at]);
```

### 2. Session Validation (Middleware)
```javascript
// Every request validates session in correct schema:
const validateSession = async (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  const schema = req.schema; // from detectSchema middleware
  
  const session = await db.getSession(schema, sessionId);
  
  if (!session || !session.userId) {
    throw new AuthError("Authentication required");
  }
  
  req.session = session;
  next();
};
```

### 3. Session Enhancement (Schema Detection)
Sessions automatically include tenant schema information via the **detectSchema middleware**:

- **Auth-System Direct Access**: No referer → `auth_internal` schema
- **Client App Redirect**: Referer matches `authorized_urls` → client schema  
- **Existing Session**: Preserves existing schema from session data
- **Fallback**: Uses `client_template` schema for unmatched requests

**Implementation**: `backend/src/middleware/detection.js`

### 4. Session Destruction (Logout)
```javascript
// Location: backend/src/services/session.js
// Remove from correct tenant schema
await db.deleteSessionByUserId(schema, session.userId);
session.destroy();
```

## Frontend Session Management

### Session Store (Svelte)
```javascript
// Location: frontend/src/stores/authStore.js
const authStore = {
  isAuthenticated: false,
  user: null,
  session: null,
  loading: true
};

// Session check via OpenAPI-compliant endpoint
async function checkSession() {
  const sessionData = await fetchGet('/api/auth/session');
  
  if (sessionData && sessionData.data) {
    set({ 
      isAuthenticated: true, 
      user: sessionData.data,  // OpenAPI User schema
      session: sessionData,
      loading: false 
    });
  }
}
```

### Session Endpoints
- **GET `/api/auth/session`** - Check current session status (OpenAPI compliant)
- **POST `/api/auth/login`** - Create new session
- **POST `/api/auth/logout`** - Destroy current session
- **POST `/api/auth/register`** - Register and optionally create session

### Session Persistence
- Sessions persist across browser refreshes
- Automatic session validation on app startup
- Graceful handling of expired sessions
- Schema-aware session management

## Multi-Tenant Session Isolation

### Tenant-Specific Session Storage
Each tenant maintains independent session storage:

```sql
-- Auth-System sessions
auth_internal.sessions

-- Client application sessions  
client_trading_sim.sessions
client_ecommerce.sessions
```

### Schema Detection for Sessions
**File**: `backend/src/middleware/detection.js`

1. **Existing Session**: Preserve current schema
2. **URL Detection**: Match referer to `authorized_urls`
3. **User Type**: Auth-system users → `auth_internal`
4. **Fallback**: Default to `client_template`

## Security Features

### Session Security
- **HTTP-Only Cookies**: Prevents XSS attacks
- **Secure Flag**: HTTPS-only transmission in production
- **SameSite Protection**: CSRF prevention
- **Session Rotation**: New session ID on privilege changes
- **Tenant Isolation**: Schema-based session separation

### Session Validation
- Server-side session verification
- Database session tracking for monitoring
- Automatic cleanup of expired sessions
- Schema validation prevents cross-tenant access

### Tenant Isolation
- Each session bound to specific database schema
- Complete data isolation between tenants
- Schema validation in all database operations
- No cross-tenant session access possible

## Database Session Management

### Session Table Schema (Per Tenant)
```sql
-- Per-tenant session storage
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

### Session Operations
```javascript
// Schema-aware session operations
class SessionService {
  async createSession(schema, userId, sessionId) {
    await db.query(`
      INSERT INTO ${ident(schema)}.sessions 
      (user_id, session_id, expires_at) 
      VALUES ($1, $2, $3)
    `, [userId, sessionId, expiresAt]);
  }

  async getSession(schema, sessionId) {
    const result = await db.query(`
      SELECT * FROM ${ident(schema)}.sessions 
      WHERE session_id = $1 AND expires_at > NOW()
    `, [sessionId]);
    return result.rows[0];
  }

  async deleteSession(schema, sessionId) {
    await db.query(`
      DELETE FROM ${ident(schema)}.sessions 
      WHERE session_id = $1
    `, [sessionId]);
  }
}
```

## Configuration

### Express Session Configuration
```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

### Environment Variables
```bash
SESSION_SECRET=your-secure-session-secret
NODE_ENV=production|development
SEED_SCHEMA=client_template  # Fallback schema
```

## OpenAPI Alignment

### Session Response Format
The `/api/auth/session` endpoint returns data matching the OpenAPI `User` schema:

```javascript
// Aligned with OpenAPI-Specs.yaml User schema
{
  "message": "User retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "email",
    "role": "user|admin|owner",  // OpenAPI enum
    "schema": "string",          // Tenant identifier  
    "authorized_urls": ["string"] // Client access URLs
  }
}
```

## Best Practices

### Session Management
1. **Always validate sessions** on protected routes
2. **Regenerate session IDs** after login/privilege changes  
3. **Clean up expired sessions** regularly
4. **Use secure session configuration** in production
5. **Maintain tenant isolation** in all operations

### Error Handling
```javascript
const validateSession = async (req, res, next) => {
  try {
    const session = await getSessionFromDB(req.schema, req.sessionId);
    
    if (!session || !session.userId) {
      throw new AuthError("Authentication required");
    }
    
    req.session = session;
    next();
  } catch (error) {
    res.status(401).json({ error: "NOT_AUTHENTICATED" });
  }
};
```

### Testing Sessions
```javascript
// Mock session for testing
const mockSession = {
  userId: 1,
  role: 'user', 
  schema: 'test_schema'
};

// Test session validation
const testSession = async () => {
  const session = await sessionService.createSession('test_schema', 'user_123');
  const retrieved = await sessionService.getSession('test_schema', session.sessionId);
  assert(retrieved.userId === 'user_123');
};
```

## Troubleshooting

### Common Issues
1. **Session not persisting**: Check cookie configuration
2. **Schema not detected**: Verify middleware order
3. **Session expired**: Check session timeout settings
4. **Cross-tenant access**: Validate schema isolation
5. **Login redirect loops**: Check schema detection logic

### Debug Session Data
```javascript
console.log('Session data:', {
  userId: session.userId,
  role: session.role,
  schema: session.schema,
  authenticated: !!session.userId
});
```

---

**Note**: The Auth-System uses session-based authentication for all user interactions, providing secure multi-tenant isolation through schema-based session storage. This approach aligns with the OpenAPI specification and supports the core multi-tenant architecture. 