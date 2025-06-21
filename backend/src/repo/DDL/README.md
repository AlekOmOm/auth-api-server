# DDL structure for multi-tenant auth-system

```
auth_internal:
  ✅ client_servers (client management)
  ✅ users (owners, admins, auth-system users) 
  ✅ sessions (auth-system sessions)

trading-sim:
  ✅ users (tenant users)
  ✅ sessions (tenant sessions)
```

## key design decisions:
- multi-tenant -> multi-schemas
- singular interface for auth-system
- multi-interface support for Client Applications
  - `frontend-login-proxy`
    - redirection to Login Process of Auth-System (URL and Session-based)
  - `api-auth-server`  
    - server-to-server (JWT-based)
- schema detection
  - all requests are naturally routed
  - middleware auto-detects schema `detection.js` 
    - req.session

## implemented by:
- **single** Postgres **database instance**  -> simple network connectivity 
  - single Docker container
- **multiple** Postgres **schemas**  -> tenant data isolation
  - auth_internal: auth-system data
  - client_servers: client applications

## requirements:
- auth_internal initialization by Docker container
- Runtime DDL for client_servers
  - .js files in `./DDL/`
  - interpolated with `tenant` parameter
- Schema detection


## terms
- tenant: client application
  - client_servers: client applications
- DDL: Data Definition Language
- schema: logical grouping of tables
- table: collection of data


