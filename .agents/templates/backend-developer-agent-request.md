---
id: {{REQUEST_ID}}
from: orchestrator-agent
to: backend-developer-agent
priority: {{PRIORITY}}
status: pending
sent-at: {{TIMESTAMP}}
meta:
  source-request: {{SOURCE_REQUEST}}
  original-from: {{ORIGINAL_FROM}}
  documentation-ref: {{DOCUMENTATION_REF}}
  task_file_path: .agents/requests/backend-developer-agent/{{REQUEST_ID}}.md
---

## Task: {{TASK_TITLE}}

### Critical Files to Examine (Direct References):
{{#CRITICAL_FILES}}
- **{{FILE_CATEGORY}}**: `{{FILE_PATH}}` ({{FILE_DESCRIPTION}})
{{/CRITICAL_FILES}}

### Supporting Documentation:
{{#DOCUMENTATION_FILES}}
- **{{DOC_CATEGORY}}**: `{{DOC_PATH}}`
{{/DOCUMENTATION_FILES}}

### Specific Error Contexts:

{{#ERROR_CONTEXTS}}
#### {{ERROR_INDEX}}. {{ERROR_TITLE}}
**Error Message**: `{{ERROR_MESSAGE}}`
**Affected Endpoints**: {{AFFECTED_ENDPOINTS}}
**Problem Location**: `{{PROBLEM_LOCATION}}`
**Root Cause Analysis** (from {{ANALYSIS_SOURCE}}):
{{#ROOT_CAUSES}}
- {{CAUSE_DESCRIPTION}}
{{/ROOT_CAUSES}}

{{#LOGIC_FLOW}}
**{{LOGIC_TITLE}}** (from `{{LOGIC_FILE}}`):
{{#FLOW_STEPS}}
{{STEP_INDEX}}. {{STEP_DESCRIPTION}}
{{/FLOW_STEPS}}
{{/LOGIC_FLOW}}

{{/ERROR_CONTEXTS}}

### Required Fixes (Prioritized):

#### High Priority:
{{#HIGH_PRIORITY_FIXES}}
{{FIX_INDEX}}. **{{FIX_TITLE}}** (`{{FIX_FILE}}`):
{{#FIX_TASKS}}
   - {{TASK_DESCRIPTION}}
{{/FIX_TASKS}}
{{/HIGH_PRIORITY_FIXES}}

#### Medium Priority:
{{#MEDIUM_PRIORITY_FIXES}}
{{FIX_INDEX}}. **{{FIX_TITLE}}** (`{{FIX_FILE}}`):
{{#FIX_TASKS}}
   - {{TASK_DESCRIPTION}}
{{/FIX_TASKS}}
{{/MEDIUM_PRIORITY_FIXES}}

### Testing Requirements:
{{#TESTING_REQUIREMENTS}}
- {{TEST_DESCRIPTION}}
{{/TESTING_REQUIREMENTS}}

### Expected Outcomes:
{{#EXPECTED_OUTCOMES}}
- {{OUTCOME_DESCRIPTION}}
{{/EXPECTED_OUTCOMES}}

### {{CONTEXT_SECTION_TITLE}}:
{{#CONTEXT_ITEMS}}
- **{{CONTEXT_KEY}}**: {{CONTEXT_VALUE}}
{{/CONTEXT_ITEMS}} 