# Playwright E2E Tests

## Overview

This directory contains end-to-end tests for the Auth System frontend using Playwright. The tests cover:

1. **Authentication Flows** - Registration, login, logout
2. **Client Server CRUD** - Create, read, update, delete operations for client servers
3. **User Management** - CRUD operations for users within client servers
4. **End-to-End Journeys** - Complete user workflows

## Test Structure

```
test/playwright-tests/
├── helpers/
│   ├── test-data.js         # Test data and utilities
│   ├── auth-page.js         # Page object for authentication
│   └── owner-panel-page.js  # Page object for owner panel
├── auth-system/
│   ├── auth-flow.spec.js           # Authentication tests
│   └── end-to-end-journey.spec.js  # Complete journey tests
└── owner-panel/
    ├── client-server-crud.spec.js   # Client server operations
    └── user-management.spec.js      # User management operations
```

## Running Tests

### Prerequisites

1. Ensure the backend is running at `http://localhost:3001`
2. Ensure the frontend is running at `http://localhost:3000`

### Commands

```bash
# Run all tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Debug tests
npm run test:e2e:debug

# Run specific test file
npx playwright test test/playwright-tests/auth-system/auth-flow.spec.js

# Run tests in headed mode (see browser)
npx playwright test --headed
```

## Test Features

### Authentication Tests
- User registration with auth-system account type
- Login with valid/invalid credentials
- Logout functionality
- Protected route access control
- Form validation

### Client Server CRUD Tests
- View owner panel and statistics
- Create new client servers
- Edit client server details
- Delete client servers
- Handle empty states
- Error handling

### User Management Tests
- Create users with different roles (admin/user)
- Update user information
- Delete users
- Prevent duplicate emails
- Form validation

### End-to-End Journey
- Complete owner workflow from registration to user management
- Role-based access control verification
- Multi-step operations

## Page Object Model

The tests use Page Object Model pattern for better maintainability:

- `AuthPage` - Handles login, registration, logout operations
- `OwnerPanelPage` - Handles owner panel, client server, and user management operations

## Test Data

Tests use unique data for each run to avoid conflicts:
- `generateUniqueEmail()` - Creates unique email addresses
- `generateUniqueAppName()` - Creates unique app names

## Debugging

1. Use `--debug` flag to step through tests
2. Add `await page.pause()` in tests to pause execution
3. Use `--headed` to see the browser during test execution
4. Check test reports in `test-results/` directory

## Best Practices

1. Tests are independent and can run in any order
2. Each test creates its own test data
3. Tests clean up after themselves when possible
4. Use meaningful test descriptions
5. Wait for elements/navigation properly to avoid flaky tests 