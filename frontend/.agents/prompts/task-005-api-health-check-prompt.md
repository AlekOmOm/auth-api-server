# Agent Prompt: Backend API Health Check (Recommended Starting Point)

## Context
You are investigating why the frontend Playwright E2E tests are failing (0/21 passing) for an auth-system. Before fixing frontend issues, we need to verify the backend API is healthy and properly configured.

## Current Situation
- Frontend: http://localhost:3000 (Svelte app)
- Backend: http://localhost:3001 (Node.js/Express)
- Database: PostgreSQL on port 5432
- All services running in Docker containers
- Symptoms: Registration and login flows not completing, possible CORS/session issues

## Your Task
Please perform a backend API health check as described in: `frontend/.agents/tasks/005-backend-api-health-check.md`

### Investigation Areas
1. **API Endpoints**: Test if `/api/auth/register` and `/api/auth/login` are responding
2. **CORS Configuration**: Verify cross-origin requests are allowed with credentials
3. **Session Management**: Check if cookies are being set properly
4. **Container Health**: Ensure all Docker containers are running correctly

## Key Commands
```bash
# Check container status
docker ps

# Test registration endpoint
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "TestPass123!", "role": "owner"}'

# Check backend logs
docker logs auth-system-backend-1

# Test from frontend container
docker exec auth-system-frontend-1 curl http://backend:3001/health
```

## Files to Check
- Backend: `server.js` (CORS and session config)
- Backend: `src/routes/auth.js` (auth endpoints)
- Frontend: `src/services/authApi.js` (API calls)
- Frontend: `src/util/fetch.js` (fetch configuration)

## Success Criteria
1. Registration API returns success response with proper structure
2. Login API returns session data and sets cookie
3. No CORS errors when frontend calls backend
4. Session cookies visible in browser DevTools
5. Clear understanding of any API issues before fixing frontend

## Next Steps
After completing this health check:
- If API issues found: Fix them first
- If API healthy: Proceed to Task 001 (Registration Redirect)
- Document any findings for the team

Please start by reading the task file and systematically checking each area. Report your findings clearly.

---

_This is the recommended starting point. Once backend health is verified, we'll fix registration redirect (Task 001), login redirect (Task 002), protected routes (Task 003), and error display (Task 004)._ 