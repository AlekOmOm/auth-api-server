# Backend Developer Agent: Critical UUID SQL Fix

## Mission
Fix the critical UUID SQL syntax errors that are causing test failures across multiple endpoints. This is the highest priority issue blocking system functionality.

## Context
Your excellent test analysis revealed that test success dropped from 38.9% to 22.2% due to SQL syntax errors when handling UUID values. PostgreSQL is throwing "syntax error at or near \"-\"" because UUID values are being inserted into SQL queries without proper quoting or parameterization.

## Critical Issue
```sql
-- Current (BROKEN):
SELECT * FROM users WHERE id = 550e8400-e29b-41d4-a716-446655440000

-- PostgreSQL sees this as:
SELECT * FROM users WHERE id = 550e8400 - e29b - 41d4 - a716 - 446655440000
-- (mathematical expression with undefined identifiers)

-- Should be one of:
SELECT * FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440000'
SELECT * FROM users WHERE id = $1  -- with parameter binding
```

## Required Actions

### 1. Identify All Affected Code
Search for patterns where UUID values might be concatenated into SQL:
- Look for string concatenation with SQL queries
- Check all repository files, especially in `backend/src/repo/`
- Focus on: `user.js`, `clientServer.js`, `base.js`

### 2. Fix SQL Query Generation
Choose one consistent approach:

**Option A: Parameterized Queries (Recommended)**
```javascript
// Instead of:
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Use:
const query = 'SELECT * FROM users WHERE id = $1';
const result = await pool.query(query, [userId]);
```

**Option B: Proper Quoting**
```javascript
// If you must build queries dynamically:
const query = `SELECT * FROM users WHERE id = '${userId}'`;
// BUT be careful of SQL injection - validate UUID format first
```

### 3. Test Each Fix
After each fix, run:
```bash
cd backend && node test-backend-api.js
```

### 4. Common Patterns to Fix

**In Repository Methods:**
```javascript
// BAD:
async getById(id) {
  return await this.pool.query(
    `SELECT * FROM ${this.table} WHERE id = ${id}`
  );
}

// GOOD:
async getById(id) {
  return await this.pool.query(
    `SELECT * FROM ${this.table} WHERE id = $1`,
    [id]
  );
}
```

**In JOIN Queries:**
```javascript
// BAD:
`... JOIN client_servers cs ON u.client_id = ${clientId}`

// GOOD:
`... JOIN client_servers cs ON u.client_id = $1`
```

## Files Most Likely Affected
1. `backend/src/repo/user.js` - User CRUD operations
2. `backend/src/repo/clientServer.js` - Client server operations
3. `backend/src/repo/base.js` - Base repository class (if it builds queries)
4. `backend/src/repo/schema.js` - Schema operations
5. Any file using `pool.query()` with string concatenation

## Success Criteria
- All "syntax error at or near \"-\"" errors eliminated
- Test success rate returns to at least 38.9% (7/18 tests)
- No SQL injection vulnerabilities introduced
- Consistent approach used across all repositories

## Testing Approach
1. Start with user-related endpoints (they were working before)
2. Fix one repository at a time
3. Run tests after each fix to verify improvement
4. Document which fixes restored which endpoints

## Priority Order
1. User repository (affects authentication flow)
2. ClientServer repository (affects registration)
3. Base repository (if applicable)
4. Other repositories as found

## Additional Notes
- The tests were passing at 38.9% before this issue appeared
- The root cause is likely a code change that introduced direct UUID concatenation
- Consider adding a linter rule to catch SQL string concatenation
- Your seed scripts are working correctly - the issue is in query execution

## Report Back
Once complete, provide:
1. List of files modified
2. Number of queries fixed
3. New test success rate
4. Any patterns discovered for future prevention

Remember: This is blocking multiple features. Focus on fixing the SQL syntax errors first, then we can address other issues. 