# Frontend Issues Ledger
## Last Updated: 2025-06-12T08:00:00.000Z
## Test Run: 07e8706

## **TEST FAILURE LEDGER**

### authApi Integration Tests - Registration failed
status: open
suite: frontend-unit
file: frontend/src/__tests__/services/authApi.integration.test.js
project: vitest
first-failed: 2025-06-12T08:00:00.000Z
last-seen: 2025-06-12T08:00:00.000Z
commit: 07e8706
error:
```
TypeError: fetch failed
    at node:internal/deps/undici/undici:13510:13
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
Cause: AggregateError:
    code: 'ECONNREFUSED'
```

### authStore Integration Tests - Store Registration failed
status: open
suite: frontend-unit
file: frontend/src/__tests__/stores/authStore.integration.test.js
project: vitest
first-failed: 2025-06-12T08:00:00.000Z
last-seen: 2025-06-12T08:00:00.000Z
commit: 07e8706
error:
```
AssertionError: expected false to be true // Object.is equality
    at src/__tests__/stores/authStore.integration.test.js:83:38
```

### Frontend Integration Test Suite - Backend not accessible
status: open
suite: frontend-unit
file: frontend/src/__tests__/integration.test.js
project: vitest
first-failed: 2025-06-12T08:00:00.000Z
last-seen: 2025-06-12T08:00:00.000Z
commit: 07e8706
error:
```
Error: Backend not accessible. Please start Docker services.
    at src/__tests__/integration.test.js:34:16
```

### Owner Panel Access - Navigation failure
status: open
suite: e2e
file: frontend/test/playwright-tests/auth-system/owner-panel-access.spec.js
project: chromium
first-failed: 2025-06-12T08:00:00.000Z
last-seen: 2025-06-12T08:00:00.000Z
commit: 07e8706
error:
```
Timed out 5000ms waiting for expect(locator).toHaveURL(expected)
Expected string: "http://localhost:3000/home"
Received string: "http://localhost:3000/login"
```

### Login Owner Tests - Homepage display failure
status: open
suite: e2e
file: frontend/test/playwright-tests/login-owner.spec.js
project: chromium
first-failed: 2025-06-12T08:00:00.000Z
last-seen: 2025-06-12T08:00:00.000Z
commit: 07e8706
error:
```
Timed out 5000ms waiting for expect(locator).toContainText(expected)
Locator: locator('h2')
Expected string: "Auth System"
Received string: "Login"
```

### Simple Test - Auth System heading not found
status: open
suite: e2e
file: frontend/test/playwright-tests/simple.test.js
project: chromium
first-failed: 2025-06-12T08:00:00.000Z
last-seen: 2025-06-12T08:00:00.000Z
commit: 07e8706
error:
```
Timed out 5000ms waiting for expect(locator).toContainText(expected)
Locator: locator('h2')
Expected string: "Auth System"
Received string: "Login"
``` 