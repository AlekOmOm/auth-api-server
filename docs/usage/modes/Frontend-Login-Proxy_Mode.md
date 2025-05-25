# Frontend-Login-Proxy Mode - Comprehensive Guide

This document provides a complete guide to implementing and understanding the **Frontend-Login-Proxy Mode** in the Auth-System. This mode enables client applications to seamlessly redirect users to the Auth-System's built-in UI for authentication, while maintaining persistent connection to their specific database schema.

## Table of Contents
1. [Overview](#overview)
2. [Owner User Registration & Client Management](#owner-user-registration--client-management)
3. [Client Registration Process](#client-registration-process)
4. [Persistent Schema Connection](#persistent-schema-connection)
5. [Implementation Guide](#implementation-guide)
6. [Schema Detection Flow](#schema-detection-flow)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)
9. [URL Migration & Updates](#url-migration-updates)

---

## Overview

The Frontend-Login-Proxy Mode allows your client application to:
- **Redirect unauthenticated users** to Auth-System's built-in login/register UI
- **Automatically detect tenant schema** from the return URL
- **Maintain persistent connection** to the correct database schema
- **Seamlessly redirect users back** to your application after authentication

### Key Benefits
- ✅ **Zero UI development** - Use Auth-System's ready-made login/register forms
- ✅ **Automatic tenant isolation** - Each client gets their own database schema
- ✅ **Persistent reconnection** - Schema survives app redeployments
- ✅ **Session-based security** - HTTP-only cookies for web applications

---

## Owner User Registration & Client Management

### Step 1: Register as an Owner User

Before you can create client servers, you need to register as an **Owner User** on the Auth-System:

**Frontend Registration:**
1. Visit: `http://localhost:3000/register` (Auth-System frontend)
2. Fill out the registration form:
   - **Name**: Your name or company name
   - **Email**: Your email address
   - **Password**: Strong password

**API Registration (Alternative):**
```bash
curl -X POST http://localhost:3003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "owner@example.com",
    "password": "StrongPassword123!"
  }'
```

**Response:**
```json
{
  "message": "Registration successful",
  "data": {
    "userId": "5cc1811b-19d2-4f89-bf40-bf9d4b320c7d"
  }
}
```

### Step 2: Login as Owner User

**Frontend Login:**
1. Visit: `http://localhost:3000/login`
2. Enter your credentials

**API Login:**
```bash
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "email": "owner@example.com",
      "password": "StrongPassword123!"
    }
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "data": {
    "id": "5cc1811b-19d2-4f89-bf40-bf9d4b320c7d",
    "name": "John Doe",
    "role": "user",
    "email": "owner@example.com",
    "poolMetadata": {
      "user_role": "owner",
      "owned_clients": 0
    }
  }
}
```

### Step 3: Manage Client Servers

Once logged in as an owner, you can manage your client servers using these endpoints:

#### Create Client Server
```bash
curl -X POST http://localhost:3003/api/clientServer/user/register \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "app_name": "TradingSimulator",
    "allowed_return_urls": [
      "http://localhost:5173/",
      "http://localhost:5173"
    ],
    "client_mode": "frontend-login-proxy"
  }'
```

#### List Your Client Servers
```bash
curl -X GET http://localhost:3003/api/clientServer/user/clients \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

#### Update Client Server
```bash
curl -X PUT http://localhost:3003/api/clientServer/user/clients/CLIENT_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "app_name": "UpdatedAppName",
    "allowed_return_urls": ["http://localhost:5173/", "https://myapp.com"]
  }'
```

#### Delete Client Server
```bash
curl -X DELETE http://localhost:3003/api/clientServer/user/clients/CLIENT_ID \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

---

## Client Registration Process

### Step 1: Register Your Client Application

Your client application must be registered with the Auth-System before it can use the Frontend-Login-Proxy mode.

**Endpoint:** `POST /api/clientServer/user/register`

**Request:**
```bash
curl -X POST http://localhost:3003/api/clientServer/user/register \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "app_name": "TradingSimulator",
    "allowed_return_urls": [
      "http://localhost:5173/",
      "http://localhost:5173"
    ],
    "client_mode": "frontend-login-proxy"
  }'
```

**Response:**
```json
{
  "message": "Client server registered successfully",
  "data": {
    "client_id": "client_3c24d51aa030479b818d4edb84307dcc",
    "client_secret": "64a8a211-6444-4f9d-856b-334494346cda",
    "app_name": "TradingSimulator",
    "assigned_schema_name": "client_tradingsimulator_1748187540074",
    "allowed_return_urls": ["http://localhost:5173/"],
    "client_mode": "frontend-login-proxy"
  }
}
```

### What Happens During Registration

1. **Unique Credentials Generated:**
   - `client_id`: Unique identifier for your application
   - `client_secret`: Secret key for API authentication (if needed)

2. **Database Schema Created:**
   - `assigned_schema_name`: Your dedicated PostgreSQL schema
   - Format: `client_{app_name}_{timestamp}`
   - Example: `client_tradingsimulator_1748187540074`

3. **URL Validation Setup:**
   - `allowed_return_urls`: Whitelist of URLs Auth-System can redirect to
   - Must include all pages where authentication is required

4. **Database Tables Initialized:**
   - `users` table for your application's users
   - `sessions` table for session management
   - Complete isolation from other clients

---

## Persistent Schema Connection

### The Challenge
When your client application redeploys, you need to ensure users can still access their accounts in the correct database schema. The Frontend-Login-Proxy mode solves this through **URL-based schema detection**.

### The Solution: Data to Persist

**⚠️ CRITICAL:** Store these values securely in your application:

```javascript
// Store in environment variables, database, or secure config
const CLIENT_CONFIG = {
  // Required for schema reconnection
  "app_name": "TradingSimulator",
  "allowed_return_urls": [
    "http://localhost:5173/",
    "http://localhost:5173"
  ],
  
  // Optional: For API mode if needed
  "client_id": "client_3c24d51aa030479b818d4edb84307dcc",
  "client_secret": "64a8a211-6444-4f9d-856b-334494346cda",
  
  // Auth-System configuration
  "auth_system_url": "http://localhost:3003"
};
```

### How Schema Reconnection Works

The Auth-System uses **allowed_return_urls** to identify your client:

1. **User visits protected page:** `http://localhost:5173/`
2. **Your app redirects to Auth-System:** 
   ```
   http://localhost:3000/login?return_url=http%3A%2F%2Flocalhost%3A5173%2F
   ```
3. **Auth-System queries database:**
   ```sql
   SELECT * FROM auth_internal.client_servers 
   UNION ALL 
   SELECT * FROM public.client_servers
   WHERE 'http://localhost:5173/' = ANY(allowed_return_urls)
   ```
4. **Schema automatically detected:**
   ```javascript
   req.session.schema = 'client_tradingsimulator_1748187540074'
   req.session.poolContext = 'client_tenant'
   ```

### Key Insight: No Client ID Required!

Unlike API mode, Frontend-Login-Proxy mode **doesn't require storing client_id**. The schema is detected from the `return_url` parameter, making it perfect for frontend applications that shouldn't store secrets.

---

## Security Architecture

### **Why Frontend-Login-Proxy Doesn't Use `client_secret`**

This is a **deliberate security design** that separates concerns:

#### **Frontend-Login-Proxy Mode (This Guide)**
```javascript
// ✅ SECURE: No secrets in frontend
const CLIENT_CONFIG = {
  "allowed_return_urls": ["http://localhost:5173/"],  // ✅ Public URLs only
  "auth_system_url": "http://localhost:3003"          // ✅ Public endpoint
};

// ✅ SECURE: URL-based schema detection
window.location.href = `${AUTH_SYSTEM_URL}/login?return_url=${returnUrl}`;
```

#### **API-Auth-Server Mode (Different Use Case)**
```javascript
// ✅ SECURE: Server-side only
const CLIENT_SECRET = process.env.CLIENT_SECRET;  // ✅ Environment variable

// ✅ SECURE: Server-to-server handshake
const token = await fetch('/api/clientServer/handshake', {
  method: 'POST',
  body: JSON.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET  // ✅ Backend server only
  })
});
```

### **Security Benefits of URL-Based Detection**

1. **✅ No Secret Storage**: Frontend never needs to store sensitive credentials
2. **✅ No Secret Transmission**: No secrets sent over the network from frontend
3. **✅ Tamper-Resistant**: URLs are validated against pre-registered whitelist
4. **✅ Audit Trail**: All redirects are logged and traceable

### **When `client_secret` IS Used**

The `client_secret` is **only used for**:
- 🔧 **API-Auth-Server mode** - Server-to-server authentication
- 🔧 **Administrative operations** - Updating client settings
- 🔧 **Backend integrations** - Mobile app backends, microservices

The `client_secret` is **never used for**:
- ❌ Frontend applications
- ❌ Browser-based authentication
- ❌ User login flows
- ❌ Session management

---

## Implementation Guide

### Basic Integration

Here's how to integrate Frontend-Login-Proxy mode into your application:

#### 1. Environment Configuration

```javascript
// config.js
export const AUTH_CONFIG = {
  AUTH_SYSTEM_URL: process.env.AUTH_SYSTEM_URL || 'http://localhost:3003',
  AUTH_FRONTEND_URL: process.env.AUTH_FRONTEND_URL || 'http://localhost:3000',
  ALLOWED_RETURN_URLS: [
    'http://localhost:5173/',
    'http://localhost:5173',
    // Add all your protected routes
  ]
};
```

#### 2. Authentication Middleware

```javascript
// middleware/auth.js
import { AUTH_CONFIG } from '../config.js';

export async function requireAuth(req, res, next) {
  try {
    // Check if user has valid session
    const response = await fetch(`${AUTH_CONFIG.AUTH_SYSTEM_URL}/api/auth/session`, {
      headers: {
        'Cookie': req.headers.cookie || ''
      }
    });

    if (response.ok) {
      const userData = await response.json();
      req.user = userData.data;
      next();
    } else {
      // Redirect to Auth-System with current URL
      const returnUrl = encodeURIComponent(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
      res.redirect(`${AUTH_CONFIG.AUTH_FRONTEND_URL}/login?return_url=${returnUrl}`);
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    res.status(500).send('Authentication service unavailable');
  }
}
```

#### 3. Frontend JavaScript Implementation

```javascript
// For single-page applications
class AuthService {
  constructor() {
    this.authSystemUrl = 'http://localhost:3003';
    this.authFrontendUrl = 'http://localhost:3000';
  }

  async checkAuth() {
    try {
      const response = await fetch(`${this.authSystemUrl}/api/auth/session`, {
        credentials: 'include' // Include cookies
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Auth check failed:', error);
      return null;
    }
  }

  redirectToLogin() {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${this.authFrontendUrl}/login?return_url=${returnUrl}`;
  }

  async logout() {
    try {
      await fetch(`${this.authSystemUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      // Redirect to home or login page
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}

// Usage
const auth = new AuthService();

// Check authentication on page load
auth.checkAuth().then(user => {
  if (user) {
    console.log('User is authenticated:', user);
  } else {
    console.log('User not authenticated');
    // Redirect to login if on protected page
    if (window.location.pathname.startsWith('/dashboard')) {
      auth.redirectToLogin();
    }
  }
});
```

#### 4. Real-World Example: Trading Simulator Integration

Based on our successful end-to-end test with the Trading Simulator:

```javascript
// Trading Simulator (http://localhost:5173)
// When user clicks "Login" button:

function handleLogin() {
  // Redirect to Auth-System with return URL
  const returnUrl = encodeURIComponent(window.location.href);
  window.location.href = `http://localhost:3000/login?return_url=${returnUrl}`;
}

// Result: User is redirected to:
// http://localhost:3000/login?return_url=http%3A%2F%2Flocalhost%3A5173%2F

// Auth-System automatically:
// 1. Detects return_url: http://localhost:5173/
// 2. Finds matching client: client_3c24d51aa030479b818d4edb84307dcc
// 3. Sets schema: client_tradingsimulator_1748187540074
// 4. Authenticates user in correct tenant database
// 5. Returns user data with pool metadata
```

---

## Schema Detection Flow

### Visual Flow Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Your App      │    │   Auth-System   │    │   Database      │
│ (localhost:5173)│    │ (localhost:3000)│    │                 │
│                 │    │                 │    │                 │
│ 1. User visits  │    │ 3. Extract      │    │ 4. Query        │
│    /dashboard   │───▶│    return_url   │───▶│    client_servers│
│                 │    │                 │    │                 │
│ 2. No session?  │    │ 5. Find matching│    │ 6. Return       │
│    Redirect to  │    │    client by    │    │    schema name  │
│    Auth-System  │    │    allowed_urls │    │                 │
│                 │    │                 │    │                 │
│ 8. User returns │◀───│ 7. Set schema   │    │                 │
│    with session │    │    in session   │    │                 │
│                 │    │    Show login   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Detailed Technical Flow

1. **Client App Redirect:**
   ```
   http://localhost:5173/ → http://localhost:3000/login?return_url=http%3A%2F%2Flocalhost%3A5173%2F
   ```

2. **Auth-System Frontend:**
   - Extracts `return_url` from URL parameters
   - Stores in sessionStorage for persistence
   - Sends login request with `returnUrl` in body

3. **Backend Schema Detection:**
   ```javascript
   // detectSchemaFromReturnUrl middleware
   const returnUrl = req.body?.returnUrl; // "http://localhost:5173/"
   
   // Query both schemas for client servers
   const { rows: clientServers } = await authInternalPool.query(
     "SELECT * FROM auth_internal.client_servers UNION ALL SELECT * FROM public.client_servers"
   );
   
   // Find matching client
   const matchingClient = clientServers.find(client => 
     client.allowed_return_urls.some(allowedUrl => 
       returnUrl.startsWith(allowedUrl)
     )
   );
   
   // Set session context
   req.session.poolContext = 'client_tenant';
   req.session.schema = matchingClient.assigned_schema_name;
   ```

4. **Authentication Response:**
   ```json
   {
     "message": "Login successful",
     "data": {
       "id": "6a62826e-0073-45c9-9dd2-fdb185eef416",
       "name": "Trading User",
       "role": "user",
       "email": "trader@example.com",
       "poolMetadata": {
         "client_id": "client_3c24d51aa030479b818d4edb84307dcc",
         "app_name": "TradingSimulator",
         "client_mode": "frontend-login-proxy",
         "return_url": "http://localhost:5173/",
         "allowed_return_urls": ["http://localhost:5173/"],
         "user_role": "user"
       }
     }
   }
   ```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Return URL not found" or Schema Not Detected

**Problem:** Auth-System can't match your return_url to any registered client.

**Solution:**
1. Verify your `allowed_return_urls` include the exact URL being used
2. Check for trailing slashes: `http://localhost:5173` vs `http://localhost:5173/`
3. Ensure protocol matches: `http` vs `https`

```bash
# Check registered URLs (as owner user)
curl -X GET http://localhost:3003/api/clientServer/user/clients \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

#### Issue 2: Wrong Port Configuration

**Problem:** Frontend trying to connect to wrong backend port.

**Solution:**
Check your port configuration:
- **Auth-System Frontend**: `http://localhost:3000`
- **Auth-System Backend**: `http://localhost:3003` (mapped from container port 3001)
- **Your Client App**: `http://localhost:5173` (or your chosen port)

```javascript
// Correct configuration
const AUTH_CONFIG = {
  AUTH_SYSTEM_URL: 'http://localhost:3003',      // Backend API
  AUTH_FRONTEND_URL: 'http://localhost:3000'     // Frontend UI
};
```

#### Issue 3: Session Lost After Redirect

**Problem:** User gets redirected back but Auth-System doesn't recognize them.

**Solution:**
1. Check cookie domain settings in Auth-System
2. Ensure `SameSite` cookie policy allows cross-domain cookies
3. Verify both apps are on same domain or configure CORS properly

```javascript
// In Auth-System's session configuration
app.use(session({
  cookie: {
    domain: '.localhost', // Allows sharing between subdomains
    sameSite: 'lax',      // Allows cross-site requests
    secure: false         // Set to true in production with HTTPS
  }
}));
```

#### Issue 4: req.body is undefined

**Problem:** Backend receives `req.body: undefined` causing schema detection to fail.

**Solution:**
1. Ensure body parser middleware is properly configured
2. Check middleware order in Express app
3. Verify Content-Type headers are set correctly

```javascript
// Proper middleware order
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(detectSchema); // After body parsers
```

---

## Best Practices

### 1. URL Management

**✅ DO:**
- Include all possible entry points in `allowed_return_urls`
- Use consistent URL formatting (with/without trailing slashes)
- Include both development and production URLs during registration

**❌ DON'T:**
- Use wildcard URLs (not supported)
- Change URLs without updating registration
- Include sensitive parameters in return URLs

### 2. Security Considerations

**✅ DO:**
- Use HTTPS in production
- Configure proper cookie settings
- Validate return URLs on your side too
- Implement CSRF protection

**❌ DON'T:**
- Store client_secret in frontend code
- Allow open redirects
- Use HTTP in production
- Trust return URLs without validation

### 3. Error Handling

```javascript
// Robust error handling
export async function requireAuth(req, res, next) {
  try {
    const response = await fetch(`${AUTH_CONFIG.AUTH_SYSTEM_URL}/api/auth/session`, {
      headers: { 'Cookie': req.headers.cookie || '' },
      timeout: 5000 // Prevent hanging requests
    });

    if (response.ok) {
      req.user = await response.json();
      next();
    } else if (response.status === 401) {
      // Unauthenticated - redirect to login
      redirectToLogin(req, res);
    } else {
      // Other error - show error page
      res.status(500).send('Authentication service error');
    }
  } catch (error) {
    console.error('Auth service unreachable:', error);
    // Graceful degradation - maybe show cached content or error page
    res.status(503).send('Authentication service temporarily unavailable');
  }
}
```

### 4. Performance Optimization

**Session Caching:**
```javascript
// Cache auth results to reduce API calls
const authCache = new Map();

async function checkAuthCached(sessionId) {
  if (authCache.has(sessionId)) {
    const cached = authCache.get(sessionId);
    if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached.user;
    }
  }
  
  const user = await checkAuthRemote(sessionId);
  authCache.set(sessionId, { user, timestamp: Date.now() });
  return user;
}
```

---

## URL Migration & Updates

### **Production Deployment: Updating URLs Safely**

When deploying from development to production (e.g., `localhost:5173` → `trade.devalek.dev`), you need to update your `allowed_return_urls` to maintain schema access.

#### **The Challenge**
```javascript
// 🚨 PROBLEM: URLs don't match after deployment
// Development URLs: ["http://localhost:5173/"]
// Production URLs:   ["https://trade.devalek.dev"]
// Result: Schema detection fails!
```

#### **The Solution: Owner User Updates**

**Step 1: Login as Owner User**

```bash
# Login to get session cookie
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "credentials": {
      "email": "owner@example.com",
      "password": "StrongPassword123!"
    }
  }'
```

**Step 2: Update Client Server URLs**

```bash
# Update your client server
curl -X PUT http://localhost:3003/api/clientServer/user/clients/CLIENT_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "allowed_return_urls": [
      "http://localhost:5173/",
      "https://trade.devalek.dev",
      "https://trade.devalek.dev/"
    ]
  }'
```

**Step 3: Verify Updates**

```bash
# Check updated URLs
curl -X GET http://localhost:3003/api/clientServer/user/clients \
  -b cookies.txt
```

### **Automated Update Script**

```javascript
// scripts/update-urls.js
const updateAllowedUrls = async () => {
  try {
    console.log('🔐 Logging in as owner...');
    
    // 1. Login as owner user
    const loginResponse = await fetch('http://localhost:3003/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentials: {
          email: process.env.OWNER_EMAIL,
          password: process.env.OWNER_PASSWORD
        }
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Owner login failed');
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Owner login successful');

    // 2. Get client servers
    const clientsResponse = await fetch('http://localhost:3003/api/clientServer/user/clients', {
      headers: { 'Cookie': cookies }
    });

    const { data: clients } = await clientsResponse.json();
    const targetClient = clients.find(c => c.app_name === 'TradingSimulator');

    if (!targetClient) {
      throw new Error('TradingSimulator client not found');
    }

    // 3. Update URLs
    console.log('🔄 Updating allowed return URLs...');
    
    const updateResponse = await fetch(`http://localhost:3003/api/clientServer/user/clients/${targetClient.client_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        allowed_return_urls: [
          // Keep development URLs
          "http://localhost:5173/",
          "http://localhost:5173",
          
          // Add production URLs
          "https://trade.devalek.dev",
          "https://trade.devalek.dev/",
          "https://trade.devalek.dev/dashboard"
        ]
      })
    });

    if (!updateResponse.ok) {
      throw new Error('URL update failed');
    }

    const result = await updateResponse.json();
    console.log('✅ URLs updated successfully!');
    console.log('📋 Updated URLs:', result.data.allowed_return_urls);
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
};

// Run the update
updateAllowedUrls();
```

---

## Conclusion

The Frontend-Login-Proxy Mode provides a powerful, secure, and scalable solution for multi-tenant authentication. By understanding the owner user registration process, client server management, schema detection mechanism, and implementing proper error handling, you can create a seamless authentication experience for your users while maintaining complete data isolation between clients.

### Key Takeaways:
- ✅ **Owner user registration** required before creating client servers
- ✅ **Session-based client management** via owner user endpoints
- ✅ **URL-based schema detection** survives application redeployments  
- ✅ **Automatic tenant isolation** ensures data security
- ✅ **Real-world tested** with Trading Simulator integration
- ✅ **Complete CRUD operations** for client server management

### Verified End-to-End Flow:
1. **Owner Registration**: `POST /api/auth/register` → Owner user created
2. **Owner Login**: `POST /api/auth/login` → Session established
3. **Client Creation**: `POST /api/clientServer/user/register` → Schema created
4. **User Authentication**: Trading Simulator → Auth-System → Tenant database
5. **Schema Detection**: Return URL → Client match → Correct schema
6. **Session Persistence**: Pool metadata maintained across requests

For API-based integration or more advanced use cases, see the [API_EXAMPLES.md](./API_EXAMPLES.md) documentation.
