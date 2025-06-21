# Database Schema Documentation

## Overview

The Auth System uses PostgreSQL with a multi-tenant architecture where each client application has its own isolated schema within a single database. This approach provides strong data isolation while maintaining operational efficiency.

## Database Structure

```
PostgreSQL Database: auth_system_db
├── Schema: auth_internal (System schema)
│   ├── Table: client_servers
│   └── Table: users
│
├── Schema: client_<tenant_id> (Per-client schemas)
│   ├── Table: users
│   └── Table: sessions
│
└── Schema: client_template (Default template schema)
    ├── Table: users
    └── Table: sessions
```

## Schemas

### 1. auth_internal Schema

The system schema containing global authentication system data.

#### Table: client_servers

Stores registered client applications.

| Column               | Type         | Constraints                             | Description                             |
| -------------------- | ------------ | --------------------------------------- | --------------------------------------- |
| client_id            | UUID         | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier for the client        |
| app_name             | VARCHAR(255) | NOT NULL                                | Human-readable application name         |
| client_secret        | VARCHAR(255) | NOT NULL                                | Hashed client secret for authentication |
| assigned_schema_name | VARCHAR(63)  | NOT NULL, UNIQUE                        | PostgreSQL schema name for this client  |
| allowed_return_urls  | TEXT[]       | NOT NULL                                | Array of allowed redirect URLs          |
| client_mode          | VARCHAR(50)  | DEFAULT 'frontend-login-proxy'          | Client operation mode                   |
| owner_id             | UUID         | REFERENCES users(id)                    | ID of the user who owns this client     |
| created_at           | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP               | Creation timestamp                      |
| updated_at           | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP               | Last update timestamp                   |

**Indexes:**
- `idx_client_servers_owner_id` on (owner_id)
- `idx_client_servers_client_id` on (client_id)

#### Table: users

Stores system administrators and client owners.

| Column     | Type         | Constraints                                  | Description                |
| ---------- | ------------ | -------------------------------------------- | -------------------------- |
| id         | UUID         | PRIMARY KEY, DEFAULT uuid_generate_v4()      | Unique user identifier     |
| name       | VARCHAR(50)  | NOT NULL                                     | User's display name        |
| email      | VARCHAR(50)  | NOT NULL, UNIQUE                             | User's email address       |
| password   | VARCHAR(255) | NOT NULL                                     | Bcrypt hashed password     |
| role       | VARCHAR(20)  | NOT NULL, CHECK (role IN ('admin', 'owner')) | User's system role         |
| created_at | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP                    | Account creation timestamp |
| updated_at | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP                    | Last update timestamp      |

**Indexes:**
- `idx_auth_internal_users_email` on (email)

### 2. client_<tenant_id> Schemas

Each client application gets its own schema with isolated user data.

#### Table: users

Stores end users for the specific client application.

| Column     | Type         | Constraints                             | Description                       |
| ---------- | ------------ | --------------------------------------- | --------------------------------- |
| id         | UUID         | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique user identifier            |
| name       | VARCHAR(50)  | NOT NULL                                | User's display name               |
| email      | VARCHAR(50)  | NOT NULL, UNIQUE                        | User's email address              |
| password   | VARCHAR(255) | NOT NULL                                | Bcrypt hashed password            |
| role       | VARCHAR(20)  | DEFAULT 'user'                          | User's role within the client app |
| created_at | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP               | Account creation timestamp        |
| updated_at | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP               | Last update timestamp             |

**Indexes:**
- `idx_<schema>_users_email` on (email)

#### Table: sessions

Stores active user sessions for the client application.

| Column     | Type         | Constraints                                      | Description                |
| ---------- | ------------ | ------------------------------------------------ | -------------------------- |
| session_id | VARCHAR(255) | PRIMARY KEY                                      | Express session ID         |
| user_id    | UUID         | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | Associated user            |
| ip_address | INET         |                                                  | Client IP address          |
| user_agent | TEXT         |                                                  | Client user agent string   |
| created_at | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP                        | Session creation time      |
| expires_at | TIMESTAMP    | NOT NULL                                         | Session expiration time    |
| revoked    | BOOLEAN      | DEFAULT FALSE                                    | Whether session is revoked |

**Indexes:**
- `idx_<schema>_sessions_user_id` on (user_id)
- `idx_<schema>_sessions_expires_at` on (expires_at)

### 3. client_template Schema

Template schema used as default for operations without specific tenant context.

Structure identical to client_<tenant_id> schemas but serves as:
- Fallback for unmatched requests
- Template for creating new client schemas
- Development and testing purposes

## Schema Lifecycle

### Creation
1. Client registration triggers schema creation
2. Schema name generated: `client_<sanitized_app_name>_<random_suffix>`
3. Tables created from template
4. Permissions set for application isolation

### Migration
- Schema updates applied via migration scripts
- All client schemas updated together to maintain consistency
- Backward compatibility maintained for API contracts

### Deletion
1. Client deletion triggers schema CASCADE drop
2. All user data and sessions removed
3. Schema name released for reuse

## Connection Pooling Strategy

The system uses different connection pools based on operation context:

| Pool Context  | Description           | Schema Access               |
| ------------- | --------------------- | --------------------------- |
| AUTH_INTERNAL | System operations     | auth_internal only          |
| CLIENT_TENANT | User operations       | Specific client_<tenant_id> |
| API_CLIENT    | Server-to-server auth | Multiple schemas            |
| DEFAULT       | Fallback operations   | client_template             |

## Security Considerations

1. **Schema Isolation**: Each client's data is completely isolated in separate schemas
2. **Connection Security**: Each pool has restricted permissions
3. **SQL Injection Prevention**: Schema names are validated and parameterized
4. **Password Storage**: All passwords hashed with bcrypt (cost factor 10)

## Performance Optimizations

1. **Indexes**: Strategic indexes on frequently queried columns
2. **Connection Pooling**: Separate pools prevent resource contention
3. **Session Cleanup**: Automated cleanup of expired sessions
4. **Query Optimization**: Prepared statements and query caching

## Backup and Recovery

1. **Full Backups**: Daily full database backups including all schemas
2. **Schema-level Backups**: Individual client schema exports available
3. **Point-in-Time Recovery**: Transaction logs maintained for PITR
4. **Disaster Recovery**: Replication to standby servers

## Monitoring

Key metrics to monitor:
- Schema count and size
- Connection pool utilization
- Query performance per schema
- Session table growth
- Failed authentication attempts

## Maintenance Tasks

1. **Session Cleanup**: Daily cleanup of expired sessions
2. **Index Maintenance**: Weekly REINDEX operations
3. **Statistics Update**: Regular ANALYZE for query optimization
4. **Schema Audit**: Monthly review of unused schemas 