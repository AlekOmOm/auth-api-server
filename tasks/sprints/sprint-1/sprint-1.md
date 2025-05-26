---
description:
globs:
alwaysApply: false
---
## Sprint Goals & Focus:

*   **Primary Goal(s):**
    *   Resolve Owner Panel UI accessibility issues, ensuring it loads correctly for authenticated owner users.
    *   Fix the initial redirection logic for the `/register` route to correctly preserve `return_url` and display the registration page.
    *   Identify and document the correct credentials for the test user `joe@trader.com`.
*   **Secondary Goal(s) (if any):**
*   **Out of Scope for this Sprint:**

## Key Tasks for this Sprint:

*   **Task 1:** @tasks/wip/task-001_owner-panel-ui.md
    *   Brief one-liner: "Fix Owner Panel Role Detection & UI Accessibility (Ref: Issue #3) - Ensuring the owner panel UI loads correctly after login/navigation for an owner user."
*   **Task 2:** @tasks/wip/task-002_initial-redirect.md
    *   Brief one-liner: "Fix Incorrect Initial Redirect to Login (Ref: Issue #4) - Correcting the frontend redirect logic when a client app directs a user to the auth-system's /register page."
*   **Task 3 (was Task 4):** @tasks/wip/task-004_joe-trader-credentials.md
    *   Brief one-liner: "Resolve `joe@trader.com` Credential Failure (Ref: Issue #6) - Identifying and documenting the correct, working password for the test user `joe@trader.com`."

## Current System State & Context:

*   **Environment:** Docker containers are up (backend, frontend, db). Based on `make restart` output: Frontend on `http://localhost:3000` (default), Backend on `http://localhost:5000` (default). Database on `localhost:5432` (default).
*   **Last Known Stable State:**
*   **Recent Key Changes/Blockers:**
    *   Logs show "🔍 [SCHEMA DETECTION] ❌ No matching client found for returnUrl: /owner" which is directly relevant to Task 1.
    *   The system was recently restarted using `make restart`.

## Workflow & Testing Approach:

*   **Task Management:** Follow workflow in @tasks/README.md, using `tasks/wip/`, `tasks/done/`. Update tasks based on `TASK-TEMPLATE.md`.
*   **Issue Tracking:** Issues are in @issues.md.
*   **Testing Strategy:**
    *   API tests: PowerShell scripts / Direct API calls.
    *   GUI tests: Playwright MCP tool.
    *   E2E context: @tests/END-TO-END.testing.md.
    *   Test credentials: @tests/owner-login-credentials.md, @tests/user-login-credentials.md.
*   **Definition of Done:** All acceptance criteria in task file met and verified by test cases.

## Initial Request / Starting Point:

*   "Let's start by addressing Task 1: Fix Owner Panel Role Detection & UI Accessibility. Please begin by reviewing the GUI test case TC_GUI_OWNER_PANEL_LOAD_001 from [test case 001](./wip/task-001_owner-panel-ui.md) and prepare to execute it using Playwright."

## Important Files to Reference:

*   Main Task Board: @tasks/wip/tasks.md
*   Task Template: @tasks/TASK-TEMPLATE.md
*   Task Workflow Guide: @tasks/README.md
*   Task Meta Guides: @tasks/meta/acceptance-criteria.md, @tasks/meta/test-cases.md
*   Issues Log: @issues.md
*   E2E Testing Guide: @tests/END-TO-END.testing.md
*   Relevant Source Code (if known for the first task):
    *   @frontend/src/routes/owner/
    *   @backend/src/middleware/schemaDetection.js
    *   @backend/src/services/clientServerService.js
