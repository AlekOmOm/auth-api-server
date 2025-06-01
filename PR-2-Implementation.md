# 00:35 02/06/2025

## PR #2 Implementation Plan

### Overview
This document outlines the implementation plan to address all code review comments from PR #1.

### Priority 1: Critical Issues (Runtime Errors)

#### 1. SQL Query Structure Issue
**File:** `backend/src/repo/connection/queries/index.js`
**Issue:** User table operations are direct SQL strings/functions instead of descriptor objects
**Action:** Refactor to use consistent descriptor structure with `.sql`, `.type`, and `.paramExtractor`

#### 2. File Naming Conflict
**Files:** `backend/src/services/user.js` and `backend/src/services/User.js`
**Issue:** Duplicate naming invites typos and bloats API surface
**Action:** Choose one naming convention and remove the duplicate

### Priority 2: Performance Optimizations

#### 1. Remove `delete` Operations in BaseModel
**File:** `backend/src/models/base/BaseModel.js` (lines 81-94)
**Issue:** Using `delete` in hot paths harms V8 performance
**Action:** Use destructuring to create new object without sensitive fields

### Priority 3: Code Quality Improvements

#### 1. Remove Useless Catch Clauses
**Files:** 
- `backend/src/services/user.js` (line 29)
- `backend/src/services/session.js` (line 28)
- `backend/src/services/clientServer.js` (line 51)
**Action:** Remove try/catch blocks that only rethrow errors

#### 2. Fix `this` Usage in Static Context
**File:** `backend/src/models/base/BaseModel.js` (lines 25, 27, 38, 51)
**Issue:** Using `this` in static methods can be confusing
**Action:** Replace `this` with the class name

#### 3. Use Optional Chaining
**File:** `backend/src/services/auth.js` (lines 211-213)
**Issue:** Complex conditional chain can be simplified
**Action:** Apply optional chaining operator

### Implementation Steps

#### Step 1: Fix Critical Runtime Issues (Immediate)
1. [ ] Fix SQL query structure in `backend/src/repo/connection/queries/index.js`
2. [ ] Resolve file naming conflict between `user.js` and `User.js`

#### Step 2: Apply Performance Optimizations
1. [ ] Refactor `toApiResponse()` method to use destructuring instead of delete

#### Step 3: Code Quality Improvements
1. [ ] Remove unnecessary try/catch blocks in services
2. [ ] Replace `this` with class name in static methods
3. [ ] Apply optional chaining in auth service

### Testing Plan
1. Run all existing tests to ensure no regression
2. Test user operations after SQL query structure fix
3. Verify performance improvement after removing delete operations
4. Manual testing of auth flow after optional chaining update

### Estimated Time
- Priority 1: 1-2 hours
- Priority 2: 30 minutes
- Priority 3: 1 hour
- Testing: 1 hour
- **Total: 3.5-4.5 hours**



