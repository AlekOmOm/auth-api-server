# Client Application Authorization

## Purpose

Enable **client applications** to verify authentication and authorization at runtime using a single endpoint call. Client apps can protect routes and make authorization decisions without understanding database schemas or multi-tenant complexity.

**Simple Contract**:
```
GET https://auth.example.com/api/auth/session → 200 OK | 401 Unauthorized
```

## OpenAPI-Compliant Response

**Reference**: [`auth-session-endpoint.md`](auth-session-endpoint.md) | [`OpenAPI-Specs.yaml:280-320`](OpenAPI-Specs.yaml)

### Success Response (200)
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

### Response Fields
- **`role`**: User role (`user|admin|owner`) for UI feature toggling
- **`schema`**: Tenant context (informational)
- **`authorized_urls`**: URLs this user can access (for route protection)

## Client Integration Examples

### SPA Route Protection (React/Svelte)
```javascript
// Auth store with session validation
export async function checkAuthentication() {
  const response = await fetch("https://auth.example.com/api/auth/session", { 
    credentials: "include" 
  });
  
  if (response.ok) {
    const { data } = await response.json();
    
    // Store user data
    authStore.set({
      isAuthenticated: true,
      user: data
    });
    
    return data;
  } else {
    // Redirect to auth system
    const loginUrl = "https://auth.example.com/login";
    window.location.href = loginUrl;
    return null;
  }
}

// Route guard using authorized URLs
export function canAccessRoute(path, authorizedUrls) {
  const fullUrl = `${window.location.origin}${path}`;
  return authorizedUrls.some(url => fullUrl.startsWith(url));
}
```

### Server-Side Rendering (Next.js/SvelteKit)
```javascript
// pages/dashboard.js (Next.js)
export async function getServerSideProps(context) {
  const { req } = context;
  
  const response = await fetch("https://auth.example.com/api/auth/session", {
    headers: {
      cookie: req.headers.cookie || ""
    }
  });
  
  if (!response.ok) {
    return {
      redirect: {
        destination: "https://auth.example.com/login",
        permanent: false
      }
    };
  }
  
  const { data } = await response.json();
  
  return {
    props: {
      user: data
    }
  };
}
```

### Route Guard Implementation
```javascript
// Client app router middleware
async function routeGuard(to, from, next) {
  try {
    const userData = await checkAuthentication();
    
    if (!userData) {
      // checkAuthentication handles redirect
      return;
    }
    
    // Check if route is authorized
    if (!canAccessRoute(to.path, userData.authorized_urls)) {
      next('/access-denied');
      return;
    }
    
    // Store user context for components
    app.config.globalProperties.$user = userData;
    next();
    
  } catch (error) {
    console.error('Route guard error:', error);
    window.location.href = "https://auth.example.com/login";
  }
}
```

## Multi-Tenant URL Detection

### Automatic Tenant Detection
When redirecting to the auth-system:

```javascript
// Simple redirect - referer header automatically set
function redirectToLogin() {
  window.location.href = "https://auth.example.com/login";
}

// The auth-system automatically:
// 1. Reads Referer header (e.g., "https://trading-sim.com/dashboard")
// 2. Matches against client's authorized_urls
// 3. Sets correct tenant schema (client_trading_sim)
// 4. After login, redirects to entry_point_url
```

### URL Configuration
**Managed via Owner Panel**: `/owner` → Client Applications → Edit URLs

- **identifier_url**: Primary client identifier
- **entry_point_url**: Post-login destination
- **authorized_urls**: Array of URLs that can initiate login

## Error Handling

### Authentication Failures
```javascript
async function handleSessionCheck() {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include"
    });
    
    switch (response.status) {
      case 200:
        const { data } = await response.json();
        return data;
        
      case 401:
        // Not authenticated
        redirectToLogin();
        break;
        
      case 403:
        // Session revoked
        showError("Your session has been revoked. Please login again.");
        redirectToLogin();
        break;
        
      default:
        throw new Error(`Unexpected response: ${response.status}`);
    }
  } catch (error) {
    console.error('Session check failed:', error);
    // Fallback to login
    redirectToLogin();
  }
}
```

### Network Error Handling
```javascript
// Retry logic for network issues
async function checkSessionWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await checkAuthentication();
    } catch (error) {
      if (attempt === maxRetries) {
        // Final attempt failed
        showError("Unable to verify authentication. Please try again.");
        return null;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

## Security Considerations

### CORS Configuration
```javascript
// Auth-system CORS setup for client apps
app.use(cors({
  origin: [
    "https://trading-sim.com",
    "https://another-client.com"
  ],
  credentials: true  // Required for session cookies
}));
```

### Cookie Security
- **HttpOnly**: Session cookies not accessible via JavaScript
- **Secure**: HTTPS-only transmission in production
- **SameSite**: CSRF protection

### URL Validation
- Client apps should validate `authorized_urls` from session response
- Never trust client-side route permissions alone
- Server-side validation remains authoritative

## Testing Integration

### Unit Tests
```javascript
// Mock session endpoint for testing
beforeEach(() => {
  fetchMock.get("https://auth.example.com/api/auth/session", {
    status: 200,
    body: {
      message: "User retrieved successfully",
      data: {
        id: "test-user",
        role: "user",
        authorized_urls: ["https://test-app.com"]
      }
    }
  });
});

test("should allow access to authorized routes", async () => {
  const userData = await checkAuthentication();
  expect(canAccessRoute("/dashboard", userData.authorized_urls)).toBe(true);
});
```

### Integration Tests
```javascript
// Test full authentication flow
test("should redirect unauthorized users to login", async () => {
  fetchMock.get("/api/auth/session", { status: 401 });
  
  // Mock window.location.href
  delete window.location;
  window.location = { href: "" };
  
  await checkAuthentication();
  
  expect(window.location.href).toBe("https://auth.example.com/login");
});
```

---

**Summary**: Client applications need only call one endpoint (`/api/auth/session`) to handle all authentication and authorization logic. The auth-system handles multi-tenant complexity, schema detection, and URL-based permissions automatically. 