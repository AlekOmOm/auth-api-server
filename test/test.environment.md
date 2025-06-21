D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\

status: 
🔐 Auth System User Creation & Access
✅ Started the auth system - Launched all services (frontend, backend, database) using docker-compose
✅ Found existing owner account - Discovered test users in the database including owner@example.com with role owner
✅ Successfully authenticated - Logged in with owner credentials (owner@example.com / password123)
✅ Accessed the Owner Panel - Successfully navigated to and viewed the owner panel interface

Standards
- openapi specs: 
  - docs/core-components/OpenAPI-Specs.yaml
- core-components: 
  - docs/core-components/
- backend: 
  - backend\src\
- frontend: 
  - frontend\src\
- db: 
  - db\sql\schemas\
- make:
  - Makefile
- playwright tests: 
  - test\playwright-tests\

MCP Tool: 
- main testing tool: Playwright
- check db: postgres

Docker containers running:
- frontend: localhost:3000 (Access via `http://localhost:3000`)
- backend: localhost:3001 (API base URL `http://localhost:3001/api`)
- database: localhost:5432

Make cmds:
`make run` runs all containers
`make restart` restarts all containers
`make restart-full-backend` removes all backend-related resources (container, image, volume) and restarts the backend. Useful for a clean backend state before testing.
`make logs-backend` shows logs of backend
`make logs-frontend` shows logs of frontend

terminal cmds:
`cls; make restart-full-backend;` - runs `make logs-backend` automatically after restarting backend. (Windows specific `cls`)
For other OS: `make restart-full-backend && make logs-backend`

## Running Backend Integration Tests (Vitest)

Backend integration tests use Vitest and are designed to test the API endpoints by interacting with the live backend service running in its Docker container.

**Prerequisites:**
1.  Ensure all Docker containers are running: `make run` or ensure they are already up.
2.  The backend service should be fully initialized. If you just restarted the backend, wait a few moments for it to be ready. Check `make logs-backend` for confirmation (e.g., "Server running on port 3001").

**Command:**
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Run the integration test script:
    ```bash
    npm run test:integration
    ```
    This command executes `vitest run --testNamePattern="Integration Tests"`, which specifically runs tests from files named `*.integration.test.js`. Other unit/service tests (e.g., `*.service.test.js`, `*.test.js` without `.integration`) will be skipped.

**Expected Output:**
- Vitest will output the results of the integration tests. Pay attention to the number of passed, failed, and skipped tests.

**Common Issues & Troubleshooting:**
- **Widespread `400 Bad Request` Errors:** If many integration tests fail with `400 Bad Request`, it often indicates underlying issues in the backend, such as problems with database connectivity, request validation, or core service logic. Refer to `backend/src/test/issues.backend.md` for detailed analysis of known critical bugs (e.g., repository layer issues, authentication service problems).
- **Mocking Errors in Non-Integration Files:** You might see suite-level errors for files like `clientServer.service.test.js` related to mocking (`Cannot access 'mockFromRequestBody' before initialization`). While these are not integration tests and would be skipped by the `test:integration` script's pattern, these errors indicate issues in those specific test file setups.
- **"No test files found":** If you try to run `npm run test -- "src/**/*.integration.test.js"` directly, it might fail to find files on some systems/shells. Use `npm run test:integration` for reliable execution of integration tests.
- **Database Connection Issues:** Ensure your `.env` file (or `.env.test`) in the `backend` directory has the correct `POSTGRES_HOST`, `POSTGRES_DB`, etc., pointing to the Dockerized PostgreSQL instance (usually `localhost` or the Docker service name if running tests from within another container). The `vitest.config.js` sets these defaults if not present.

Main features to test:
- registration of auth-system user
- login of auth-system user
- CRUD client-server from Owner Panel for auth-system user

main documentation: 
- docs/core-components/

---

main idea:
- multi tenant auth system
- auth-system user can create client-server
- client-server user can login and use the Client-server Applications (authorization given by URLs registered with client-server entities) 
- two schemas: 
  - db\sql\schemas\auth_internal_complete.sql
  - db\sql\schemas\client_server_template.sql


---

test loop until:
- [ ] auth-system user can register
- [ ] auth-system user can login
- [ ] auth-system user can create client-server
- [ ] auth-system user can Manage client-server
- [ ] client-app (trading-sim) can login and use the Client-server Applications (authorization given by URLs registered with client-server entities) 
  - flow for client-app: localhost:5173 /home -> click login -> (redirected to auth-system login page) logs in (or register&login) -> redirect to (client-server registered entry_point_url)