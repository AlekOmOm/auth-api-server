# Session Management Documentation

## Overview

The Auth-System uses **session-based authentication** for all user-facing interactions and **JWT tokens** only for server-to-server API communication. This provides a secure, scalable, and user-friendly authentication experience.

## Authentication Methods by Use Case

### 🧑‍💻 User Authentication (Frontend ↔ Backend)
- **Method**: Express Sessions with server-side storage
- **Use Case**: Web application users, admin interfaces
- **Storage**: Session data stored in memory/Redis with session cookies
- **Benefits**: Automatic session management, secure by default, easy logout

### 🔧 API Authentication (Server ↔ Server)
- **Method**: JWT tokens
- **Use Case**: Client applications calling Auth-System APIs
- **Storage**: Stateless tokens with embedded client information
- **Benefits**: Stateless, scalable for API-to-API communication

## Session Architecture

### Session Flow Diagram
```
User Login → Session Created → Schema Detected → Session Enhanced
     ↓             ↓              ↓               ↓
 Credentials → Database Record → Tenant Info → Full Session Data
```

### Session Data Structure
```javascript
session = {
  userId: "user_123",           // Authenticated user ID
  role: "user|admin",           // User role/permissions
  schema: "client_app_123",     // Database schema (tenant)
  sessionId: "session_uuid",    // Unique session identifier
  isAuthenticated: true         // Authentication status
}
```

## Session Lifecycle

### 1. Session Creation (Login)
```javascript
// Location: backend/src/services/auth.js - login()
const sessionId = uuidv4();
session.userId = user.id;
session.role = user.role;
// Schema already set by middleware
await db.createSession(schema, [user.id, sessionId]);
```

### 2. Session Validation (Middleware)
```javascript
// Every request checks:
if (!session || !session.userId) {
  throw new AuthError("Authentication required");
}
```

### 3. Session Enhancement (Schema Detection)
Sessions automatically include tenant schema information:
- **Frontend-Login-Proxy**: Schema detected from `return_url` parameter
- **API-Auth-Server**: Schema extracted from JWT token
- **Default**: Falls back to admin schema

### 4. Session Destruction (Logout)
```javascript
// Location: backend/src/services/auth.js - logout()
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
  loading: true
};

// Session check on app initialization
async function checkSession() {
  const sessionData = await fetchGet('/api/auth/session');
  // Returns: { message: "User retrieved successfully", data: { id, name, role, email } }
  if (sessionData && sessionData.data) {
    set({ isAuthenticated: true, user: sessionData.data, loading: false });
  }
}
```

### Session Endpoints
- **GET `/api/auth/session`** - Check current session status and get user data
- **GET `/api/auth/me`** - Alternative endpoint for current user (non-admin only)
- **GET `/api/auth/admin`** - Admin-only endpoint for current user
- **POST `/api/auth/sessions`** - Get all sessions for current user

### Session Persistence
- Sessions persist across browser refreshes
- Automatic session validation on app startup
- Graceful handling of expired sessions

## JWT vs Session Clarification

### Current Implementation Status
Your observation is correct! The codebase currently uses a **hybrid approach**:

1. **User Authentication (Frontend)**: Uses Express sessions
   - Location: `auth.js` service and `authStore.js`
   - Method: Session cookies and server-side session storage
   - All user login/logout operations use `req.session`

2. **Client-Server API Authentication**: Uses JWT tokens
   - Location: `clientServerService.js`
   - Method: Stateless JWT tokens for server-to-server communication
   - Only used when client applications authenticate with the Auth-System

### Why This Makes Sense
- **Sessions for Users**: Better UX, easier logout, secure by default
- **JWT for APIs**: Stateless, scalable for distributed systems
- **Schema in Both**: Both authentication methods include tenant schema information

### Consistency Recommendation
✅ **Keep the current approach** - it's actually a best practice:
- Use sessions for web user authentication
- Use JWT only for API-to-API authentication
- Both methods seamlessly integrate with the schema detection middleware

## Security Features

### Session Security
- **HTTP-Only Cookies**: Prevents XSS attacks
- **Secure Flag**: HTTPS-only transmission
- **SameSite Protection**: CSRF prevention
- **Session Rotation**: New session ID on privilege changes

### Session Validation
- Server-side session verification on every request
- Database session tracking for active monitoring
- Automatic cleanup of expired sessions

### Tenant Isolation
- Each session is bound to a specific database schema
- Complete data isolation between tenants
- Schema validation prevents cross-tenant data access

## Database Session Management

### Session Table Schema
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
// Create session
await db.createSession(schema, [userId, sessionId]);

// Get user sessions
await db.getSessions(schema, userId);

// Delete session
await db.deleteSessionByUserId(schema, userId);
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
JWT_SECRET=your-jwt-secret  # Only for client-server API auth
```

## API vs User Authentication Comparison

| Aspect | User Sessions | API JWT |
|--------|---------------|---------|
| **Use Case** | Web users, admin | Server-to-server APIs |
| **State** | Stateful | Stateless |
| **Storage** | Server memory/Redis | Client holds token |
| **Expiry** | Configurable timeout | 24 hours (fixed) |
| **Revocation** | Immediate | Token expiry only |
| **Scaling** | Sticky sessions needed | Fully distributed |
| **Security** | HTTP-only cookies | Bearer tokens |

## Best Practices

### Session Management
1. **Always validate sessions** on protected routes
2. **Regenerate session IDs** after login/privilege changes
3. **Clean up expired sessions** regularly
4. **Use secure session configuration** in production

### Error Handling
```javascript
// Consistent session error handling
if (!session || !session.userId) {
  throw new AuthError("Authentication required");
}
```

### Testing Sessions
```javascript
// Mock session for testing
const mockSession = {
  userId: 1,
  role: 'user',
  schema: 'test_schema'
};
```

## Troubleshooting

### Common Issues
1. **Session not persisting**: Check cookie configuration
2. **Schema not detected**: Verify middleware order
3. **Session expired**: Check session timeout settings
4. **Cross-tenant access**: Validate schema isolation

### Debug Session Data
```javascript
// Log session information
console.log('Session data:', {
  userId: session.userId,
  role: session.role,
  schema: session.schema,
  authenticated: !!session.userId
});
```

## Migration Notes

If you ever need to migrate from sessions to JWT for users:
1. **Keep session validation** logic intact
2. **Extract session data** into JWT claims
3. **Update frontend** to handle tokens instead of cookies
4. **Maintain backward compatibility** during transition

---

**Note**: The Auth-System's hybrid approach (sessions for users, JWT for APIs) provides the best of both worlds - user-friendly session management with scalable API authentication.
