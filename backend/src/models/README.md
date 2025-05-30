# Models Directory

## Overview

The `/models` directory contains domain model classes that provide **structured data flow** and **clean abstractions** across the entire MVC architecture. These models serve as the **single source of truth** for data structure and transformation between layers.

## Philosophy

### 🏗️ **Object-Oriented Structure**
- **Encapsulation**: Data and behavior bundled together
- **Validation**: Built-in data integrity checks
- **Type Safety**: Consistent data structure across layers
- **Factory Methods**: Clean instantiation patterns

### ⚡ **Functional Programming Utilities**
- **Pure Functions**: Transformation methods without side effects
- **Immutable Operations**: Methods return new instances
- **Composable**: Chain transformations cleanly
- **Predictable**: Same input always produces same output

## MVC Data Flow

```
Routes → Controller → Service → Repository → Database
  ↓         ↓          ↓         ↓         ↓
Model    Model      Model     Model    Raw SQL
```

### **Upstream Flow (Request → Database)**
```javascript
// 1. Route receives raw request
app.post('/login', (req, res) => {
   // 2. Controller creates/validates models
   const credentials = User.fromCredentials(req.body);
   
   // 3. Service operates on model instances
   const result = await authService.login(credentials, schema);
   
   // 4. Repository uses model data methods
   await sessionsRepo.create(result.session.toDatabaseObject());
});
```

### **Downstream Flow (Database → Response)**
```javascript
// 1. Repository returns model instances
const session = Session.fromDb(dbRow);

// 2. Service enriches models
session.attachUser(user);

// 3. Controller formats for API
res.json({
   data: session.toApiResponse(authorizedUrls)
});
```

## Core Model Classes

### 1. **Session** - Authentication & State Management

```javascript
import Session from './Session.js';

// Factory methods for different contexts
Session.forLogin(userId, ipAddress, userAgent)     // New login
Session.fromDb(dbRow)                              // Database retrieval
Session.fromExpressSession(req.session)            // Express middleware

// Transformation methods
session.toDatabaseObject()                         // For INSERT queries
session.toApiResponse(authorizedUrls)              // For API responses
session.toExpressSession()                         // For session storage
```

### 2. **ClientServer** - Multi-tenant Configuration

```javascript
import ClientServer from './ClientServer.js';

// Factory methods
ClientServer.fromRegistration(registrationData)    // New client setup
ClientServer.fromDb(dbRow)                         // Database retrieval
ClientServer.fromReferer(refererUrl)               // URL detection

// Validation & utilities
clientServer.validateUrls()                        // URL security checks
clientServer.isAuthorized(url)                     // Authorization logic
clientServer.toDatabaseObject()                    // For persistence
```

### 3. **User** - Identity & Authorization

```javascript
import User from './User.js';

// Factory methods
User.fromCredentials(loginData)                    // Login validation
User.fromRegistration(signupData)                  // Registration data
User.fromDb(dbRow)                                 // Database retrieval

// Security methods
user.validatePassword(plaintext)                   // Authentication
user.toSafeObject()                               // Remove sensitive data
user.hasRole(requiredRole)                        // Authorization checks
```

## Layer-Specific Usage Patterns

### **Routes Layer** - Data Validation & Initial Processing

```javascript
// routes/auth.js
import { User, Session } from '../models/index.js';

router.post('/login', [
   // Middleware validates using models
   (req, res, next) => {
      const credentials = User.fromCredentials(req.body);
      if (!credentials.isValid()) {
         return res.status(400).json({ errors: credentials.getErrors() });
      }
      req.credentials = credentials;
      next();
   }
], authController.login);
```

### **Controller Layer** - Orchestration & Response Formatting

```javascript
// controllers/authController.js
export const login = async (req, res) => {
   try {
      const schema = getSchemaFromRequest(req);
      
      // Use validated model from middleware
      const result = await authService.login(req.credentials, schema);
      
      if (result.success) {
         // Models handle response formatting
         res.json({
            message: "Login successful",
            data: result.session.toApiResponse(),
            redirect: result.redirectUrl
         });
      } else {
         res.status(401).json({ message: result.message });
      }
   } catch (error) {
      res.status(500).json({ message: "Internal server error" });
   }
};
```

### **Service Layer** - Business Logic & Model Orchestration

```javascript
// services/authService.js
export const login = async (credentials, schema) => {
   // 1. Repository returns model instance
   const user = await usersRepo.authenticate(schema, credentials);
   
   if (!user) {
      return { success: false, message: "Invalid credentials" };
   }
   
   // 2. Create related models
   const session = Session.forLogin(
      user.id, 
      credentials.ipAddress, 
      credentials.userAgent
   );
   
   // 3. Persist using model methods
   const savedSession = await sessionsRepo.create(schema, session);
   
   // 4. Get redirect URL using model
   const clientServer = await clientServerService.getBySchema(schema);
   
   return {
      success: true,
      session: savedSession.attachUser(user),
      redirectUrl: clientServer.entry_point_url
   };
};
```

### **Repository Layer** - Database Operations & Model Hydration

```javascript
// repositories/sessionsRepo.js
export const create = async (schema, session) => {
   const query = `
      INSERT INTO ${ident(schema)}.sessions (user_id, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
   `;
   
   // Model provides database-ready data
   const values = session.toDatabaseArray();
   const { rows } = await pool.query(query, values);
   
   // Return model instance, not raw data
   return Session.fromDb(rows[0]);
};

export const getByUserId = async (schema, userId) => {
   const query = `SELECT * FROM ${ident(schema)}.sessions WHERE user_id = $1`;
   const { rows } = await pool.query(query, [userId]);
   
   // Always return model instances
   return rows.map(row => Session.fromDb(row));
};
```

## Key Benefits

### 🔒 **Type Safety & Validation**
```javascript
// Models prevent invalid data propagation
const session = Session.forLogin(null); // Throws validation error
const user = User.fromCredentials({ email: "invalid" }); // Validation fails
```

### 🧹 **Clean Data Transformation**
```javascript
// No more scattered object manipulation
const apiData = session.toApiResponse(authorizedUrls);  // Clean, consistent
const dbData = session.toDatabaseObject();             // Database-ready
```

### 🔄 **Consistent Patterns**
```javascript
// Same patterns across all models
Model.fromDb(dbRow)           // Database → Model
Model.fromInput(userInput)    // User Input → Model
model.toApiResponse()         // Model → API
model.toDatabaseObject()      // Model → Database
```

### 🛡️ **Security by Design**
```javascript
// Models handle sensitive data properly
user.toSafeObject()           // Removes password hash
session.toApiResponse()       // Only exposes public data
```

### 🧪 **Easy Testing**
```javascript
// Models are easy to mock and test
const mockSession = Session.forLogin('user123');
const result = await service.someMethod(mockSession);
```

## File Structure

```
models/
├── README.md                 # This file
├── index.js                  # Export all models
├── Session.js                # Session model class
├── User.js                   # User model class
├── ClientServer.js           # Client server model class
└── base/
    ├── BaseModel.js          # Shared functionality
    └── ValidationMixin.js    # Common validation methods
```

## Best Practices

### ✅ **Do**
- Use factory methods for different contexts (`fromDb`, `fromInput`)
- Provide transformation methods for each layer (`toApiResponse`, `toDatabaseObject`)
- Include validation in model constructors
- Return model instances from repositories
- Use models for data flow between all layers

### ❌ **Don't**
- Create models with `new` directly - use factory methods
- Pass raw database rows between layers
- Manipulate model properties directly - use methods
- Mix business logic with data transformation
- Return different data shapes from the same method

## Example: Complete Flow

```javascript
// 1. Route validation
const credentials = User.fromCredentials(req.body);

// 2. Controller orchestration  
const result = await authService.login(credentials, schema);

// 3. Service business logic
const user = await usersRepo.authenticate(schema, credentials);
const session = Session.forLogin(user.id);

// 4. Repository persistence
const savedSession = await sessionsRepo.create(schema, session);

// 5. Response formatting
res.json({ data: savedSession.attachUser(user).toApiResponse() });
```

This architecture ensures **clean separation of concerns**, **consistent data flow**, and **maintainable code** across your entire application.

# Models

This directory contains all the data models for the application, implementing a robust object-oriented inheritance structure with comprehensive validation.

## Architecture

### BaseModel (base/BaseModel.js)

All models extend from `BaseModel`, which provides:

- **Common Database Methods**:
  - `toDatabaseObject()` - Convert model to database-ready object
  - `toDatabaseArray()` - Convert model to parameterized query array
  - `static fromDb(dbRow)` - Create model instance from database row
  - `static fromDbRows(dbRows)` - Create multiple instances from rows
  - `toApiResponse()` - Convert to safe API response (removes sensitive data)

- **Validation Framework**:
  - `validate()` - Main validation method (override in child classes)
  - `isValid()` - Check if model is valid
  - `getErrors()` - Get validation errors
  - `addError(message, field)` - Add validation error
  - `clearErrors()` - Clear all errors
  - `validateRequired(fields)` - Validate required fields
  - `validateTypes(fieldTypes)` - Validate field types

### ValidationMixin (base/ValidationMixin.js)

Provides comprehensive validation utilities that are mixed into BaseModel:

- **URL Validation**: `isValidUrl()`, `isSecureUrl()`, `validateUrlArray()`
- **Email Validation**: `isValidEmail()`
- **String Validation**: `validateStringLength()`, `validateStringPattern()`, `sanitizeSchemaName()`
- **UUID Validation**: `isValidUUID()`
- **Array Validation**: `isNonEmptyArray()`, `validateArrayElements()`
- **Domain-Specific**: `isValidRole()`, `isValidClientMode()`, `validatePasswordStrength()`

All static methods from ValidationMixin are available on BaseModel and its children.

## Usage Example

```javascript
import BaseModel from "./base/BaseModel.js";

class User extends BaseModel {
   constructor(id, name, email, role) {
      super(); // Initialize BaseModel
      
      this.id = id;
      this.name = name;
      this.email = email;
      this.role = role;
      
      // Validate on construction
      this.validate();
   }
   
   // Override validate method
   validate() {
      this.clearErrors();
      
      // Use BaseModel's validateRequired
      this.validateRequired(['name', 'email', 'role']);
      
      // Use ValidationMixin methods (available via BaseModel)
      if (this.email && !User.isValidEmail(this.email)) {
         this.addError('Invalid email format', 'email');
      }
      
      if (this.role && !User.isValidRole(this.role)) {
         this.addError('Invalid role', 'role');
      }
      
      return this;
   }
   
   // Implement required database methods
   toDatabaseObject() {
      return {
         id: this.id,
         name: this.name,
         email: this.email,
         role: this.role
      };
   }
   
   toDatabaseArray() {
      return [this.id, this.name, this.email, this.role];
   }
   
   static fromDb(dbRow) {
      if (!dbRow) {
         throw new NotFoundError("User not found");
      }
      return new User(dbRow.id, dbRow.name, dbRow.email, dbRow.role);
   }
}
```

## Key Benefits

1. **Consistent Interface**: All models have the same methods for database operations
2. **Automatic Validation**: Models validate themselves on construction
3. **Rich Validation Library**: Access to comprehensive validation methods
4. **Error Management**: Centralized error tracking and reporting
5. **Type Safety**: Built-in type validation
6. **DRY Principle**: No repeated code across models

## Current Models

- **User.js**: User authentication and profile management
- **Session.js**: User session management
- **ClientServer.js**: OAuth client server configuration

## Best Practices

1. Always call `super()` in the constructor
2. Override `validate()` to implement model-specific validation
3. Use `this.clearErrors()` at the start of validate()
4. Implement all database methods (`toDatabaseObject`, `toDatabaseArray`, `fromDb`)
5. Use `toApiResponse()` when sending data to clients
6. Validate on construction and before database operations