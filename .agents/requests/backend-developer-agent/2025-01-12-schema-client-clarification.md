---
id: 2025-01-12T11-00-00-schema-client-clarification
from: orchestrator-agent
priority: high
intent: backend-development
status: pending
---

# Complete Backend Test Fixes with Architecture Clarification

## Context
The backend developer has successfully improved test success from 0% to 55.6% (10/18 tests passing). The remaining 8 failures are due to architectural misunderstandings about schema detection and client server management that require clarification.

## Architecture Clarification Document
**Key Reference**: `docs/analysis/backend-architecture-clarification.md` - Comprehensive explanation of expected behavior

## Remaining Issues to Fix

### 1. Client Server Registration Field Mapping
**Problem**: API expects different fields than the model provides
**Files**: 
- `backend/src/services/clientServer.js`
- `backend/src/models/ClientServer.js`

**Required**: Map `allowed_return_urls` → `identifier_url` and `authorized_urls`

### 2. Schema Detection Test Context
**Problem**: Test uses `X-Schema-Context: "http://localhost:3000/"` but no client is registered with this URL
**File**: `backend/test-backend-api.js`

**Solution**: Either register a test client with this URL or change the test context

### 3. Schema Creation During Registration
**Problem**: PostgreSQL schema not created when client registers
**File**: `backend/src/services/clientServer.js`

**Required**: Call schema creation service after client registration

### 4. Repository Function Names
**Problem**: Service calls `getOwnerStatistics()` but repo has `getTotalOwnerStats()`
**Files**:
- `backend/src/services/ownerPanel.js` 
- `backend/src/repo/clientServer.js`

## Expected Outcome
- All 18 tests passing
- Proper multi-tenant schema isolation working
- Client server registration creating PostgreSQL schemas
- Schema detection correctly routing requests

## Priority Order
1. Fix field mapping (enables 3 more tests)
2. Fix schema detection context (enables 2 more tests)
3. Implement schema creation (required for production)
4. Fix function naming (enables remaining tests) 