# TEST CASES for Service Layer

## Overview
This document outlines comprehensive test cases for all service layer operations, ensuring CRUD functionality and authentication operations work correctly with proper error handling and response formats.

## Service Functions Covered

### auth.js
- login
- logout  
- register

### user.js
- getUsers
- getUser (aggregate function)
  - getUserById
  - getUserByNameAndEmail
- createUser
- updateUser
- deleteUser

### clientServer.js
- register
- getAll
- get
- updateUserClientServer
- deleteUserClientServer
- verifySecretHash
- getByUrl

### session.js
- create
- getAll
- getById
- get
- getByUserId
- update
- deleteById
- deleteAll
- deleteByUserId
- deleteExpired

## Test Principles

### What to Test
- **Success cases**: Normal operation flow
- **Error cases**: Invalid input, authentication failures
- **Edge cases**: Boundary conditions, null/empty values
- **Response format uniformity**: All responses follow { message, data } pattern
- **Pipeline pattern**: Model.fromRequestBody → executor → response
- **Model transformations**: fromDb, toDatabaseObject, toApiResponse

### What NOT to Test
- Validation logic (handled by middleware layer)
- Error handling middleware (separate layer)
- Database connection logic (infrastructure layer)

## Pre-conditions for All Tests

### Environment Setup
- ✅ Database connection established
- ✅ Schema detection middleware executed (`detection.js`)
- ✅ Test database with clean state per test
- ✅ Mock data available for dependencies

### Required Test Data
- Valid user credentials (email/password)
- Valid schema names (`auth_internal`, client schemas)
- Sample user, session, and client server data
- Valid UUIDs for entity references

---

## Test Cases

## 1. AUTH SERVICE (`auth.js`)

### 1.1 login()

#### Success Cases
**TC-AUTH-LOGIN-001**: Valid credentials - regular user
```javascript
Input: {
  credentials: { email: "user@test.com", password: "validPassword123" },
  schema: "client_test_schema",
  refererUrl: "https://test-app.com",
  ipAddress: "127.0.0.1",
  userAgent: "Test-Agent"
}
Expected: {
  message: "Login successful",
  data: { id, name, email, role, schema, poolMetadata },
  sessionUpdate: { userId, role }
}
```

**TC-AUTH-LOGIN-002**: Valid credentials - owner user
```javascript
Input: {
  credentials: { email: "owner@test.com", password: "validPassword123" },
  schema: "auth_internal",
  poolContext: "auth_internal"
}
Expected: {
  message: "Login successful", 
  data: { role: "owner", owned_clients: number, ... },
  sessionUpdate: { role: "owner", poolContext: "auth_internal" }
}
```

#### Error Cases
**TC-AUTH-LOGIN-E001**: Missing credentials
```javascript
Input: { credentials: {}, schema: "test_schema" }
Expected: ValidationError("Email and password are required")
```

**TC-AUTH-LOGIN-E002**: Invalid email
```javascript
Input: { 
  credentials: { email: "nonexistent@test.com", password: "anything" },
  schema: "test_schema" 
}
Expected: AuthError("Invalid credentials")
```

**TC-AUTH-LOGIN-E003**: Invalid password
```javascript
Input: {
  credentials: { email: "user@test.com", password: "wrongPassword" },
  schema: "test_schema"
}
Expected: AuthError("Invalid credentials")
```

### 1.2 logout()

#### Success Cases
**TC-AUTH-LOGOUT-001**: Valid user logout
```javascript
Input: {
  userId: "valid-uuid",
  schema: "test_schema",
  destroySession: mockDestroyFunction
}
Expected: { message: "Logout successful" }
```

#### Error Cases
**TC-AUTH-LOGOUT-E001**: No active session
```javascript
Input: { userId: null, schema: "test_schema" }
Expected: AuthError("No active session")
```

### 1.3 register()

#### Success Cases
**TC-AUTH-REGISTER-001**: Valid client user registration
```javascript
Input: {
  userData: { 
    name: "Test User", 
    email: "newuser@test.com", 
    password: "validPassword123",
    userType: "client" 
  },
  schema: "client_test_schema"
}
Expected: {
  message: "Registration successful",
  data: { userId, userType: "client", schema, role: "user" }
}
```

**TC-AUTH-REGISTER-002**: Valid auth user registration
```javascript
Input: {
  userData: { 
    name: "Owner User", 
    email: "owner@test.com", 
    password: "validPassword123",
    userType: "auth" 
  }
}
Expected: {
  message: "Registration successful",
  data: { userType: "auth", schema: "auth_internal", role: "owner" }
}
```

#### Error Cases
**TC-AUTH-REGISTER-E001**: Missing required fields
```javascript
Input: { userData: { name: "Test" } }
Expected: ValidationError("Name, email, and password are required")
```

**TC-AUTH-REGISTER-E002**: Duplicate email
```javascript
Input: { 
  userData: { 
    name: "Test", 
    email: "existing@test.com", 
    password: "validPassword123" 
  }
}
Expected: ValidationError("User with this email already exists")
```

---

## 2. USER SERVICE (`user.js`)

### 2.1 getUsers()

#### Success Cases
**TC-USER-GETALL-001**: Retrieve all users
```javascript
Input: { schema: "test_schema" }
Expected: {
  message: "Users retrieved successfully",
  data: [{ id, name, email, role, created_at, updated_at }]
}
```

**TC-USER-GETALL-002**: Empty user list
```javascript
Input: { schema: "empty_schema" }
Expected: {
  message: "Users retrieved successfully",
  data: []
}
```

### 2.2 getUser() - Aggregate Function

#### Success Cases
**TC-USER-GET-001**: Get user by ID
```javascript
Input: { id: "valid-uuid", schema: "test_schema" }
Expected: {
  message: "User retrieved successfully",
  data: { id, name, email, role } // no password
}
```

**TC-USER-GET-002**: Get user with login validation
```javascript
Input: {
  id: "valid-uuid",
  password: "correctPassword",
  schema: "test_schema"
}
Expected: {
  message: "User retrieved successfully",
  data: { id, name, email, role } // password validated and removed
}
```

**TC-USER-GET-003**: Get user with password returned
```javascript
Input: {
  id: "valid-uuid",
  returnPwd: true,
  schema: "test_schema"
}
Expected: {
  message: "User retrieved successfully",
  data: { id, name, email, role, password_hash }
}
```

#### Error Cases
**TC-USER-GET-E001**: Invalid credentials for login
```javascript
Input: {
  id: "valid-uuid",
  password: "wrongPassword",
  schema: "test_schema"
}
Expected: ValidationError("password is incorrect.")
```

**TC-USER-GET-E002**: Missing required parameters
```javascript
Input: { schema: "test_schema" }
Expected: ValidationError("User ID or name and email are required.")
```

### 2.3 createUser()

#### Success Cases
**TC-USER-CREATE-001**: Valid user creation
```javascript
Input: {
  userData: {
    name: "New User",
    email: "newuser@test.com", 
    password: "validPassword123",
    role: "user"
  },
  schema: "test_schema"
}
Expected: {
  message: "User created successfully",
  data: { id, name, email, role, created_at }
}
```

### 2.4 updateUser()

#### Success Cases
**TC-USER-UPDATE-001**: Valid user update
```javascript
Input: {
  id: "valid-uuid",
  userUpdateData: { name: "Updated Name", role: "admin" },
  schema: "test_schema"
}
Expected: {
  message: "User updated successfully", 
  data: { id, name: "Updated Name", role: "admin", updated_at }
}
```

### 2.5 deleteUser()

#### Success Cases
**TC-USER-DELETE-001**: Valid user deletion
```javascript
Input: { id: "valid-uuid", schema: "test_schema" }
Expected: {
  message: "User deleted successfully",
  data: deletionResult
}
```

---

## 3. CLIENT SERVER SERVICE (`clientServer.js`)

### 3.1 register()

#### Success Cases
**TC-CLIENT-REGISTER-001**: Valid client server registration
```javascript
Input: {
  clientServerData: {
    app_name: "Test App",
    identifier_url: "https://test-app.com",
    entry_point_url: "https://test-app.com/auth", 
    authorized_urls: ["https://test-app.com/*"],
    client_mode: "development"
  },
  userId: "owner-uuid",
  schema: "auth_internal"
}
Expected: {
  message: "Client server registered successfully",
  data: { client_id, client_secret, app_name, ... }
}
```

### 3.2 getAll()

#### Success Cases
**TC-CLIENT-GETALL-001**: Get all client servers for user
```javascript
Input: { userId: "owner-uuid", schema: "auth_internal" }
Expected: {
  message: "Client servers retrieved successfully",
  data: [{ client_id, app_name, created_at, ... }]
}
```

### 3.3 get()

#### Success Cases
**TC-CLIENT-GET-001**: Get specific client server
```javascript
Input: { 
  userId: "owner-uuid", 
  clientId: "client-uuid",
  schema: "auth_internal" 
}
Expected: {
  message: "Client server retrieved successfully",
  data: { client_id, app_name, identifier_url, ... }
}
```

### 3.4 updateUserClientServer()

#### Success Cases
**TC-CLIENT-UPDATE-001**: Update client server
```javascript
Input: {
  userId: "owner-uuid",
  clientId: "client-uuid", 
  updateData: { app_name: "Updated App Name" },
  schema: "auth_internal"
}
Expected: {
  message: "Client server updated successfully",
  data: { client_id, app_name: "Updated App Name", ... }
}
```

### 3.5 deleteUserClientServer()

#### Success Cases
**TC-CLIENT-DELETE-001**: Delete client server
```javascript
Input: {
  userId: "owner-uuid",
  clientId: "client-uuid",
  schema: "auth_internal"
}
Expected: {
  message: "Client server deleted successfully",
  data: deletionResult
}
```

### 3.6 verifySecretHash()

#### Success Cases
**TC-CLIENT-VERIFY-001**: Valid secret hash verification
```javascript
Input: { secretHash: "valid-secret-hash", schema: "auth_internal" }
Expected: {
  message: "Client server retrieved successfully",
  data: { client_id, app_name, permissions, ... }
}
```

### 3.7 getByUrl()

#### Success Cases
**TC-CLIENT-GETURL-001**: Find client by URL
```javascript
Input: { url: "https://test-app.com", schema: "auth_internal" }
Expected: {
  message: "Client server retrieved successfully", 
  data: { client_id, schema_name, app_name, ... }
}
```

---

## 4. SESSION SERVICE (`session.js`)

### 4.1 create()

#### Success Cases
**TC-SESSION-CREATE-001**: Valid session creation
```javascript
Input: {
  userId: "user-uuid",
  ipAddress: "127.0.0.1",
  userAgent: "Test-Agent",
  schema: "test_schema"
}
Expected: {
  message: "Session created successfully",
  data: { id, session_id, user_id, expires_at, ... }
}
```

### 4.2 getAll() & getByUserId()

#### Success Cases
**TC-SESSION-GETALL-001**: Get all sessions
```javascript
Input: { schema: "test_schema" }
Expected: {
  message: "Sessions retrieved successfully",
  data: [{ id, session_id, user_id, created_at, ... }]
}
```

**TC-SESSION-GETBYUSER-001**: Get sessions by user ID
```javascript
Input: { userId: "user-uuid", schema: "test_schema" }
Expected: {
  message: "Sessions retrieved successfully", 
  data: [{ id, session_id, user_id, ... }]
}
```

### 4.3 getById() & get()

#### Success Cases
**TC-SESSION-GETID-001**: Get session by session ID
```javascript
Input: { sessionId: "session-uuid", schema: "test_schema" }
Expected: {
  message: "Session retrieved successfully",
  data: { id, session_id, user_id, expires_at, ... }
}
```

### 4.4 update()

#### Success Cases
**TC-SESSION-UPDATE-001**: Update session expiry
```javascript
Input: {
  sessionId: "session-uuid",
  expiresAt: "2024-12-31T23:59:59Z",
  schema: "test_schema"
}
Expected: {
  message: "Session updated successfully",
  data: updateResult
}
```

### 4.5 deleteById()

#### Success Cases
**TC-SESSION-DELETE-001**: Delete session by ID
```javascript
Input: { sessionId: "session-uuid", schema: "test_schema" }
Expected: {
  message: "Session deleted successfully",
  data: deletionResult
}
```

### 4.6 deleteAll()

#### Success Cases
**TC-SESSION-DELETEALL-001**: Delete all sessions
```javascript
Input: { schema: "test_schema" }
Expected: {
  message: "All sessions deleted successfully",
  data: deletionResult
}
```

### 4.7 deleteByUserId()

#### Success Cases
**TC-SESSION-DELETEUSER-001**: Delete all sessions for user
```javascript
Input: { userId: "user-uuid", schema: "test_schema" }
Expected: {
  message: "Sessions deleted successfully",
  data: deletionResult
}
```

### 4.8 deleteExpired()

#### Success Cases
**TC-SESSION-DELETEEXP-001**: Delete expired sessions
```javascript
Input: { schema: "test_schema" }
Expected: {
  message: "Expired sessions deleted successfully",
  data: deletionResult
}
```

---

## Test Implementation Guidelines

### Setup Requirements
1. **Database Setup**: Clean test database per test suite
2. **Mock Data**: Consistent test data across all tests
3. **Schema Management**: Test schemas for isolation
4. **Authentication**: Mock session and auth contexts

### Response Format Validation
All service responses must follow:
```javascript
{
  message: string,
  data: object | array,
  sessionUpdate?: object // for auth operations
}
```

### Pipeline Pattern Testing
Verify each service function:
1. Calls `Model.fromRequestBody()` with correct arguments
2. Executes repository operation  
3. Returns properly formatted response
4. Handles errors appropriately

### Error Handling
- ValidationError for input validation failures
- AuthError for authentication/authorization failures
- Proper error propagation through pipeline

### Performance Considerations
- Test with realistic data volumes
- Verify database query efficiency
- Check memory usage for bulk operations

---

## Test Execution Order

1. **Unit Tests**: Individual function testing
2. **Integration Tests**: Service-to-service interactions  
3. **End-to-End Tests**: Complete user journeys
4. **Performance Tests**: Load and stress testing

This comprehensive test suite ensures all service layer operations work correctly with proper error handling, response formatting, and pipeline pattern implementation.