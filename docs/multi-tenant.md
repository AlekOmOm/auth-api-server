
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


## schema relations

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
└── sessions (table)

client_trading_sim (schema) - for trading app's users
├── users (table)
└── sessions (table)
```


