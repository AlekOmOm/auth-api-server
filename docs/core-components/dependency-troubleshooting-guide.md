# Dependency Troubleshooting Guide

## Quick Diagnosis Checklist

### 🚨 Error Patterns

If you see these errors, you have circular dependencies:

```
ReferenceError: Cannot access '__vite_ssr_export_default__' before initialization
```

```
Error: Cannot access 'ClassName' before initialization
```

```
TypeError: Class extends value undefined is not a constructor or null
```

### 🔍 Immediate Investigation Steps

1. **Map the Import Chain**
   ```bash
   # Find all imports of the problematic file
   grep -r "import.*from.*BaseModel" src/
   
   # Find what BaseModel imports
   grep "import.*from" src/models/base/BaseModel.js
   ```

2. **Check Common Culprits**
   - [ ] Models importing from services
   - [ ] Models importing from middleware  
   - [ ] Models importing from controllers
   - [ ] Cross-model imports (User ↔ Session)
   - [ ] Error classes mixed with business logic

### ⚠️ Red Flags in Model Files

**NEVER do this in model files:**
```javascript
// ❌ Models importing services
import userService from '../services/userService.js';

// ❌ Models importing middleware
import { errorHandler } from '../middleware/errorHandler.js';

// ❌ Models importing repositories
import usersRepo from '../repo/usersRepo.js';

// ❌ Models importing controllers
import authController from '../controllers/authController.js';
```

### ✅ Safe Model Imports

**ONLY these imports are allowed in models:**
```javascript
// ✅ Base classes
import BaseModel from './base/BaseModel.js';
import ValidationMixin from './base/ValidationMixin.js';

// ✅ Pure utility functions
import { ValidationError, NotFoundError } from '../utils/customErrors.js';
import { CONSTANTS } from '../config/constants.js';

// ✅ Other models (with caution)
import User from './User.js';  // Only if there's a strong relationship
```

## Common Circular Dependency Patterns

### Pattern 1: Model → Middleware → Service → Model

**Problem:**
```
BaseModel.js → errorHandler.js → clientServer.js → models/index.js → User.js → BaseModel.js
```

**Solution:**
Extract error classes to pure utility file:
```javascript
// utils/customErrors.js
export class NotFoundError extends Error {
    constructor(message, statusCode = 404) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = statusCode;
    }
}
```

### Pattern 2: Cross-Model Dependencies

**Problem:**
```javascript
// User.js
import Session from './Session.js';

// Session.js  
import User from './User.js';
```

**Solution Option A - Weak Coupling:**
```javascript
// Session.js
export class Session extends BaseModel {
    async getUser() {
        const { User } = await import('./User.js');  // Lazy import
        return User.fromDb(this.user_id);
    }
}
```

**Solution Option B - Dependency Injection:**
```javascript
// Session.js
export class Session extends BaseModel {
    attachUser(user) {
        this.user = user;  // Accept user instance from outside
        return this;
    }
}

// In service layer:
const user = await userService.get(session.user_id);
const enrichedSession = session.attachUser(user);
```

### Pattern 3: Deep Import Chains

**Problem:**
```
A.js → B.js → C.js → D.js → A.js
```

**Solution:**
Extract shared functionality to utilities:
```javascript
// utils/shared.js
export const sharedFunction = () => { /* ... */ };

// Now A.js, B.js, C.js, D.js can all import from utils/shared.js
```

## Step-by-Step Resolution Process

### Step 1: Trace the Cycle

1. Start with the error message file
2. List all its imports
3. For each import, list its imports
4. Continue until you find the cycle

**Example:**
```
BaseModel.js imports:
├── ValidationMixin.js ✅ (leaf node)
└── ../../middleware/errorHandler.js ⚠️

errorHandler.js imports:
├── ../services/clientServer.js ⚠️

clientServer.js imports:
├── ../models/index.js ⚠️

models/index.js imports:
├── User.js
├── Session.js
├── ClientServer.js
└── BaseModel.js ❌ CYCLE FOUND!
```

### Step 2: Find the Weakest Link

**Questions to ask:**
- Which import is least essential?
- What can be extracted to a utility file?
- What can be lazy-loaded?
- What can use dependency injection?

### Step 3: Break the Cycle

**Option A - Extract to Utility:**
```javascript
// Move shared code to utils/
// Both files import from utils instead of each other
```

**Option B - Lazy Import:**
```javascript
// Replace static import with dynamic import
const { ClassName } = await import('./path/to/file.js');
```

**Option C - Dependency Injection:**
```javascript
// Pass dependencies as parameters instead of importing
function processData(userData, validator) {
    return validator.validate(userData);
}
```

**Option D - Restructure:**
```javascript
// Sometimes the architecture needs adjustment
// Consider moving functionality to a different layer
```

### Step 4: Verify the Fix

1. **Run tests**: Make sure functionality still works
2. **Check imports**: Verify no new cycles were created
3. **Review architecture**: Ensure the fix follows layer principles

## Prevention Strategies

### 🔒 Architectural Rules

1. **Layer Boundaries**: Models only import from utilities and base classes
2. **Dependency Direction**: Always flows downward (Routes → Controllers → Services → Repo → Models)
3. **Pure Utilities**: Extract shared code to utils/ directory
4. **Lazy Loading**: Use dynamic imports for weak relationships

### 🧰 Development Practices

1. **Regular Reviews**: Check imports during code review
2. **Automated Checks**: Use tools to detect circular dependencies
3. **Documentation**: Keep dependency diagrams up to date
4. **Testing**: Write tests that catch dependency issues early

### 📋 Quick Reference Rules

**Models can import:**
- ✅ `BaseModel`, `ValidationMixin`
- ✅ `utils/customErrors.js`
- ✅ `config/constants.js`
- ✅ Other models (sparingly, with lazy loading)

**Models cannot import:**
- ❌ Services
- ❌ Repositories  
- ❌ Controllers
- ❌ Middleware (except pure utilities)
- ❌ Routes

**When in doubt:**
- Extract to `utils/`
- Use dependency injection
- Consider lazy loading
- Review the architecture

## Emergency Fixes

### Quick Temporary Fix
```javascript
// Comment out the problematic import
// import { ProblematicClass } from './problematic-file.js';

// Use lazy import instead
const getProblematicClass = async () => {
    const { ProblematicClass } = await import('./problematic-file.js');
    return ProblematicClass;
};
```

### Immediate Testing
```javascript
// Add this to verify the cycle is broken
console.log('Module loaded successfully:', __filename);
```

### Code Review Checklist
- [ ] No circular imports
- [ ] Models only import utilities and base classes
- [ ] Error classes are pure (no business logic)
- [ ] Cross-model relationships use lazy loading
- [ ] All imports follow layer boundaries 