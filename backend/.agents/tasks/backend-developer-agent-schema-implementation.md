# Backend Developer Agent: Schema Service Implementation & Permissions

## Mission
After fixing the UUID SQL syntax errors, implement the missing schema service functions and fix owner role permissions to enable full multi-tenant functionality.

## Prerequisites
Complete the UUID SQL fix first (`.agents/prompts/backend-developer-agent-uuid-fix.md`) as this work depends on working database queries.

## Part 1: Schema Service Implementation

### Current State
The schema controller exists and routes are mounted, but service functions are not implemented:
```javascript
// backend/src/services/schema.js
export async function listSchemas() {
  // TODO: Implementation needed
}
```

### Required Implementations

#### 1. List Schemas (`listSchemas`)
```javascript
export async function listSchemas({ userId, role, poolContext }) {
  // Query PostgreSQL information_schema
  // Filter based on user role:
  // - admin: see all schemas
  // - owner: see owned client schemas + auth_internal
  // - user: see only their assigned schema
  
  const query = `
    SELECT schema_name, schema_owner, 
           regexp_replace(schema_name, '^client_(.*)_[0-9]+$', '\\1') as app_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'client_%'
       OR schema_name = 'auth_internal'
    ORDER BY schema_name
  `;
  
  // Apply role-based filtering
  // Return formatted list
}
```

#### 2. Create Schema (`createSchema`)
```javascript
export async function createSchema({ schemaName, templateSchema = 'client_template' }) {
  // Steps:
  // 1. Validate schema name format
  // 2. Create PostgreSQL schema
  // 3. Copy structure from template
  // 4. Apply DDL templates from backend/src/repo/DDL/
  
  // Use transaction for atomicity
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create schema
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${ident(schemaName)}`);
    
    // Copy tables from template
    // Apply DDL templates
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

#### 3. Get Schema Details (`getSchemaDetails`)
```javascript
export async function getSchemaDetails({ schemaName, userId, role }) {
  // Return:
  // - Schema metadata
  // - Table count
  // - Associated client info (if applicable)
  // - User count (if permitted)
}
```

#### 4. Update Schema (`updateSchema`)
```javascript
export async function updateSchema({ schemaName, updates }) {
  // Limited updates allowed:
  // - Schema description/metadata
  // - Associated client mapping
  // Note: Cannot rename schemas due to FK constraints
}
```

#### 5. Delete Schema (`deleteSchema`)
```javascript
export async function deleteSchema({ schemaName, force = false }) {
  // Safety checks:
  // - Prevent deletion of auth_internal or client_template
  // - Check for active users/sessions
  // - Require force flag for non-empty schemas
  
  if (schemaName === 'auth_internal' || schemaName === 'client_template') {
    throw new Error('Cannot delete system schemas');
  }
  
  // Check if schema has data
  // If force=true, cascade delete
  // Otherwise, fail if not empty
}
```

### DDL Template Application
When creating schemas, apply templates from `backend/src/repo/DDL/`:
```javascript
// Helper function
async function applyDDLTemplates(client, schemaName) {
  const ddlFiles = [
    'createUsersTable.js',
    'createSessionsTable.js',
    // ... other DDL files
  ];
  
  for (const file of ddlFiles) {
    const ddl = await import(`../repo/DDL/${file}`);
    const sql = ddl.default(schemaName); // Templates take schema as parameter
    await client.query(sql);
  }
}
```

## Part 2: Fix Owner Role Permissions

### Current Issue
Owners cannot access `/api/owner/*` endpoints because middleware only checks for 'admin' role.

### Required Changes

#### 1. Update Auth Middleware (`backend/src/middleware/auth.js`)
```javascript
// Add new middleware function
export const isOwnerOrAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userRole = req.session.role;
    if (userRole === 'admin' || userRole === 'owner') {
      return next();
    }
    
    return res.status(403).json({ message: "Insufficient permissions" });
  } catch (error) {
    return res.status(500).json({ message: "Authorization check failed" });
  }
};

// For owner-specific resource access
export const isOwnerOfResource = async (req, res, next) => {
  // Check if user owns the specific client/resource
  const { clientId } = req.params;
  const userId = req.session.userId;
  
  // Query to check ownership
  const ownerCheck = await clientServerRepo.checkOwnership(clientId, userId);
  
  if (ownerCheck || req.session.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ message: "Not authorized for this resource" });
};
```

#### 2. Update Role Utils (`backend/src/utils/roles.js`)
```javascript
export const ROLE_PERMISSIONS = {
  admin: {
    canManageAllSchemas: true,
    canManageAllClients: true,
    canManageAllUsers: true,
    canAccessSystemStats: true
  },
  owner: {
    canManageOwnClients: true,
    canViewOwnStats: true,
    canManageClientUsers: true,
    canCreateSchemas: false  // Through client registration only
  },
  user: {
    canManageOwnProfile: true,
    canViewOwnData: true
  }
};

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.[permission] || false;
}
```

#### 3. Update Owner Routes (`backend/src/routes/ownerPanel.js`)
Replace `isAdmin` with `isOwnerOrAdmin` or `isOwnerOfResource` as appropriate:
```javascript
// List all clients for owner
router.get("/stats", isAuthenticated, isOwnerOrAdmin, ownerController.getStats);

// Manage specific client
router.get("/clients/:clientId", isAuthenticated, isOwnerOfResource, ownerController.getClient);
```

## Part 3: ClientServer Registration Field Mapping

### Current Issue
Registration expects `identifier_url` and `authorized_urls` but API only sends `allowed_return_urls`.

### Fix in `backend/src/services/clientServer.js`
```javascript
export async function register({ clientServerData, userId, schema }) {
  // Map fields intelligently
  const mappedData = {
    ...clientServerData,
    identifier_url: clientServerData.identifier_url || clientServerData.allowed_return_urls[0],
    authorized_urls: clientServerData.authorized_urls || clientServerData.allowed_return_urls,
    owner_id: userId || null
  };
  
  // Generate client_id and client_secret
  mappedData.client_id = `client_${generateId()}`;
  mappedData.client_secret = generateSecureToken();
  
  // Generate schema name
  const sanitizedAppName = mappedData.app_name.toLowerCase().replace(/[^a-z0-9]/g, '');
  mappedData.assigned_schema_name = `client_${sanitizedAppName}_${Date.now()}`;
  
  // Create schema first
  await schemaService.createSchema({ 
    schemaName: mappedData.assigned_schema_name 
  });
  
  // Then create client record
  return await pipeline(
    ClientServer,
    repoQuery(schema || 'auth_internal', "create"),
    "Client server registered successfully",
    mappedData,
    userId
  );
}
```

## Testing After Implementation

Run tests after each major section:
```bash
# After schema service implementation
cd backend && node test-backend-api.js

# Check specific schema endpoints
curl http://localhost:3001/api/schema/list -H "Cookie: $SESSION"

# After permission fixes
# Test owner accessing their resources
curl http://localhost:3001/api/owner/stats -H "Cookie: $OWNER_SESSION"
```

## Success Criteria
- All schema management endpoints return data (not "not implemented")
- Owners can access `/api/owner/*` endpoints
- Client registration creates PostgreSQL schema
- Field mapping allows registration with minimal required fields
- No regression in previously working tests

## Priority Order
1. Fix owner permissions (quick fix, enables testing)
2. Implement basic schema list/create (core functionality)
3. Fix client registration field mapping
4. Implement remaining schema operations

## Important Notes
- Schema operations must respect tenant isolation
- Never allow deletion of system schemas
- Use transactions for schema creation
- Test role-based access thoroughly
- Consider adding schema name validation (alphanumeric + underscore only)

Remember: This builds on the UUID fix. Ensure queries use proper parameterization in all new code. 