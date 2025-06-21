# multi-tenant authentication system 

auth-system allows for multiple client apps to be onboarded to the system.

core components:
- [client app authorization](./components/client-app-authorization.md)
- [frontend url detection](./components/frontend-url-detection.md)
- [schema detection](./components/schema-detection.md)
- [auth-session endpoint](./components/auth-session-endpoint.md)

## client servers 
- represent client applications, which utilize the auth-system

### utilization

auth-system provides authorization by registration of:
- identifier_url
- entry_point_url
- authorized_urls

#### frontend-login-proxy

pre-condition:
- auth-system user registration
- client registration

authorization flow, is as follows:

- from `identifier_url` (or any `authorized_urls`)
- to `/login` on the auth-system frontend
- login process performed
- redirection to `entry_point_url`

only requires:
- on any protected endpoints
- check isAuthenticated (/api/auth/session)

## session management enhancement

The session management system has been enhanced with **Redis caching** for performance while preserving the existing schema-based tenant isolation:

### hybrid session storage

**Primary Storage**: PostgreSQL sessions in each tenant schema (existing)
**Cache Layer**: Redis for fast session validation (new enhancement)

#### session validation flow (enhanced)

1. **Fast Path**: Check Redis cache first (`sess:{schema}:{session_id}`)
2. **Fallback**: If cache miss, query PostgreSQL session table in tenant schema
3. **Cache Population**: Store valid session in Redis for subsequent requests
4. **Tenant Isolation**: Redis keys include schema name to maintain isolation

#### performance benefits

- Session validation: <10ms (Redis) vs 50-100ms (PostgreSQL)
- Maintains existing audit trail in PostgreSQL
- Zero breaking changes to existing CRUD operations
- Backward compatible: can disable Redis without system impact

## schema relations (enhanced)

```
auth_internal (schema)
├── client_servers (table)
│   ├── client_id: "auth_system_internal"
│   ├── assigned_schema_name: "auth_internal"
│   └── identifier_url: "https://auth-system.com"
│   
│   ├── client_id: "trading_sim_app"
│   ├── assigned_schema_name: "client_trading_sim"
│   └── identifier_url: "https://.../home"
│
└── (potentially other auth-system management tables)

auth_internal (schema) - for auth-system's own users
├── users (table)
└── sessions (table) ←── Redis cache: sess:auth_internal:{session_id}

client_trading_sim (schema) - for trading app's users
├── users (table)
└── sessions (table) ←── Redis cache: sess:client_trading_sim:{session_id}
```

### redis session keys

Redis maintains tenant isolation through schema-prefixed keys:

```
sess:auth_internal:uuid-session-id-1
sess:client_trading_sim:uuid-session-id-2
sess:client_another_app:uuid-session-id-3
```

This ensures:
- **Tenant Isolation**: Redis keys follow same schema-based isolation as PostgreSQL
- **Performance**: Fast session lookups without cross-tenant data exposure
- **Compatibility**: Works seamlessly with existing schema resolution logic
- **Rollback Safety**: Disabling Redis preserves all existing functionality
