# Documentation Request Pipeline

This directory serves as the input queue for the documentation-developer-agent in the Auth System mono-repo.

## Directory Structure

```
.agents/docs-requests/
├── README.md              # This file
├── *.md                   # Pending documentation requests
└── processed/            # Completed requests with acknowledgments
    └── *.md             # Processed requests and their acknowledgments
```

## How to Submit a Documentation Request

Any agent (backend, frontend, test, devops) can submit documentation requests by creating a markdown file in this directory.

### File Naming Convention
`YYYY-MM-DD-HH-MM-SS-[agent-name]-[brief-description].md`

Example: `2024-01-15-14-30-00-backend-agent-new-auth-endpoint.md`

### Request Template

```markdown
---
from: [your-agent-name]
timestamp: 2024-01-15T10:30:00Z
priority: critical | high | medium | low
type: api-change | feature | bug-fix | refactor | architecture | security
scope: backend | frontend | system | cross-stack
---

## Change Summary
Brief description of what changed

## Affected Components
- backend/src/routes/auth.js
- frontend/src/services/authService.js
- docs/api/authentication.md

## Documentation Updates Needed
- [ ] Update OpenAPI specification for new endpoint
- [ ] Add new authentication flow to architectural diagrams
- [ ] Update frontend integration guide
- [ ] Add error codes to troubleshooting guide
- [ ] Update environment variables documentation

## Details
Provide detailed information about the change, including:
- What was changed and why
- New functionality or behavior
- Breaking changes or migration requirements
- Security implications

## Code References
- File: backend/src/routes/auth.js:L125-L145
- Commit: abc123def456
- PR: #234
```

## Processing Workflow

1. **Submission**: Agents create request files in this directory
2. **Processing**: Documentation agent monitors and processes requests
3. **Updates**: Documentation is updated across the mono-repo
4. **Acknowledgment**: Processed requests are moved to `processed/` with results
5. **Cleanup**: Old processed requests can be archived periodically

## Priority Levels

- **Critical**: Security updates, data loss prevention, breaking changes
- **High**: New features, API changes, major refactors
- **Medium**: Bug fixes, optimizations, minor features
- **Low**: Typos, formatting, clarifications

## Scope Definitions

- **backend**: Changes affecting backend services, APIs, databases
- **frontend**: Changes affecting UI components, client-side logic
- **system**: Architecture, deployment, infrastructure changes
- **cross-stack**: Changes affecting multiple components

## Best Practices

1. **Be Specific**: Include exact file paths and line numbers
2. **Be Complete**: List all documentation that needs updating
3. **Be Timely**: Submit requests as soon as changes are merged
4. **Be Clear**: Provide enough context for accurate documentation

## Integration Example

```bash
# Backend agent submits a request after implementing new feature
echo "Creating documentation request for new OAuth provider..."
cat > .agents/docs-requests/2024-01-15-oauth-provider.md << EOF
---
from: backend-developer-agent
timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
priority: high
type: feature
scope: backend
---

## Change Summary
Added support for GitHub OAuth provider

## Affected Components
- backend/src/config/oauth.js
- backend/src/routes/auth.js
- backend/src/services/oauthService.js

## Documentation Updates Needed
- [ ] Add GitHub OAuth setup guide
- [ ] Update OAuth configuration in .env.template
- [ ] Add GitHub provider to OpenAPI spec
- [ ] Update authentication flow diagram

## Details
Implemented GitHub as an OAuth provider with the following:
- Client ID/Secret configuration
- Authorization callback endpoint
- User profile mapping
- Token refresh logic

## Code References
- File: backend/src/config/oauth.js:L45-L78
- Commit: def456ghi789
EOF
```

## Monitoring

The documentation agent will:
- Check this directory every processing cycle
- Process requests in FIFO order (with priority override)
- Generate acknowledgment files in `processed/`
- Provide weekly summary reports of documentation updates 