# Backend Product Requirements Document (PRD)
## Auth System - Multi-Tenant Authentication & Authorization Service

### Executive Summary
The Auth System backend provides a multi-tenant authentication and authorization service that enables client applications to delegate user management while maintaining complete data isolation through PostgreSQL schema separation.

### System Architecture

#### Core Components

1. **Multi-Schema Database Architecture**
   - `auth_internal`: System owners and client registrations
   - `client_*`: Tenant-specific user data (dynamically created)
   - `client_template`: Fallback schema for unmatched requests
   - **Reference**: `src/services/schema.js`, `src/middleware/detection.js`

2. **Authentication Service**
   - Session-based authentication via express-session
   - Password hashing with bcrypt (10 salt rounds)
   - Multi-tenant aware session management
   - **Reference**: `src/services/auth.js`, `src/utils/hashing.js`

3. **User Management**
   - Role-based access control (owner, admin, user)
   - Schema-isolated user accounts
   - Profile management and validation
   - **Reference**: `src/models/User.js`, `src/services/user.js`

4. **Client Server Management**
   - Dynamic tenant provisioning
   - URL-based tenant detection
   - API authentication via JWT (future)
   - **Reference**: `src/services/clientServer.js`, `src/models/ClientServer.js`

### API Endpoints (Single Source of Truth)

#### Authentication Endpoints
- **POST /api/auth/register** - User registration with role/schema detection
- **POST /api/auth/login** - Credential-based authentication
- **POST /api/auth/logout** - Session termination
- **GET /api/auth/session** - Current session verification (critical endpoint)
- **Reference**: `src/routes/auth.js`, `docs/analysis/core-components/OpenAPI-Specs.yaml`

#### User Management Endpoints
- **GET /api/users** - List all users (admin only)
- **GET /api/users/:id** - Get specific user
- **PUT /api/users/:id** - Update user profile
- **DELETE /api/users/:id** - Remove user
- **Reference**: `src/routes/user.js`

#### Client Server Endpoints
- **POST /api/clientServer/register** - Register new client application
- **POST /api/clientServer/handshake** - Client authentication (JWT)
- **GET /api/clientServer/me** - Current client info
- **Reference**: `src/routes/clientServer.js`

#### Owner Panel Endpoints
- **GET /api/owner/client-servers** - List managed clients
- **POST /api/owner/client-servers** - Create new client
- **PUT /api/owner/client-servers/:id** - Update client config
- **DELETE /api/owner/client-servers/:id** - Remove client
- **Reference**: `src/routes/owner.js`

### Data Models

#### User Model
```javascript
{
  id: UUID,
  name: String (3-50 chars, letters only),
  email: String (unique, max 50 chars),
  password_hash: String,
  role: Enum ['owner', 'admin', 'user'],
  schema: String (tenant identifier),
  created_at: Timestamp,
  updated_at: Timestamp
}
```
**Reference**: `src/models/User.js`

#### Session Model
```javascript
{
  sid: String (primary key),
  sess: JSONB {
    userId: UUID,
    name: String,
    email: String,
    role: String,
    schema: String,
    sessionId: String,
    authorized_urls: Array<String>
  },
  expire: Timestamp
}
```
**Reference**: `src/models/Session.js`

#### ClientServer Model
```javascript
{
  client_id: String,
  client_secret: String (hashed),
  app_name: String,
  assigned_schema_name: String,
  identifier_url: String,
  entry_point_url: String,
  authorized_urls: Array<String>,
  client_mode: Enum ['frontend-login-proxy', 'api-auth-server'],
  created_at: Timestamp,
  updated_at: Timestamp
}
```
**Reference**: `src/models/ClientServer.js`

### Security Requirements

1. **Password Security**
   - Minimum 8 characters with complexity requirements
   - Bcrypt hashing with 10 salt rounds
   - No password storage in plain text

2. **Session Security**
   - HTTP-only cookies
   - Secure flag in production
   - Session expiry and rotation

3. **Multi-Tenant Isolation**
   - Schema-level database separation
   - Connection pool per schema
   - No cross-tenant data access

4. **Input Validation**
   - Request validation middleware
   - SQL injection prevention
   - XSS protection

### Performance Requirements

1. **Response Times**
   - Authentication: < 200ms
   - Session verification: < 50ms
   - User CRUD: < 100ms

2. **Scalability**
   - Support 1000+ concurrent sessions
   - Dynamic schema creation < 5s
   - Connection pooling per tenant

3. **Reliability**
   - 99.9% uptime target
   - Graceful error handling
   - Transaction rollback support

### Integration Points

1. **Frontend Integration**
   - Session cookie authentication
   - CORS configuration for client apps
   - Redirect URL management

2. **Database Integration**
   - PostgreSQL 13+
   - Schema-aware queries
   - Migration support

3. **Future Integrations**
   - Redis for session caching
   - JWT for API authentication
   - OAuth2/OIDC providers

### Error Handling

1. **Standard Error Responses**
   ```json
   {
     "message": "Human-readable error",
     "errors": [{"field": "email", "message": "Invalid format"}]
   }
   ```

2. **HTTP Status Codes**
   - 200: Success
   - 201: Created
   - 400: Validation Error
   - 401: Authentication Required
   - 403: Forbidden
   - 404: Not Found
   - 409: Conflict
   - 500: Server Error

### Testing Requirements

1. **Unit Tests**
   - Service layer coverage > 80%
   - Model validation tests
   - Utility function tests

2. **Integration Tests**
   - Full API endpoint coverage
   - Multi-tenant scenarios
   - Authentication flows

3. **Performance Tests**
   - Load testing for concurrent users
   - Schema creation benchmarks
   - Query optimization validation

### Deployment Requirements

1. **Environment Variables**
   - DATABASE_URL
   - SESSION_SECRET
   - NODE_ENV
   - PORT

2. **Docker Support**
   - Multi-stage build
   - Health check endpoint
   - Volume mounts for logs

3. **Monitoring**
   - Health check: GET /api/health
   - Structured logging
   - Error tracking

### Current Issues (from src/test/issues.backend.md)

1. **CRITICAL: Authentication System Failure**
   - Password verification failing for all users
   - Root cause: Bcrypt salt rounds mismatch

2. **CRITICAL: Role Validation Failure**
   - Registration validation rejecting valid 'owner' role
   - Location: `src/utils/validationSchemas.js:164`

3. **HIGH: Model Reference Error**
   - Circular dependency in model imports
   - Affects: ClientServerOperations initialization

### Success Metrics

1. **Functional Metrics**
   - All 83 integration tests passing
   - Zero authentication failures
   - 100% schema isolation

2. **Performance Metrics**
   - Average response time < 100ms
   - Zero memory leaks
   - Connection pool efficiency > 90%

3. **Security Metrics**
   - Zero security vulnerabilities
   - 100% input validation coverage
   - No cross-tenant data leaks 