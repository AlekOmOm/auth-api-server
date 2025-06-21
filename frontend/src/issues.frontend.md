# Frontend Test Issues Ledger

### NPM Dependencies Installation Failure
status: open
suite: frontend-unit
file: frontend package dependencies
project: frontend
first-failed: 2025-06-12T11:03:05.484Z
last-seen: 2025-06-12T11:03:05.484Z
commit: 3e40520
error:
```
npm error code EPERM
npm error syscall unlink
npm error path rollup.win32-x64-msvc.node
npm error errno -4048
EPERM: operation not permitted, unlink rollup dependency
Frontend tests cannot run due to dependency installation failure.
```

### Vitest Test Runner Not Available
status: open
suite: frontend-unit
file: frontend test execution
project: frontend
first-failed: 2025-06-12T11:03:05.484Z
last-seen: 2025-06-12T11:03:05.484Z
commit: 3e40520
error:
```
'vitest' is not recognized as an internal or external command
Frontend unit tests cannot execute due to missing test runner
All frontend tests skipped due to installation failure
```

### E2E Test User Registration Failure
status: open
suite: e2e
file: test/playwright-tests/auth-system/owner-panel-access.spec.js
project: frontend
first-failed: 2025-06-12T11:03:28.632Z
last-seen: 2025-06-12T11:03:28.632Z
commit: 3e40520
error:
```
[BEFORE_ALL] FAILED to register user guitestowner@example.com. Status: 400
Schema could not be determined for the registration request.
All E2E tests failing due to user registration prerequisites not met.
```

### E2E Authentication Flow Failure
status: open
suite: e2e
file: test/playwright-tests/auth-system/owner-panel-access.spec.js
project: frontend
first-failed: 2025-06-12T11:03:28.632Z
last-seen: 2025-06-12T11:03:28.632Z
commit: 3e40520
error:
```
Timed out waiting for expect(locator).toHaveURL("http://localhost:3000/home")
Received string: "http://localhost:3000/login"
Login process not redirecting to home page - authentication failing
6 out of 6 E2E tests failed due to authentication flow breakdown
```

### Frontend-Backend Integration Failure
status: open
suite: e2e
file: test/playwright-tests/auth-system/owner-panel-access.spec.js
project: frontend
first-failed: 2025-06-12T11:03:28.632Z
last-seen: 2025-06-12T11:03:28.632Z
commit: 3e40520
error:
```
Frontend cannot complete authentication flows due to backend API failures
All protected routes inaccessible - users stuck on login page
Owner Panel and protected features completely unavailable
``` 