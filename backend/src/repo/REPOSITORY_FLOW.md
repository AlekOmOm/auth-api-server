# Repository Flow Documentation

## Overview
The repository pattern in this codebase follows a specific flow that separates SQL queries, query configuration, and repository operations.

## Architecture Components

### 1. SQL Query Files (`/repo/connection/queries/*.js`)
- **Purpose**: Store raw SQL queries as exported constants
- **Example**: `user.js`, `session.js`, `clientServer.js`
- **Pattern**: 
  ```javascript
  export const create = `INSERT INTO table_name (...) VALUES (...) RETURNING *;`;
  export const get = `SELECT * FROM table_name WHERE id = $1;`;
  ```

### 2. Query Configuration (`/repo/connection/queries/index.js`)
- **Purpose**: Maps table operations to their SQL queries and configurations
- **Key Elements**:
  - `sql`: The raw SQL query string
  - `type`: Return type (`entity`, `array`, `void`)
  - `paramExtractor`: Function to extract SQL parameters from input data
  
### 3. Repository Base (`/repo/index.js`)
- **Purpose**: Generic repository class that handles all database operations
- **Key Methods**:
  - `query(operationName, ...params)`: Executes any database operation
- **Flow**:
  1. Gets query configuration from `getQueryConfig`
  2. Extracts SQL parameters using `valuesExtractor`
  3. Executes query using pool
  4. Transforms results using `fromDB` if needed

### 4. Specific Repositories (`/repo/repositories/*.js`)
- **Purpose**: Table-specific repository instances
- **Example**: `userRepository.js`, `clientAppRepository.js`
- **Pattern**:
  ```javascript
  import Repo from "../index.js";
  export const userRepo = {
    createUser: (schema, params) => new Repo(schema, "user").query("create", params),
    getUserByEmail: (schema, email) => new Repo(schema, "user").query("getByEmail", { email })
  };
  ```

## Flow Diagram

```
Service Layer (e.g., auth.js)
    ↓ calls
Repository (e.g., userRepo.createUser)
    ↓ creates
Repo Instance (new Repo(schema, tableName))
    ↓ calls
query(operationName, params)
    ↓ gets config from
getQueryConfig(tableName, operationName, params)
    ↓ returns
{ sql, valuesExtractor, operationType }
    ↓ executes
pool.query(sql, sqlParams)
    ↓ transforms with
fromDB(tableName, row)
    ↓ returns
Model Instance or Array
```

## Example: User Creation Flow

1. **Service calls**: `userRepo.createUser(schema, [name, role, email, passwordHash])`
2. **Repository creates**: `new Repo(schema, "user").query("create", [...])`
3. **Query method**:
   - Gets config: `getQueryConfig("user", "create", [...])`
   - Config returns: `{ sql: "INSERT INTO users...", type: "entity", ... }`
   - Executes: `pool.query(sql, [id, name, role, email, passwordHash])`
   - Transforms: `fromDB("user", row)`
4. **Returns**: User model instance

## Key Patterns

### Parameter Extraction
- Input operations (`create`, `update`) use `toDB` transformation
- Query operations use `paramExtractor` to map object properties to SQL parameters

### Type Handling
- `entity`: Single row result, transformed with `fromDB`
- `array`: Multiple rows, each transformed with `fromDB`
- `void`: No transformation, returns raw result

### Schema Handling
- Schema determines which pool to use (`auth_internal` vs client schemas)
- Schema is passed through the entire chain but not used in SQL queries directly

## Benefits
1. **Separation of Concerns**: SQL separate from business logic
2. **Type Safety**: Consistent transformation between DB and models
3. **Flexibility**: Easy to add new operations without changing repository structure
4. **Reusability**: Generic Repo class handles all tables uniformly 