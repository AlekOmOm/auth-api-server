D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend

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
- frontend: localhost:3000
- backend: localhost:3001
- database: localhost:5432

Make cmds:
`make run` runs all containers
`make restart` restarts all containers
`make restart-full-backend` removes all (container, image, volume) and restarts backend
`make logs-backend` shows logs of backend
`make logs-frontend` shows logs of frontend

terminal cmds:
`cls; make restart-full-backend;` - runs make logs-backend automatically after restarting backend

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