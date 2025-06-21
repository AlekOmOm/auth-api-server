# Product Requirements Document (PRD)
## Auth-System

### Version: 1.0
### Last Updated: 26-05-2025

---

## Users

### **Primary Users**

#### **System Admin**
- **Role**: `admin`  
- **Count**: One hardcoded system administrator
- **Access**: Global system management across all tenants

#### **Client Owner** 
- **Role**: `owner`
- **Count**: Multiple (users who register client applications)
    - `/register` - end_user -> creates 'owner' user 
       - i.e. Users created on Auth-System's own frontend (no redirection from client app) -> owner user-type    
- **Access**: Manage their own client applications and users within those apps

#### **End User**
- **Role**: `user` 
- **Count**: Unlimited (users of client applications)
- **Access**: Authentication and account management within assigned tenant

---

## Glossary

### **Client-App**
Single deployed instance of a customer's application that delegates authentication to the auth-system.

### **Schema** 
PostgreSQL namespace created per client-app.  
**Lifecycle:** `CREATE SCHEMA <tenant_id>` on registration → dropped on delete.  
**Linking:** Connected via `poolMetadata` in configuration.

### **Tenant**
Isolated environment for a client-app, consisting of:
- Dedicated database schema
- Independent user management
- Separate session handling

### **Pool Context**
Database connection routing mechanism:
- `AUTH_INTERNAL`: Admin/owner operations on auth-system data
- `CLIENT_TENANT`: User operations within tenant schema  
- `API_CLIENT`: Server-to-server authentication
- `DEFAULT`: Fallback tenant schema

---

## User Stories

### **As a System Admin** (nice-to-have for future)
- I want to have full access to all client applications and users
- I want to monitor system-wide performance and usage
- I want to manage system configuration and settings

### **As a Client Owner** (MVP, aka. must-have)
- I want to register my application with the auth-system
- I want to configure allowed return URLs for my application
- I want to create and manage users within my application
- I want to view analytics for my application's usage
- I want to configure my application's authentication mode

### **As an End User** (MVP, aka. must-have)
- I want to register an account to a client application 
  - non-functional aspects: seamless redirection flow (/login and /register linked to client app)
- I want to login to client applications securely
- I want to logout from client applications
- I want to reset my password if forgotten (nice-to-have)
- I want my session to persist appropriately

---

## Use Cases

### **UC1: Client Application Registration**

**Primary Actor**: Client Owner  
**Goal**: Register a new client application with the auth-system

**Main Success Scenario**:
1. Client Owner accesses the auth-system owner panel (in `auth-system` domain)
    
    1.1 direct `/login` (on auth-system's **own** frontend) (pre-condition: already registered)

2. Client Owner provides application details (name, authorization URLs (`return_urls`), mode)
3. System generates `client_id` and `client_secret`
4. System creates dedicated schema for the application
5. System provisions user tables in the new schema
6. Client Owner receives credentials and integration details

**Extensions**:
- 3a. Invalid return URL format → System validates and requests correction
- 4a. Schema name collision → System generates alternative name

**Includes**: Schema Provisioning, Credential Generation

### **UC2: User Registration**

**Primary Actor**: End User  
**Goal**: Create account in client application

**Main Success Scenario**:
1. User accesses client application's registration page
2. Client application redirects to auth-system with return URL
3. User provides name, email, and password
4. System validates user data and uniqueness within tenant
5. System creates user record in appropriate tenant schema
6. System redirects user back to client application

**Extensions**:
- 4a. Email already exists → System returns validation error
- 4b. Invalid email format → System requests correction
- 4c. Password too weak → System enforces password policy

**Includes**: Schema Detection, User Validation

### **UC3: User Authentication**

**Primary Actor**: End User  
**Goal**: Login to client application

**Main Success Scenario**:
1. User accesses client application
2. Client application redirects to auth-system login
3. User provides email and password
4. System validates credentials against tenant schema
5. System creates session and sets authentication cookies
6. System redirects user back to client application

**Extensions**:
- 4a. Invalid credentials → System returns authentication error
- 4b. Account locked → System returns account status
- 5a. Session creation fails → System returns server error

**Includes**: Schema Detection, Credential Validation, Session Management

### **UC4: Client User Management**

**Primary Actor**: Client Owner  
**Goal**: Manage users within owned client application

**Main Success Scenario**:
1. Client Owner accesses owner panel
2. Client Owner selects specific client application
3. System displays list of users in client's tenant
4. Client Owner performs user operations (create, update, delete)
5. System updates user records in tenant schema

**Extensions**:
- 2a. No client applications owned → System displays empty state
- 4a. Insufficient permissions → System denies operation
- 5a. Email conflict → System returns validation error

**Includes**: Ownership Verification, Schema Operations

---

## Domain Model

### **Core Entities**

```
┌─────────────────┐    owns     ┌─────────────────┐    contains    ┌─────────────────┐
│   Client Owner  │────────────▶│   Client-App    │───────────────▶│     Schema      │
│                 │             │                 │                │                 │
│ - user_id       │             │ - client_id     │                │ - schema_name   │
│ - email         │             │ - app_name      │                │ - tenant_users  │
│ - role: owner   │             │ - client_secret │                │ - tenant_sessions│
└─────────────────┘             │ - return_urls   │                └─────────────────┘
                                │ - client_mode   │                          │
                                └─────────────────┘                          │
                                                                            │
                                ┌─────────────────┐    stored_in            │
                                │   End User      │◀────────────────────────┘
                                │                 │
                                │ - id            │
                                │ - name          │
                                │ - email         │
                                │ - role: user    │
                                │ - password_hash │
                                └─────────────────┘
                                        │
                                        │ creates
                                        ▼
                                ┌─────────────────┐
                                │    Session      │
                                │                 │
                                │ - session_id    │
                                │ - user_id       │
                                │ - ip_address    │
                                │ - expires_at    │
                                └─────────────────┘
```

### **Schema Architecture**

```
PostgreSQL Database: auth_system_db
├── Schema: auth_internal
│   ├── Table: client_servers (client app registry)
│   └── Table: users (admin/owner accounts)
│
├── Schema: client_acme_corp
│   ├── Table: users (tenant users)
│   └── Table: sessions (tenant sessions)
│
├── Schema: client_foobar_inc  
│   ├── Table: users (tenant users)
│   └── Table: sessions (tenant sessions)
│
└── Schema: client_template (default/template)
    ├── Table: users (default tenant)
    └── Table: sessions (default sessions)
```

### **Authentication Flow States**

```
[Unauthenticated] ──register──▶ [Registered] ──login──▶ [Authenticated]
       ▲                                                        │
       │                                                        │
       └─────────────────────── logout ◀──────────────────────┘
```

### **Pool Context Resolution**

```
Request → Schema Detection → Pool Context Assignment → Database Operation

Pool Contexts:
├── AUTH_INTERNAL: Admin/Owner operations on auth-system data
├── CLIENT_TENANT: User operations within specific tenant schema
├── API_CLIENT: Server-to-server authentication
└── DEFAULT: Fallback to template schema
```
