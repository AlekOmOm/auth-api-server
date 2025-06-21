# Task 005: Backend API Health Check

## Priority: 🟡 HIGH

## Status: ⏳ TODO

## Issue Description
Frontend authentication tests are failing, potentially due to backend API issues or frontend-backend communication problems.

### Symptoms
- Registration endpoints may not be responding
- Login endpoints may not be setting sessions
- CORS issues between ports 3000 and 3001
- Session cookies not being set/read

## Investigation Steps

### 1. Manual API Testing
```bash
# Test registration endpoint
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPass123!",
    "role": "owner"
  }'

# Test login endpoint
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "email": "test@example.com",
      "password": "TestPass123!"
    }
  }'
```

### 2. Check CORS Configuration
```javascript
// In backend server.js, verify CORS settings
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 3. Verify Session Configuration
```javascript
// Check session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Should be false for local development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));
```

### 4. Check Frontend API Configuration
```javascript
// In authApi.js, verify fetch includes credentials
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important for cookies
  body: JSON.stringify(data)
});
```

## Debug Logging

### Add Backend Logging
```javascript
// In auth routes
router.post('/register', async (req, res) => {
  console.log('Registration request:', req.body);
  // ... existing code
});

router.post('/login', async (req, res) => {
  console.log('Login request:', req.body);
  console.log('Session before:', req.session);
  // ... existing code
  console.log('Session after:', req.session);
});
```

### Add Frontend Logging
```javascript
// In authApi.js
console.log('Making request to:', url);
console.log('Request body:', requestBody);
const response = await fetchPost(url, requestBody);
console.log('Response:', response);
```

## Container Health Check
```bash
# Check if containers are healthy
docker ps

# Check backend logs
docker logs auth-system-backend-1

# Check network connectivity
docker exec auth-system-frontend-1 curl http://backend:3001/health

# Restart containers if needed
docker-compose restart
```

## Files to Check
- Backend: `server.js`, `src/routes/auth.js`
- Frontend: `src/services/authApi.js`, `src/util/fetch.js`
- Docker: `docker-compose.yml`, container health

## Acceptance Criteria
- [ ] Registration API returns success response
- [ ] Login API returns session data
- [ ] Cookies are set in browser
- [ ] No CORS errors in console
- [ ] Frontend can communicate with backend
- [ ] Session persists across requests 