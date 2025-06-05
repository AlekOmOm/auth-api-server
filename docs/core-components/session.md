# Session Management Documentation

## Overview

The Auth-System uses **session-based authentication** with **Redis caching enhancement** for all user-facing interactions and **JWT tokens** only for server-to-server API communication. This provides a secure, scalable, high-performance, and user-friendly authentication experience.

## Authentication Methods by Use Case

### 🧑‍💻 User Authentication (Frontend ↔ Backend)
- **Method**: Express Sessions with hybrid storage (PostgreSQL + Redis cache)
- **Use Case**: Web application users, admin interfaces
- **Storage**: Session data cached in Redis for performance, persisted in PostgreSQL for audit
- **Benefits**: Sub-10ms session validation, automatic session management, secure by default, easy logout

### 🔧 API Authentication (Server ↔ Server)
- **Method**: JWT tokens
- **Use Case**: Client applications calling Auth-System APIs
- **Storage**: Stateless tokens with embedded client information
- **Benefits**: Stateless, scalable for API-to-API communication

## Enhanced Session Architecture

### Session Storage Strategy (Hybrid)
```
Primary Storage: PostgreSQL sessions in tenant schemas (audit trail, admin queries)
Cache Layer: Redis for fast validation (performance optimization)
Tenant Isolation: Both PostgreSQL and Redis maintain schema-based isolation
```

### Session Flow Diagram (Enhanced)
```
User Login → Session Created → Schema Detected → Session Enhanced → Redis Cached
     ↓             ↓              ↓               ↓              ↓
 Credentials → Database Record → Tenant Info → Full Session → Cache Entry

Session Validation:
Redis Cache (fast) → PostgreSQL (fallback) → Update Cache
```

### Session Data Structure
```javascript
session = {
  userId: "user_123",           // Authenticated user ID
  role: "user|owner|admin",     // User role/permissions/owner
  schema: "client_app_123",     // Database schema (tenant)
  ownerId: "owner_123",         // Owner ID
  sessionId: "session_uuid",    // Unique session identifier
  isAuthenticated: true,        // Authentication status
  allowedUrls: ["https://client.com/dashboard", "https://client.com/profile"], // Allowed URLs
}
```

### Redis Session Keys (Tenant Isolation)
```
sess:auth_internal:uuid-session-id-1
sess:client_trading_sim:uuid-session-id-2  
sess:client_another_app:uuid-session-id-3
```

## Enhanced Session Lifecycle

### 1. Session Creation (Login) - Enhanced
```javascript
// Location: backend/src/services/session/hybrid-session.service.js
const sessionId = uuidv4();
session.userId = user.id;
session.role = user.role;

// Save to PostgreSQL (existing audit trail)
await db.createSession(schema, [user.id, sessionId]);

// Cache in Redis (new performance layer)
await redis.setex(`sess:${schema}:${sessionId}`, 86400, JSON.stringify(session));
```

### 2. Session Validation (Middleware) - Enhanced
```javascript
// Every request checks Redis first, falls back to PostgreSQL:
const validateSession = async (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  const schema = req.schema; // existing schema detection
  
  // Fast path: Check Redis cache first
  let session = await redis.get(`sess:${schema}:${sessionId}`);
  
  // Fallback: Query PostgreSQL if cache miss
  if (!session) {
    session = await db.getSession(schema, sessionId);
    if (session) {
      // Populate cache for next request
      await redis.setex(`sess:${schema}:${sessionId}`, 86400, JSON.stringify(session));
    }
  }
  
  if (!session || !session.userId) {
    throw new AuthError("Authentication required");
  }
  
  req.session = session;
  next();
};
```

### 3. Session Enhancement (Schema Detection) - Unchanged
Sessions automatically include tenant schema information. This is primarily handled by the **Frontend URL Detection** mechanism when a user initiates a login flow:

- **Frontend Login (Browser-based)**:
  - The auth-system inspects the **`Referer`** HTTP header from the client application
  - If the `Referer` URL matches a registered `identifier_url` or any of the `authorized_urls` for a client in `auth_internal.client_servers`, that client's `assigned_schema_name` is used
  - Alternatively, clients can explicitly provide an `identifierUrl` query parameter (e.g., `https://auth.example.com/login?identifierUrl=https://client.com`)
  - This ensures users from `https://trading-sim.com/dashboard` or `/trade` are correctly identified as belonging to the trading sim tenant
- **API-Auth-Server**: Schema extracted from JWT token (for server-to-server communication)
- **Default**: Falls back to `process.env.SEED_SCHEMA` or the auth_internal schema if no match is found

### 4. Session Destruction (Logout) - Enhanced
```javascript
// Location: backend/src/services/session/hybrid-session.service.js
// Remove from both Redis cache and PostgreSQL
await redis.del(`sess:${schema}:${sessionId}`);
await db.deleteSessionByUserId(schema, session.userId);
session.destroy();
```

## Performance Enhancements

### Session Validation Performance
- **Redis Cache Hit**: <10ms response time
- **PostgreSQL Fallback**: 50-100ms response time
- **Cache Population**: Automatic on database hits
- **TTL Management**: 24-hour cache expiry with PostgreSQL as source of truth

### Tenant Isolation in Redis
```javascript
// Redis keys maintain schema-based isolation
const getSessionKey = (schema, sessionId) => {
  return `sess:${schema}:${sessionId}`;
};

// Example keys:
// sess:auth_internal:abc-123-def
// sess:client_trading_sim:xyz-456-uvw
// sess:client_ecommerce:mno-789-pqr
```

## Frontend Session Management

### Session Store (Svelte) - Enhanced
```javascript
// Location: frontend/src/stores/authStore.js
const authStore = {
  isAuthenticated: false,
  user: null,
  session: null,           // NEW: session metadata
  sessionExpiry: null,     // NEW: session expiry tracking
  loading: true
};

// Enhanced session check with performance monitoring
async function checkSession() {
  const startTime = performance.now();
  const sessionData = await fetchGet('/api/auth/session');
  const endTime = performance.now();
  
  console.log(`Session validation took ${endTime - startTime}ms`);
  
  if (sessionData && sessionData.data) {
    set({ 
      isAuthenticated: true, 
      user: sessionData.data, 
      session: sessionData.session,
      sessionExpiry: sessionData.expires_at,
      loading: false 
    });
  }
}

// NEW: Session refresh functionality
async function refreshSession() {
  const response = await fetch('/api/auth/session');
  if (response.ok) {
    const sessionData = await response.json();
    authStore.update(store => ({
      ...store,
      session: sessionData,
      sessionExpiry: sessionData.expires_at
    }));
  }
}
```

### Session Endpoints - Enhanced
- **GET `/api/auth/session`** - Check current session status and get user data (now <10ms with Redis)
- **GET `/api/auth/me`** - Alternative endpoint for current user (non-admin only)
- **GET `/api/auth/admin`** - Admin-only endpoint for current user
- **POST `/api/auth/sessions`** - Get all sessions for current user

### Session Persistence
- Sessions persist across browser refreshes
- Automatic session validation on app startup (now much faster)
- Graceful handling of expired sessions
- **NEW**: Performance monitoring for session operations

## JWT vs Session Clarification

### Current Implementation Status
The codebase uses a **hybrid approach** with **Redis enhancement**:

1. **User Authentication (Frontend)**: Uses Express sessions with Redis caching
   - Location: `hybrid-session.service.js` and `authStore.js`
   - Method: Session cookies with Redis cache + PostgreSQL storage
   - Performance: Sub-10ms validation with audit trail preservation

2. **Client-Server API Authentication**: Uses JWT tokens (unchanged)
   - Location: `clientServerService.js`
   - Method: Stateless JWT tokens for server-to-server communication
   - Only used when client applications authenticate with the Auth-System

### Why This Enhanced Approach Makes Sense
- **Sessions for Users**: Better UX, easier logout, secure by default, now with Redis performance
- **JWT for APIs**: Stateless, scalable for distributed systems
- **Schema in Both**: Both authentication methods include tenant schema information
- **Hybrid Storage**: Redis for speed, PostgreSQL for compliance and admin queries

## Security Features

### Enhanced Session Security
- **HTTP-Only Cookies**: Prevents XSS attacks
- **Secure Flag**: HTTPS-only transmission
- **SameSite Protection**: CSRF prevention
- **Session Rotation**: New session ID on privilege changes
- **Redis TTL**: Automatic cache expiry prevents stale sessions
- **Tenant Isolation**: Redis keys maintain schema-based isolation

### Session Validation (Enhanced)
- Server-side session verification with Redis acceleration
- Database session tracking for active monitoring (unchanged)
- Automatic cleanup of expired sessions in both Redis and PostgreSQL

### Tenant Isolation (Enhanced)
- Each session is bound to a specific database schema (unchanged)
- Redis keys include schema name for cache isolation
- Complete data isolation between tenants in both storage layers
- Schema validation prevents cross-tenant data access

## Database Session Management

### Session Table Schema (Unchanged)
```sql
-- Per-tenant session storage (existing, preserved)
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

### Enhanced Session Operations
```javascript
// Enhanced hybrid operations
class HybridSessionService {
  async createSession(schema, userId, sessionId) {
    // Save to PostgreSQL (audit trail)
    await db.createSession(schema, [userId, sessionId]);
    
    // Cache in Redis (performance)
    await redis.setex(`sess:${schema}:${sessionId}`, 86400, JSON.stringify(session));
  }

  async getSession(schema, sessionId) {
    // Try Redis first
    let session = await redis.get(`sess:${schema}:${sessionId}`);
    if (session) return JSON.parse(session);
    
    // Fallback to PostgreSQL
    session = await db.getSession(schema, sessionId);
    if (session) {
      // Populate cache
      await redis.setex(`sess:${schema}:${sessionId}`, 86400, JSON.stringify(session));
    }
    return session;
  }

  async deleteSession(schema, sessionId) {
    // Remove from both stores
    await redis.del(`sess:${schema}:${sessionId}`);
    await db.deleteSession(schema, sessionId);
  }
}
```

## Configuration

### Enhanced Express Session Configuration
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

### Enhanced Environment Variables
```bash
# Existing session configuration (preserved)
SESSION_SECRET=your-secure-session-secret
NODE_ENV=production|development
JWT_SECRET=your-jwt-secret  # Only for client-server API auth

# NEW: Redis configuration for session caching
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_SESSION_PREFIX=sess:
SESSION_HYBRID_MODE=true
```

## API vs User Authentication Comparison (Enhanced)

| Aspect          | Enhanced User Sessions        | API JWT               |
| --------------- | ----------------------------- | --------------------- |
| **Use Case**    | Web users, admin              | Server-to-server APIs |
| **State**       | Stateful (hybrid storage)     | Stateless             |
| **Storage**     | Redis cache + PostgreSQL      | Client holds token    |
| **Performance** | <10ms (Redis) / 50-100ms (DB) | N/A (stateless)       |
| **Expiry**      | 24 hours with TTL             | 24 hours (fixed)      |
| **Revocation**  | Immediate (both stores)       | Token expiry only     |
| **Scaling**     | Redis distributed cache       | Fully distributed     |
| **Security**    | HTTP-only cookies + TTL       | Bearer tokens         |
| **Audit Trail** | PostgreSQL preserved          | None                  |

## Best Practices (Enhanced)

### Session Management
1. **Always validate sessions** on protected routes (now faster with Redis)
2. **Regenerate session IDs** after login/privilege changes
3. **Clean up expired sessions** in both Redis and PostgreSQL
4. **Use secure session configuration** in production
5. **Monitor cache hit rates** for performance optimization
6. **Maintain tenant isolation** in Redis keys

### Error Handling (Enhanced)
```javascript
// Enhanced session error handling with fallback
const validateSession = async (req, res, next) => {
  try {
    // Try Redis first
    let session = await getSessionFromCache(req.schema, req.sessionId);
    
    if (!session) {
      // Fallback to PostgreSQL
      session = await getSessionFromDB(req.schema, req.sessionId);
      if (session) await cacheSession(req.schema, session);
    }
    
    if (!session || !session.userId) {
      throw new AuthError("Authentication required");
    }
    
    req.session = session;
    next();
  } catch (error) {
    // Graceful degradation - continue with PostgreSQL only
    console.warn('Redis cache error, falling back to PostgreSQL:', error);
    const session = await getSessionFromDB(req.schema, req.sessionId);
    if (!session) throw new AuthError("Authentication required");
    req.session = session;
    next();
  }
};
```

### Testing Sessions (Enhanced)
```javascript
// Mock session for testing (unchanged)
const mockSession = {
  userId: 1,
  role: 'user',
  schema: 'test_schema'
};

// NEW: Test Redis caching
const testSessionCache = async () => {
  const session = await hybridService.createSession('test_schema', 'user_123');
  const cached = await hybridService.getSession('test_schema', session.sessionId);
  assert(cached.userId === 'user_123');
};
```

## Troubleshooting (Enhanced)

### Common Issues
1. **Session not persisting**: Check cookie configuration
2. **Schema not detected**: Verify middleware order
3. **Session expired**: Check session timeout settings
4. **Cross-tenant access**: Validate schema isolation in both Redis and PostgreSQL
5. **NEW: Cache misses**: Check Redis connectivity and TTL configuration
6. **NEW: Performance issues**: Monitor Redis hit rates and connection pool

### Debug Session Data (Enhanced)
```javascript
// Enhanced session debugging
console.log('Session data:', {
  userId: session.userId,
  role: session.role,
  schema: session.schema,
  authenticated: !!session.userId,
  source: session._cacheHit ? 'redis' : 'postgresql', // NEW
  responseTime: session._responseTime // NEW
});
```

### Redis Health Check
```javascript
// NEW: Redis connection monitoring
const checkRedisHealth = async () => {
  try {
    await redis.ping();
    console.log('✅ Redis connection healthy');
  } catch (error) {
    console.warn('⚠️ Redis unavailable, using PostgreSQL only:', error);
  }
};
```

## Migration and Rollback

### Deployment Strategy
1. **Phase 1**: Deploy Redis infrastructure (no code changes)
2. **Phase 2**: Deploy hybrid session service (backward compatible)
3. **Phase 3**: Enable Redis caching (gradual rollout)

### Rollback Procedure
```javascript
// Disable Redis by environment variable
if (process.env.SESSION_HYBRID_MODE !== 'true') {
  // System operates exactly as before with PostgreSQL only
  return await getSessionFromDB(schema, sessionId);
}
```

### Zero Downtime Migration
- Redis caching can be enabled/disabled without system restart
- All existing functionality preserved during migration
- Performance monitoring validates enhancement benefits

---

**Note**: The Auth-System's enhanced hybrid approach (Redis-cached sessions for users, JWT for APIs) provides optimal performance while maintaining the security and audit capabilities of the existing system. The enhancement is fully backward compatible and can be disabled without any system impact.
