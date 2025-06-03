# Service Layer Integration Tests

This directory contains comprehensive integration tests for all service layer operations. These tests use **real database connections** and make **actual HTTP requests** to your running application.

## 🎯 **Test Coverage**

- ✅ **Auth Service**: login, logout, register
- ✅ **User Service**: All CRUD operations + aggregate functions  
- ✅ **Client Server Service**: Complete client management
- ✅ **Session Service**: Full session lifecycle

## 🚀 **Quick Start**

### 1. **Start Database**
```bash
# From project root
docker-compose up db -d

# Or start all services
docker-compose up -d
```

### 2. **Run Integration Tests**
```bash
cd backend

# Run all integration tests
npm run test:integration

# Run all tests (unit + integration)
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### 3. **Helper Scripts**
```bash
# Setup database for testing
npm run test:setup

# Clean up after testing
npm run test:teardown
```

## 📁 **File Structure**

```
__tests__/
├── setup/
│   ├── testSetup.js          # Database setup/cleanup utilities
│   └── vitest-setup.js       # Global test configuration
├── auth.integration.test.js   # Auth service integration tests
├── user.integration.test.js   # User service integration tests (to be created)
├── clientServer.integration.test.js  # Client server tests (to be created)
├── session.integration.test.js       # Session tests (to be created)
├── TEST-CASES.md             # Comprehensive test case documentation
└── README.md                 # This file
```

## 🔧 **Environment Configuration**

### Required Environment Variables
```bash
NODE_ENV=test
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=auth_system
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
TEST_BASE_URL=http://localhost:3001
```

### Test Schemas
- `auth_internal` - Main authentication schema
- `test_client_schema` - Test client application schema
- `test_client_schema_2` - Secondary client schema for multi-tenant tests

## 📊 **Test Data**

### Pre-seeded Users
```javascript
REGULAR_USER: {
  email: "test@example.com",
  password: "TestPassword123!",
  role: "user"
}

ADMIN_USER: {
  email: "admin@example.com", 
  password: "AdminPassword123!",
  role: "admin"
}

OWNER_USER: {
  email: "owner@example.com",
  password: "OwnerPassword123!",
  role: "owner"
}
```

### Pre-seeded Client Servers
- **Test App 1**: `https://test-app-1.com` → `test_client_schema`
- **Test App 2**: `https://test-app-2.com` → `test_client_schema_2`

## 🧪 **Test Principles**

### ✅ **What We Test**
- **Real HTTP requests** using supertest
- **Actual database operations** with PostgreSQL
- **Complete request/response cycles**
- **Authentication flows** with sessions
- **Error handling** with real error responses
- **Data persistence** verification

### ❌ **What We DON'T Mock**
- Database connections
- HTTP requests
- Authentication middleware
- Session management
- Service layer functions

### 🔄 **Test Lifecycle**
1. **Global Setup**: Create test schemas and seed data
2. **Before Each Test**: Clean sessions (keep users/clients)
3. **Test Execution**: Make actual HTTP requests
4. **Verification**: Check database state and responses
5. **Global Cleanup**: Remove test schemas and data

## 📝 **Writing New Integration Tests**

### Example Test Structure
```javascript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import testSetup, { TEST_SCHEMAS, TEST_USERS } from "./setup/testSetup.js";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

describe("Service Integration Tests", () => {
   
   beforeAll(async () => {
      await testSetup.waitForDatabase();
      await testSetup.setupTestSchemas();
      await testSetup.seedTestData();
   });

   beforeEach(async () => {
      // Clean test data as needed
   });

   afterAll(async () => {
      await testSetup.cleanTestData();
      await testSetup.teardownTestSchemas();
   });

   it("TC-SERVICE-001: Should perform operation successfully", async () => {
      const response = await request(BASE_URL)
         .post("/api/endpoint")
         .send({ data: "test" })
         .expect(200);

      expect(response.body).toMatchObject({
         message: "Operation successful",
         data: expect.any(Object)
      });

      // Verify database state
      const pool = await testSetup.getTestDbConnection();
      try {
         const result = await pool.query("SELECT * FROM table WHERE id = $1", [id]);
         expect(result.rows).toHaveLength(1);
      } finally {
         await pool.end();
      }
   });
});
```

## 🚨 **Troubleshooting**

### Database Connection Issues
```bash
# Check if database is running
docker-compose ps

# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Test Failures
1. **Check your backend server is running** on port 3001
2. **Verify environment variables** are set correctly  
3. **Ensure database schemas exist** with correct permissions
4. **Check test data** is seeded properly

### Common Issues
- **Port conflicts**: Ensure port 3001 is available
- **Database permissions**: User needs CREATE SCHEMA permissions
- **Environment variables**: Check `.env` file is loaded
- **Test isolation**: Tests run sequentially to avoid conflicts

## 📈 **Best Practices**

### Test Organization
- Group related tests in `describe` blocks
- Use clear test case IDs from `TEST-CASES.md`
- Include both success and error scenarios
- Test edge cases and boundary conditions

### Data Management
- Use `beforeEach` to clean sessions between tests
- Keep user and client server data between tests for speed
- Verify database state in assertions
- Use transactions for complex test scenarios

### Performance
- Tests run sequentially (`singleFork: true`) for database safety
- Increased timeouts for database operations
- Efficient test data cleanup
- Connection pooling for database operations

## 🎯 **Coverage Goals**

- **API Endpoints**: All service endpoints tested
- **Authentication**: Login, logout, registration flows
- **CRUD Operations**: Create, Read, Update, Delete for all entities
- **Error Scenarios**: Invalid input, authentication failures
- **Edge Cases**: Empty data, boundary conditions
- **Response Format**: Consistent `{ message, data }` structure

## 🔍 **Test Case Reference**

See `TEST-CASES.md` for complete test case specifications including:
- Input parameters
- Expected responses  
- Error conditions
- Success criteria
- Database verification steps

---

## 🚀 **Running Tests Summary**

```bash
# Quick start
docker-compose up db -d
cd backend
npm run test:integration

# Full workflow
npm run test:setup    # Start database
npm run test:integration  # Run integration tests
npm run test:teardown # Clean up
```

Happy testing! 🎉 