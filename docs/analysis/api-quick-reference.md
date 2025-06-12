# Backend API Quick Reference

**Generated**: June 12, 2025  
**Status**: Development/Testing Phase

## 🟢 Working Endpoints (After Fixes)

### Authentication
```bash
# Register (requires schema context header)
POST /api/auth/register
Headers: X-Schema-Context: http://localhost:3000/
Body: { name, email, password, role }

# Login (use correct password: "password123")
POST /api/auth/login
Body: { 
  credentials: { email: "owner@example.com", password: "password123" },
  schema: "auth_internal"
}

# Get session (requires authentication)
GET /api/auth/session
Headers: Cookie: connect.sid=xxx

# Logout
POST /api/auth/logout
Headers: Cookie: connect.sid=xxx
```

### Health Check
```bash
GET /api/health
# No authentication required
```

## 🔴 Not Working (Needs Fixes)

### Schema Management - Routes Not Mounted
```bash
GET    /api/schema         # 404 - Route not mounted
POST   /api/schema         # 404 - Route not mounted  
PUT    /api/schema/{id}    # 404 - Route not mounted
DELETE /api/schema/{id}    # 404 - Route not mounted
```

**Fix**: Add to server.js:
```javascript
import schemaRoute from "./src/routes/schema.js";
app.use("/api/schema", schemaRoute);
```

### User Management - Controller Logic Issue
```bash
GET /api/users  # 400 - Trying to parse body on GET request
```

### Client Server Registration - Auth Confusion
```bash
POST /api/clientServer/register  # 400 - Requires user ID but marked as public
```

## 🟡 Authentication-Dependent Endpoints

These fail due to login password mismatch preventing session creation:

### Authenticated User Endpoints
- GET /api/auth/me
- GET /api/auth/admin  
- POST /api/auth/sessions
- POST /api/clientServer/user/register
- GET /api/clientServer/user/clients
- GET /api/owner/stats
- All other owner endpoints

### Bearer Token Endpoints
- GET /api/clientServer/me
- PUT /api/clientServer/me

## Test Data Reference

### Correct Passwords (from generateHashes.js):
```javascript
{
  admin: {
    email: "admin@auth-system.com",
    password: "admin123"
  },
  owner: {
    email: "owner@example.com", 
    password: "password123"  // NOT "OwnerPassword123!"
  },
  user: {
    email: "testuser@example.com",
    password: "password123"
  }
}
```

### Required Headers
- **Schema Context**: `X-Schema-Context: http://localhost:3000/`
- **Session Auth**: `Cookie: connect.sid=xxx`
- **Bearer Auth**: `Authorization: Bearer <token>`

## Known Issues

1. **Schema Detection**: Currently sets "temp-schema-name" instead of proper schema
2. **Password Mismatch**: Test suite uses wrong passwords
3. **Missing Routes**: Schema management routes not mounted
4. **GET /users**: Incorrectly parsing request body
5. **Public vs Auth**: /clientServer/register confusion

## Testing Order

To successfully test the API:

1. Fix passwords in test-backend-api.js
2. Mount schema routes in server.js
3. Run auth tests first to establish session
4. Then run authenticated endpoint tests
5. Client server tests require handshake for bearer token

## CORS Configuration

Allowed origins:
- http://localhost:3000 (Auth system frontend)
- Origins from ALLOWED_CLIENT_ORIGINS env variable

## Rate Limiting

- Window: 15 minutes (configurable)
- Limit: 3000 requests per window (configurable) 