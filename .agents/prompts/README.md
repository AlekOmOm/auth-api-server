# Agent Prompts Directory

This directory contains detailed prompts for each agent in the Auth System multi-agent ecosystem. These prompts were created by the orchestrator-agent based on the current system state and test analysis.

## Current System State
- **Date**: January 12, 2025
- **Test Success**: 22.2% (4/18 tests passing)
- **Critical Issue**: UUID SQL syntax errors
- **Previous Peak**: 38.9% (7/18 tests passing)

## Active Prompts

### 1. Backend Developer Agent

#### CRITICAL Priority
**[UUID SQL Fix](./backend-developer-agent-uuid-fix.md)**
- Fix SQL syntax errors with UUID values
- Restore test success to 38.9%
- Implement proper parameterization

#### HIGH Priority
**[Schema Service Implementation](./backend-developer-agent-schema-implementation.md)**
- Implement missing schema service functions
- Fix owner role permissions
- Update client registration field mapping
- **Depends on**: UUID fix completion

### 2. Documentation Developer Agent

#### HIGH Priority
**[OpenAPI Database Alignment](./documentation-developer-agent-openapi-alignment.md)**
- Add missing ClientServer fields
- Document password complexity requirements
- Add X-Schema-Context header documentation
- Clarify role permissions

### 3. Test and Orchestrate Agent

#### Future Testing
**[Comprehensive Testing Strategy](./test-and-orchestrate-agent-future-testing.md)**
- Progressive testing phases
- Integration test coordination
- Performance and security auditing
- Continuous monitoring setup

## Execution Order

1. **Backend Developer**: Fix UUID SQL errors (CRITICAL)
2. **Documentation Developer**: Update OpenAPI spec (concurrent with #1)
3. **Backend Developer**: Implement schema services (after #1)
4. **Test Agent**: Verify fixes and run comprehensive tests (after #3)

## Key Insights from Analysis

### Problems Identified
1. UUID values in SQL queries not properly quoted/parameterized
2. ClientServer model expects fields not provided by API
3. Schema service functions are stubs
4. Owner role lacks proper permissions
5. OpenAPI spec doesn't match database requirements

### Architecture Decisions
- X-Schema-Context header is permanent (needs documentation)
- Owner role should have limited scope, not admin access
- UUID standardization needed but not immediately blocking
- Multi-tenant isolation is critical

## Success Metrics

| Phase      | Current      | Target        | Blocker            |
| ---------- | ------------ | ------------- | ------------------ |
| Immediate  | 4/18 (22.2%) | 7/18 (38.9%)  | UUID SQL syntax    |
| Short-term | -            | 12/18 (66.7%) | Schema services    |
| Final      | -            | 18/18 (100%)  | All fixes complete |

## Communication Channels

- Requests: `.agents/requests/<agent-name>/`
- Responses: `.agents/responses/<agent-name>/`
- Logs: `.agents/logs/`
- State: `.agents/orchestrator-state.json`

## Notes for Agents

1. **Quality over Speed**: Thorough fixes prevent regressions
2. **Test After Each Change**: Run `backend/test-backend-api.js`
3. **Document Patterns**: Help prevent future similar issues
4. **Coordinate**: Check for dependencies between fixes

These prompts represent the orchestrator's analysis of the current situation and the optimal path forward to achieve 100% test success. 