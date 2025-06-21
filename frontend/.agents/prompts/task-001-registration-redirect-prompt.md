# Agent Prompt: Fix Registration Redirect Issue

## Context
You are working on the frontend of an auth-system built with Svelte. The Playwright E2E tests are currently failing (0/21 passing) due to authentication flow issues. Your task is to fix the registration redirect issue which is blocking 8 tests.

## Current Situation
- Frontend running at: http://localhost:3000
- Backend running at: http://localhost:3001
- All containers are running in Docker
- Registration form submits successfully but doesn't redirect to login page

## Your Task
Please fix the registration redirect issue as described in: `frontend/.agents/tasks/001-fix-registration-redirect.md`

### Problem Summary
- **Current behavior**: After successful registration, the page stays on `/register` or times out
- **Expected behavior**: Should redirect to `/login?registered=true` with success message
- **Blocks**: 8 Playwright tests

## Key Files to Review
1. `frontend/src/routes/card/Register.svelte` - Registration component
2. `frontend/src/stores/authStore.js` - Auth state management
3. `frontend/src/util/returnUrlHandler.js` - URL handling utilities
4. `frontend/src/services/authApi.js` - API service

## Test Commands
```bash
# Test the specific registration flow
cd frontend
npx playwright test auth-flow.spec.js -g "should register" --headed

# Run all auth tests
npm run test:e2e auth-flow.spec.js

# Debug mode
npm run test:e2e:debug
```

## Success Criteria
1. Registration successfully redirects to `/login?registered=true`
2. The Playwright test "should register a new auth-system user successfully" passes
3. No JavaScript errors in the console
4. The fix is clean and doesn't break other functionality

## Additional Notes
- The registration API appears to be working (returns success)
- The issue is likely in the frontend navigation logic
- Check the setTimeout and navigate() function in Register.svelte around line 54-57
- Consider if the 2-second timeout is too long or if navigate() is not working properly

Please start by reading the task file and then investigating the issue. Show your debugging process and test your fixes before finalizing.

---

_This is Task 001 of 5 tasks needed to fix all Playwright tests. After this, we need to fix login redirect (Task 002), protected routes (Task 003), and error display (Task 004)._ 