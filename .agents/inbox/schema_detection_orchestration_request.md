---
from: system
priority: critical
intent: testing
source_document: backend/issues.backend.md
---
## Orchestration Request: Resolve Schema Detection Issues and Backend `getByUrl` Bug for E2E Testing

This request is to address critical schema detection failures impacting E2E tests, particularly for registration and client application interactions.

**Key Issues (detailed in `backend/issues.backend.md`):**

1.  **Frontend Initiative:**
    *   Plan: Implement `X-Schema-Context` header in `frontend/src/util/fetch.js`.
    *   Goal: Provide schema context (`auth_internal` or `refererUrl`) to the backend.

2.  **Backend Bug (`getByUrl` Missing):**
    *   Error: "Operation 'getByUrl' not found for table 'client_servers'."
    *   Impact: Prevents schema resolution for external client applications when `refererUrl` is used as context.
    *   Location: `detectSchemaFromUrl` middleware, `ClientServer` service, and `queries/index.js`.
    *   Needed: Fix `getByUrl` (use `getByReferer` or implement anew) and ensure table name consistency.

**Overall Goal for Orchestration:**
Coordinate the necessary frontend and backend fixes to resolve these issues and enable successful E2E testing of registration and related functionalities. Both frontend header implementation and backend bug resolution are interdependent and crucial.

**Reference:**
For full details, analysis, and specific recommended actions for frontend and backend teams, please see `backend/issues.backend.md`. 