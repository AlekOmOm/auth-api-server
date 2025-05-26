# Auth-System Documentation

## Overview

The Auth-System is a comprehensive authentication and authorization system designed to secure and manage user access across multiple applications. It provides a robust multi-tenant architecture where:

- **Owners** create and manage client applications (tenants)
- **Users** can register and authenticate within client applications
- Each tenant operates with its own isolated database schema
- URL-based authorization controls access across the system

### Multi-Tenant Authentication Flow Example
```
1. Owner registers client-app → schema created
2. User signs up to client-app → user record in tenant schema  
3. User authenticates → session created in tenant context
4. User accesses client-app resources securely
```

## Glossary

### **Client-App**
Single deployed instance of a customer's application that delegates authentication to the auth-system.

### **Schema** 
PostgreSQL namespace created per client-app.  
**Lifecycle:** `CREATE SCHEMA <tenant_id>` on registration → dropped on delete.  
**Linking:** Connected via `poolMetadata` in configuration.

### **Role (Auth-System)**
| Role    | Scope        | Powers                                    |
|---------|--------------|-------------------------------------------|
| `admin` | global       | Full access; one hard-coded instance     |
| `owner` | per client-app | CRUD client-apps + users within that app |

### **Role (Client-App)**
| Role   | Scope          | Powers                                  |
|--------|----------------|-----------------------------------------|
| `user` | per client-app | CRUD own resources, permission-gated    |

### **Multi-Tenant Architecture**
System design where each client-app operates as an isolated tenant with:
- Dedicated database schema
- Independent user management
- Secure tenant isolation

## Documentation Index

### Core Components
- [`components/session.md`](components/session.md) - Session management architecture
- [`components/session_architecture_summary.md`](components/session_architecture_summary.md) - Session system overview
- [`components/modular-database.md`](components/modular-database.md) - Database modularity design
- [`components/owner/`](components/owner/) - Owner panel documentation

### Usage & Implementation
- [`usage/USAGE.md`](usage/USAGE.md) - General usage guide
- [`usage/API_EXAMPLES.md`](usage/API_EXAMPLES.md) - API endpoint examples
- [`usage/IMPLEMENTATION_SUMMARY.md`](usage/IMPLEMENTATION_SUMMARY.md) - Implementation details
- [`usage/URL-MIGRATION.md`](usage/URL-MIGRATION.md) - URL migration guide
- [`usage/modes/`](usage/modes/) - Different operation modes

### Project-Specific
- [`PRD.trading-sim.using.AUTH-System.md`](PRD.trading-sim.using.AUTH-System.md) - Trading simulator integration
- [`EXAM.thinking.md`](EXAM.thinking.md) - Exam considerations and thinking

### Flow Documentation
- [`flow-indexing/`](flow-indexing/) - System flow documentation
- [`for_trading-sim/`](for_trading-sim/) - Trading simulator specific flows
- [`from_data-server/`](from_data-server/) - Data server integration flows