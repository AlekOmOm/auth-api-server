# Auth-System – Usage Overview

This document explains **two complementary ways** your application (referred as *clientServer*) can take advantage of the **Auth-System**:

1. **Frontend-Login-Proxy** – Redirect unauthenticated users to Auth-System's built-in UI, obtain a session cookie, and seamlessly send the user back to your app.
2. **API-Auth-Server** – Consume Auth-System purely as a backend service (via REST or Socket.IO) from your server-side code to perform authentication, authorisation and user management.

Detailed, copy-paste ready implementation steps live in [`USAGE-IMPLEMENTATION-NEEDED.md`](./USAGE-IMPLEMENTATION-NEEDED.md).  
Use the information below to decide *which mode* fits your project and to understand the high-level architecture in each case.

---

## Glossary

| Term | Meaning |
|------|---------|
| **clientServer** | Your application that wants to outsource authentication/authorisation. |
| **Auth-System** | This repository – a Node/Express + Svelte full-stack authentication provider. |
| **Session Cookie** | HTTP-only cookie set by Auth-System that keeps users logged-in. |
| **Return URL** | Absolute URL inside clientServer that the user was trying to reach before being redirected to Auth-System. |

---

## Core Concepts

1. **Modular database schema**  
   • Each clientServer gets its **own isolated database** (or schema/namespace).  
   • Auth-System keeps a registry of authorised clientServers and dynamically opens the correct DB connection based on the active **socket or API token**.

2. **Pluggable front-end**  
   • Auth-System ships with a ready-made login / register UI (Svelte).  
   • You can keep using your own UI – just consume the API-Auth-Server endpoints.

3. **Session based by default**  
   • Secure, HTTP-only cookie (`SameSite=Lax`, configurable) is issued after successful login.  
   • Token/JWT support can be enabled per client (see implementation file).

---

## 1. Frontend-Login-Proxy

### Typical Flow

```mermaid
sequenceDiagram
    participant User
    participant Client as clientServer
    participant Auth as Auth-System

    User->>Client: Request protected page
    Client->>Client: No valid session?
    Client-->>User: HTTP 302 to Auth-System /login?return_url=<original>
    User->>Auth: GET /login
    Auth-->>User: Render login form
    User->>Auth: POST /login (credentials)
    Auth->>Auth: Validate & create session
    Auth-->>User: Set session cookie; HTTP 302 <return_url>
    User->>Client: Request <return_url> with session cookie
    Client->>Auth: GET /api/auth/session (cookie)
    Auth-->>Client: { user }
    Client-->>User: Render requested page
```

### Minimum Integration Checklist

1. **Redirect unauthenticated requests**  
   Add middleware in your router / reverse-proxy that checks `GET /api/auth/session` (or `req.session.user`). If not present, perform a 302 redirect to:

   ```
   http://<AUTH_SYSTEM_HOST>:<PORT>/login?return_url=<URL-ENCODED_CURRENT_REQUEST>
   ```

2. **Trust Auth-System's session cookie**  
   • For local development set `FRONTEND_PORT` in `.env` so CORS & cookies match.  
   • In production use the same top-level domain or enable `SameSite=None; Secure`.

3. **(Optional) Consume user info**  
   Call `GET /api/auth/me` to fetch the authenticated user object after redirect.

See the implementation file for copy-paste middleware snippets for **Express**, **Svelte-Kit** and **Nginx**.

---

## 2. API-Auth-Server

Use this mode when you only need Auth-System's **business logic & DB orchestration** – for example in a mobile app backend, microservice or CLI.

### Typical Flow

1. **Server-to-Server handshake**  
   • clientServer sends a signed `POST /api/clientServer/handshake` with its `client_id` and shared secret.  
   • Auth-System validates, opens (or creates) the per-client database, and returns a short-lived **API token**.

2. **Authenticated API calls**  
   Subsequent requests include the token in the `Authorization: Bearer <token>` header when calling e.g.:
   ```
   POST /api/auth/login
   GET  /api/users
   ```

3. **Realtime channel (optional)**  
   If you enable Socket.IO, the initial handshake takes place during the connection event; the opened socket is then bound to the correct DB instance.

### Minimum Integration Checklist

- Store `AUTH_SYSTEM_URL` and `CLIENT_SERVER_ID` in your env.  
- Perform the handshake on application start-up and cache the token.  
- Use the token for all subsequent Auth-System API calls.  
- Refresh token on `401`.

Implementation examples are provided for **Node/Express** inside `USAGE-IMPLEMENTATION-NEEDED.md`.

---

## Modular Database Schema

```
auth-system
└── databases/
    ├── default/             # admin / auth-system internal
    ├── acme_corp/           # clientServer 'acme_corp'
    ├── foobar_inc/          # clientServer 'foobar_inc'
    └── ...
```

At runtime Auth-System maps:

```
<client_id>  →  postgres://user:pass@host:5432/<schema>
```

Connections are cached per socket or API token ensuring **hard multi-tenancy isolation**.

---

## Next Steps

1. Choose your mode and read the corresponding section again.  
2. Jump to [`USAGE-IMPLEMENTATION-NEEDED.md`](./USAGE-IMPLEMENTATION-NEEDED.md) for concrete code snippets.  
3. Review backend/README for full REST endpoint tables.

Happy authenticating! 🚀





