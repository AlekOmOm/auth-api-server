# Frontend-Login-Proxy Mode - Comprehensive Guide

This document provides a complete guide to implementing and understanding the **Frontend-Login-Proxy Mode** in the Auth-System. This mode enables client applications to seamlessly redirect users to the Auth-System's built-in UI for authentication, while maintaining persistent connection to their specific database schema.


## Table of Contents
1. [Overview](#overview)
2. [Client Registration Process](#client-registration-process)
3. [Persistent Schema Connection](#persistent-schema-connection)
4. [Implementation Guide](#implementation-guide)
5. [Schema Detection Flow](#schema-detection-flow)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)
8. [URL Migration & Updates](#url-migration-updates)

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

## Client Registration Process

### Step 1: Register Your Client Application

Your client application must be registered with the Auth-System before it can use the Frontend-Login-Proxy mode.

**Endpoint:** `POST /api/clientServer/register`

**Request:**
```bash
curl -X POST http://localhost:3001/api/clientServer/register \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "MyAwesomeApp",
    "allowed_return_urls": [
      "http://localhost:4000",
      "http://localhost:4000/dashboard", 
      "http://localhost:4000/profile",
      "https://myapp.com",
      "https://myapp.com/dashboard"
    ]
  }'
```

**Response:**
```json
{
  "message": "Client server registered successfully",
  "data": {
    "client_id": "client_f47ac10b58cc4372a5670e02b2c3d479",
    "client_secret": "550e8400-e29b-41d4-a716-446655440000",
    "app_name": "MyAwesomeApp",
    "assigned_schema_name": "client_myawesomeapp_1703123456789",
    "allowed_return_urls": [
      "http://localhost:4000",
      "http://localhost:4000/dashboard",
      "http://localhost:4000/profile", 
      "https://myapp.com",
      "https://myapp.com/dashboard"
    ]
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
   - Example: `client_myawesomeapp_1703123456789`

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
  "app_name": "MyAwesomeApp",
  "allowed_return_urls": [
    "http://localhost:4000",
    "http://localhost:4000/dashboard",
    "https://myapp.com",
    "https://myapp.com/dashboard"
  ],
  
  // Optional: For API mode if needed
  "client_id": "client_f47ac10b58cc4372a5670e02b2c3d479",
  "client_secret": "550e8400-e29b-41d4-a716-446655440000",
  
  // Auth-System configuration
  "auth_system_url": "http://localhost:3001"
};
```

### How Schema Reconnection Works

The Auth-System uses **allowed_return_urls** to identify your client:

1. **User visits protected page:** `http://localhost:4000/dashboard`
2. **Your app redirects to Auth-System:** 
   ```
   http://localhost:3001/login?return_url=http%3A%2F%2Flocalhost%3A4000%2Fdashboard
   ```
3. **Auth-System queries database:**
   ```sql
   SELECT * FROM client_servers 
   WHERE 'http://localhost:4000/dashboard' LIKE ANY(allowed_return_urls)
   ```
4. **Schema automatically detected:**
   ```javascript
   req.session.schema = 'client_myawesomeapp_1703123456789'
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
  "allowed_return_urls": ["http://localhost:4000"],  // ✅ Public URLs only
  "auth_system_url": "http://localhost:3001"         // ✅ Public endpoint
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
  AUTH_SYSTEM_URL: process.env.AUTH_SYSTEM_URL || 'http://localhost:3001',
  ALLOWED_RETURN_URLS: [
    'http://localhost:4000',
    'http://localhost:4000/dashboard',
    'http://localhost:4000/profile',
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
    const response = await fetch(`${AUTH_CONFIG.AUTH_SYSTEM_URL}/api/auth/me`, {
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
      res.redirect(`${AUTH_CONFIG.AUTH_SYSTEM_URL}/login?return_url=${returnUrl}`);
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    res.status(500).send('Authentication service unavailable');
  }
}
```

#### 3. Express.js Implementation

```javascript
// app.js
import express from 'express';
import { requireAuth } from './middleware/auth.js';

const app = express();

// Public routes (no authentication required)
app.get('/', (req, res) => {
  res.send('Welcome to MyAwesomeApp!');
});

// Protected routes (authentication required)
app.get('/dashboard', requireAuth, (req, res) => {
  res.send(`Welcome to dashboard, ${req.user.name}!`);
});

app.get('/profile', requireAuth, (req, res) => {
  res.send(`Profile for ${req.user.email}`);
});

app.listen(4000, () => {
  console.log('Client app running on http://localhost:4000');
});
```

#### 4. Frontend JavaScript Implementation

```javascript
// For single-page applications
class AuthService {
  constructor() {
    this.authSystemUrl = 'http://localhost:3001';
  }

  async checkAuth() {
    try {
      const response = await fetch(`${this.authSystemUrl}/api/auth/me`, {
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
    window.location.href = `${this.authSystemUrl}/login?return_url=${returnUrl}`;
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

---

## Schema Detection Flow

### Visual Flow Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Your App      │    │   Auth-System   │    │   Database      │
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

****
---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Return URL not found" or Schema Not Detected

**Problem:** Auth-System can't match your return_url to any registered client.

**Solution:**
1. Verify your `allowed_return_urls` include the exact URL being used
2. Check for trailing slashes: `http://localhost:4000` vs `http://localhost:4000/`
3. Ensure protocol matches: `http` vs `https`

```bash
# Check registered URLs
curl -X GET http://localhost:3001/api/clientServer/me \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

#### Issue 2: Session Lost After Redirect

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

#### Issue 3: Multiple Schemas Created

**Problem:** New schema created on each deployment instead of reusing existing one.

**Solution:**
1. Don't register your app multiple times
2. Store registration data permanently
3. Use update endpoint instead of re-registering

```javascript
// Instead of registering again, update your client
curl -X PUT http://localhost:3001/api/clientServer/me \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"allowed_return_urls": ["http://localhost:4000", "https://myapp.com"]}'
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
    const response = await fetch(`${AUTH_CONFIG.AUTH_SYSTEM_URL}/api/auth/me`, {
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

When deploying from development to production (e.g., `localhost:4000` → `trade.devalek.dev`), you need to update your `allowed_return_urls` to maintain schema access.

#### **The Challenge**
```javascript
// 🚨 PROBLEM: URLs don't match after deployment
// Development URLs: ["http://localhost:4000"]
// Production URLs:   ["https://trade.devalek.dev"]
// Result: Schema detection fails!
```

#### **The Solution: Secure URL Updates**

**Step 1: Create Update Script (Server-Side Only)**

```javascript
// scripts/update-urls.js
// ⚠️ RUN ON SERVER ONLY - NEVER IN FRONTEND!

const updateAllowedUrls = async () => {
  try {
    // 🔐 Use your stored credentials
    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const AUTH_SYSTEM_URL = process.env.AUTH_SYSTEM_URL;

    console.log('🔐 Authenticating with Auth-System...');
    
    // 1. Get authentication token
    const authResponse = await fetch(`${AUTH_SYSTEM_URL}/api/clientServer/handshake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      })
    });

    if (!authResponse.ok) {
      throw new Error('Authentication failed');
    }

    const { token } = (await authResponse.json()).data;
    console.log('✅ Authentication successful');

    // 2. Update allowed URLs
    console.log('🔄 Updating allowed return URLs...');
    
    const updateResponse = await fetch(`${AUTH_SYSTEM_URL}/api/clientServer/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        allowed_return_urls: [
          // 🏠 Keep development URLs (for testing)
          "http://localhost:4000",
          "http://localhost:4000/dashboard",
          "http://localhost:4000/profile",
          
          // 🚀 Add production URLs
          "https://trade.devalek.dev",
          "https://trade.devalek.dev/dashboard", 
          "https://trade.devalek.dev/profile",
          "https://trade.devalek.dev/auth/callback",
          
          // 🧪 Add staging URLs (optional)
          "https://staging.trade.devalek.dev",
          "https://staging.trade.devalek.dev/dashboard"
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

**Step 2: Environment Variables**

```bash
# .env.production
CLIENT_ID=client_f47ac10b58cc4372a5670e02b2c3d479
CLIENT_SECRET=550e8400-e29b-41d4-a716-446655440000  # From initial registration
AUTH_SYSTEM_URL=https://auth.yourcompany.com
```

**Step 3: Run During Deployment**

```bash
# In your CI/CD pipeline or deployment script
node scripts/update-urls.js
```

### **Built-in Security Safeguards**

The update process has multiple layers of security:

#### **1. Authentication Required**
- ✅ Must provide valid `client_secret`
- ✅ JWT token expires (24 hours)
- ✅ Token tied to specific client

#### **2. Authorization Checks**
```javascript
// Only the client can update their own URLs
// middleware/clientServerAuth.js validates:
// - Token signature
// - Token expiration  
// - Client existence
// - Scope restrictions
```

#### **3. Validation Rules**
- ✅ URLs must be valid format
- ✅ HTTPS required in production
- ✅ No wildcard patterns allowed
- ✅ Audit trail logged

### **Best Practices for URL Management**

#### **✅ Progressive URL Addition**
```javascript
// Good: Add new URLs while keeping old ones
allowed_return_urls: [
  "http://localhost:4000",        // Keep for dev
  "https://staging.yourdomain.com", // Add staging  
  "https://yourdomain.com"        // Add production
]
```

#### **✅ Environment-Specific Configurations**
```javascript
// config/urls.js
const getUrlsForEnvironment = (env) => {
  const baseUrls = {
    development: ["http://localhost:4000"],
    staging: ["https://staging.trade.devalek.dev"], 
    production: ["https://trade.devalek.dev"]
  };
  
  // Always include all environments for flexibility
  return Object.values(baseUrls).flat();
};
```

#### **✅ Automated URL Updates**
```yaml
# .github/workflows/deploy.yml
- name: Update Auth URLs
  run: |
    export CLIENT_ID=${{ secrets.CLIENT_ID }}
    export CLIENT_SECRET=${{ secrets.CLIENT_SECRET }}
    node scripts/update-urls.js
```

### **Emergency URL Recovery**

If you lose access due to URL mismatch:

#### **Option 1: Admin Override (if available)**
```bash
# Direct database access (admin only)
UPDATE client_servers 
SET allowed_return_urls = array['https://trade.devalek.dev']
WHERE client_id = 'your_client_id';
```

#### **Option 2: Support Contact**
Contact Auth-System administrators with:
- Your `client_id`
- Proof of domain ownership
- New URLs to add

### **Monitoring URL Changes**

```javascript
// Monitor for URL-related authentication failures
const monitorAuthFailures = async () => {
  // Log when return_url doesn't match any client
  if (!matchingClient) {
    console.warn('🚨 URL Mismatch:', {
      attempted_url: return_url,
      timestamp: new Date(),
      user_agent: req.headers['user-agent']
    });
  }
};
```

---

## Conclusion

The Frontend-Login-Proxy Mode provides a powerful, secure, and scalable solution for multi-tenant authentication. By understanding the registration process, schema detection mechanism, and implementing proper error handling, you can create a seamless authentication experience for your users while maintaining complete data isolation between clients.

### Key Takeaways:
- ✅ **One-time registration** creates permanent schema connection
- ✅ **URL-based detection** survives application redeployments  
- ✅ **Session-based security** provides robust web authentication
- ✅ **Automatic tenant isolation** ensures data security
- ✅ **Zero maintenance** schema management after initial setup

For API-based integration or more advanced use cases, see the [API_EXAMPLES.md](./API_EXAMPLES.md) documentation.
