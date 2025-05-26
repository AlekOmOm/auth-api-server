# Technical Implementation - Login Proxy Mode

## Data Structures & Session Persistence

### Request/Response Structures

#### Frontend → Backend Login Request
```javascript
// POST /api/auth/login
{
  credentials: {
    email: "user@example.com",
    password: "password123"
  },
  returnUrl: "https://client.com/dashboard"  // Optional, for proxy mode
}
```

#### Backend Response (Success)
```javascript
{
  message: "Login successful",
  data: {
    userId: "123",
    role: "user",
    email: "user@example.com", 
    name: "John Doe",
    poolMetadata: {
      client_id: "client_123",
      user_role: "user",
      app_name: "Client App",
      // ... additional context
    }
  }
}
```

#### Backend Response (Error)
```javascript
{
  message: "Invalid credentials",
  success: false
}
```

### Session Structure & Persistence

#### Backend Session (req.session)
```javascript
{
  // User authentication
  userId: "123",
  role: "user",
  
  // Schema detection context
  poolContext: "client_tenant",  // AUTH_INTERNAL | CLIENT_TENANT | API_CLIENT | DEFAULT
  schema: "client_schema_name",
  poolMetadata: {
    client_id: "client_123",
    app_name: "Client App", 
    user_role: "user",           // admin | owner | user
    return_url: "https://client.com/dashboard",
    allowed_return_urls: ["https://client.com/dashboard", "https://client.com/profile"],
    // ... additional context
  }
}
```

#### Session Persistence Flow
1. **Backend Sets Session**: `detectSchema` middleware sets session data
2. **Session Storage**: Express-session stores in memory/database with cookie
3. **Frontend Access**: Frontend gets session via `GET /api/auth/session`
4. **Cross-Request Persistence**: Session persists across requests via cookie

#### Frontend Session Access
```javascript
// Frontend calls this to get current session
const sessionData = await fetchGet('/api/auth/session');

// Returns same structure as login response:
{
  message: "User retrieved successfully",
  data: {
    userId: "123",
    role: "user", 
    email: "user@example.com",
    name: "John Doe",
    poolMetadata: { /* session context */ }
  }
}
```

## Core Component: detectSchema Middleware

The schema detection happens in the `detectSchemaFromReturnUrl` middleware:

```javascript
// backend/src/middleware/schemaDetection.js
export const detectSchemaFromReturnUrl = async (req, res, next) => {
   try {
      const returnUrl = req.body.returnUrl;  // Note: from req.body, not req.query

      if (returnUrl !== null) {
         const authInternalPool = await getPool();

         // Get all client servers and find matching one
         const { rows: clientServers } = await authInternalPool.query(
            "SELECT * FROM client_servers"
         );

         const matchingClient = clientServers.find((client) =>
            client.allowed_return_urls.some((allowedUrl) =>
               allowedUrl.some((allowedUrl) => returnUrl.startsWith(allowedUrl))
            )
         );

         if (matchingClient) {
            // Set CLIENT_TENANT context - this is a tenant user
            setPoolContext(
               req,
               POOL_CONTEXTS.CLIENT_TENANT,
               matchingClient.assigned_schema_name,
               {
                  client_id: matchingClient.client_id,
                  app_name: matchingClient.app_name,
                  user_role: USER_ROLES.USER,
                  return_url: returnUrl,
                  allowed_return_urls: matchingClient.allowed_return_urls,
               }
            );
         }
      }

      next();
   } catch (error) {
      console.error("❌ Error detecting schema from return_url:", error);
      next();
   }
};
```

## Frontend Implementation Flow

### 1. Login/Register Pages
- **Files**: `frontend/src/routes/card/Login.svelte`, `frontend/src/routes/card/Register.svelte`
- **Extract return_url**: From URL query parameters
- **Send to backend**: Via authStore → authApi

```javascript
// Login.svelte
let returnUrl = null;
if (window.location.search.includes('return_url')) {
  returnUrl = new URL(window.location.href).searchParams.get('return_url');
}

const response = await authStore.login(credentials, returnUrl);
```

### 2. Auth Store Layer
- **File**: `frontend/src/stores/authStore.js`
- **Manages**: Client-side authentication state
- **Session Access**: Calls `/api/auth/session` to get current user + session context

```javascript
async function login(credentials, returnUrl = null) {
  const response = await authApi.login(credentials, returnUrl);
  if (response.success && response.data && response.data.userId) {
    set({ isAuthenticated: true, user: response.data, loading: false });
  }
  return response;
}
```

### 3. API Service Layer  
- **File**: `frontend/src/services/authApi.js`
- **Sends**: Structured request to backend

```javascript
const login = async (credentials, returnUrl = null) => {
  const response = await fetchPost(`${BACKEND_URL_AUTH}/login`, {
    credentials,
    returnUrl,
  });
  return response;
};
```

## Backend Implementation Flow

### 1. Route Handler
- **File**: `backend/src/routes/auth.js`
- **Middleware**: `detectSchema` runs on ALL routes
- **Schema Context**: Available in `req.session` for all subsequent handlers

```javascript
// All routes use detectSchema middleware
router.use(detectSchema);

router.post("/login", validation.login, login);
router.post("/register", validation.register, register);
```

### 2. Schema Detection Priority
The `detectSchema` middleware tries multiple detection methods:

1. **API Token** (highest priority) → `API_CLIENT` context
2. **Return URL** (proxy mode) → `CLIENT_TENANT` context  
3. **User Role** (admin/owner) → `AUTH_INTERNAL` context
4. **Default** (fallback) → `DEFAULT` context

### 3. Controller Layer
- **File**: `backend/src/controllers/auth.js`
- **Receives**: Full request with session context
- **Passes**: Complete request object to service

```javascript
const login = async (req, res, next) => {
  try {
    // req.session already contains schema context from detectSchema middleware
    const result = await authService.login(req);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
```

### 4. Service Layer
- **File**: `backend/src/services/auth.js`  
- **Uses**: Schema from session context
- **Updates**: Session with user authentication data

```javascript
export async function login(req) {
  const { credentials } = req.body;
  const schema = req.session.schema;
  
  // Authenticate user in correct schema
  const user = await repo.getUserByEmail(schema, credentials.email);
  
  // Update session with user data
  req.session.userId = user.id;
  req.session.role = user.role;
  
  return createSuccessResponse("Login successful", {
    ...removePasswordFromUser(user),
    poolMetadata: req.session.poolMetadata || null,
  });
}
```

### 5. Repository Layer
- **File**: `backend/src/repo/userRepository.js`
- **Uses**: Correct database pool based on schema context
- **Performs**: Database operations in tenant-specific schema

## Session Persistence Details

### Backend Session Configuration
```javascript
// backend/server.js
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: "lax",
    secure: false,      // true in production
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));
```

### Frontend Session Access
- **Available**: Session data accessible via `/api/auth/session` endpoint
- **Automatic**: authStore calls this on initialization
- **Persistent**: Cookie-based session persists across browser sessions
- **Cross-Request**: Session context available for all subsequent API calls

### Session Lifecycle
1. **Detection**: `detectSchema` middleware sets initial context
2. **Authentication**: Login/register updates session with user data  
3. **Persistence**: Express-session handles cookie storage
4. **Access**: Frontend retrieves via session endpoint
5. **Cleanup**: Logout destroys session and database records
