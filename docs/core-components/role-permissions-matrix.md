# Role Permissions Matrix

## Overview

This document provides a clear reference for role-based access control in the Auth System. The system uses three primary roles with different access levels across various endpoints.

## Role Definitions

### System Roles (auth_internal)

| Role      | Description              | Scope                                           |
| --------- | ------------------------ | ----------------------------------------------- |
| **admin** | System administrator     | Full system access, all schemas, all operations |
| **owner** | Client application owner | Manage own client applications and their users  |
| **user**  | Basic user               | Limited to basic authentication operations      |

### Client Schema Roles

| Role      | Description          | Scope                                          |
| --------- | -------------------- | ---------------------------------------------- |
| **admin** | Schema administrator | Full access within the client schema           |
| **user**  | Standard user        | Basic user operations within the client schema |

## Endpoint Permissions

### Authentication Endpoints

| Endpoint             | Admin | Owner | User | Notes                                         |
| -------------------- | ----- | ----- | ---- | --------------------------------------------- |
| `/api/auth/login`    | ✓     | ✓     | ✓    | All users can login                           |
| `/api/auth/register` | ✓     | ✓     | ✓    | Registration context determines role validity |
| `/api/auth/logout`   | ✓     | ✓     | ✓    | All authenticated users                       |
| `/api/auth/session`  | ✓     | ✓     | ✓    | All authenticated users                       |
| `/api/auth/me`       | ✗     | ✓     | ✓    | Non-admin users only                          |
| `/api/auth/admin`    | ✓     | ✗     | ✗    | Admin users only                              |
| `/api/auth/sessions` | ✓     | ✓     | ✓    | All authenticated users                       |

### User Management Endpoints

| Endpoint Pattern  | Admin | Owner | User | Notes      |
| ----------------- | ----- | ----- | ---- | ---------- |
| `/api/users`      | ✓     | ✗     | ✗    | Admin only |
| `/api/users/{id}` | ✓     | ✗     | ✗    | Admin only |

### Client Server Management

| Endpoint Pattern                      | Admin | Owner | User | Notes                            |
| ------------------------------------- | ----- | ----- | ---- | -------------------------------- |
| `/api/clientServer/register`          | ✓     | ✓     | ✓    | Public endpoint                  |
| `/api/clientServer/handshake`         | ✓     | ✓     | ✓    | Requires client credentials      |
| `/api/clientServer/me`                | ✓     | ✓     | ✓    | Requires bearer token            |
| `/api/clientServer/user/register`     | ✓     | ✓     | ✓    | Creates owner relationship       |
| `/api/clientServer/user/clients`      | ✓     | ✓*    | ✗    | *Owner sees only their clients   |
| `/api/clientServer/user/clients/{id}` | ✓     | ✓*    | ✗    | *Owner can only access their own |
| `/api/clientServer/{id}`              | ✓     | ✗     | ✗    | Admin only                       |

### Owner Management Endpoints

| Endpoint Pattern                               | Admin | Owner | User | Notes                               |
| ---------------------------------------------- | ----- | ----- | ---- | ----------------------------------- |
| `/api/owner/stats`                             | ✓     | ✓*    | ✗    | *Owner sees only their client stats |
| `/api/owner/clients/{clientId}/users`          | ✓     | ✓*    | ✗    | *Owner must own the client          |
| `/api/owner/clients/{clientId}/users/{userId}` | ✓     | ✓*    | ✗    | *Owner must own the client          |
| `/api/owner/clients/{clientId}/analytics`      | ✓     | ✓*    | ✗    | *Owner must own the client          |

### Schema Management Endpoints

| Endpoint Pattern   | Admin | Owner | User | Notes                                |
| ------------------ | ----- | ----- | ---- | ------------------------------------ |
| `/api/schema`      | ✓     | ✓*    | ✗    | *Owner sees only their schemas       |
| `/api/schema/{id}` | ✓     | ✓*    | ✗    | *Owner can only manage their schemas |

## Permission Rules

### Admin Role
- Full access to all endpoints
- Can view and manage all schemas
- Can impersonate or act on behalf of any user
- Can delete any resource

### Owner Role
- Can only manage resources they own:
  - Their client applications
  - Users within their client schemas
  - Analytics for their clients
- Cannot access other owners' resources
- Cannot perform system-wide operations

### User Role
- Basic authentication operations
- Access to their own user data
- Cannot manage other users
- Cannot create or manage client applications

## Schema Context

The X-Schema-Context header determines which schema's data is accessed:
- **auth_internal**: System operations, owner/admin management
- **client_***: Tenant-specific operations

## Security Notes

1. **Ownership Verification**: The system always verifies ownership before granting access
2. **Schema Isolation**: Users in one schema cannot access data in another schema
3. **Role Escalation**: Users cannot change their own role or grant higher permissions
4. **Audit Trail**: All permission-based operations are logged for security auditing 