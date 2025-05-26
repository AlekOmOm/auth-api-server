# Guide for Task Workflow

This document outlines the process for managing tasks within the Auth-System project, ensuring clarity, consistency, and effective tracking from identification to resolution.

## PRD Context: 

always navigate sprint and tasks in relation to the PRD.md file.
- [prd](../docs/PRD.md)

## cmds terminal

Makefile gives easy access to all commands.

```
make help

make rebuild
# make stop && make run
make restart

make run 
```

- [make cmds](../Makefile)

## mcp tools

- [mcp tools](../docs/mcp-tools.md)

## Task Lifecycle:

1.  **Issue Identification:** Issues are first logged in `[issues.md](../issues.md)`. These represent problems or areas for improvement identified through testing, feedback, or system analysis.

2.  **Task Formulation & Prioritization:**
    *   Once an issue is sufficiently understood and deemed actionable, a formal task is created using the `[TASK-TEMPLATE.md](./TASK-TEMPLATE.md)`.
    *   This template ensures all necessary information (problem description, acceptance criteria, test cases, etc.) is captured.
    *   For guidance on specific sections of the template, refer to:
        *   `[Guide to Formulating Acceptance Criteria](./meta/acceptance-criteria.md)`
        *   `[Guide to Formulating Test Cases](./meta/test-cases.md)`
        *   General End-to-End testing context: `[END-TO-END.testing.md](../tests/END-TO-END.testing.md)` (This guide explains, for example, that GUI testing involves the Playwright MCP tool, and API testing typically uses PowerShell/Bash scripts).
    *   New tasks are initially placed in the `[backlog](./backlog/)` directory.
    *   Tasks in the backlog should be prioritized based on factors like severity, user impact, and project goals.

3.  **Work in Progress (WIP):**
    *   When a task is selected for active development, it is moved from the `backlog/` to the `[wip/](./wip/)` (Work in Progress) directory.
    *   The developer assigned to the task works on implementing the solution and ensuring all acceptance criteria can be met.

4.  **Verification & Completion ("Done")**:
    *   Before a task can be considered "done," all its defined **Acceptance Criteria** must be met and verified through the specified **Test Cases** (both API and GUI as applicable).
    *   Once verified, the task markdown file is moved from `wip/` to the `[done/](./done/)` directory.
    *   The corresponding issue(s) in `issues.md` should also be updated to reflect resolution and link to the completed task if necessary.

## Task Structure (using `TASK-TEMPLATE.md`):

Each task file should cover:
*   Clear Title, Reference to Issue(s), Date, Priority, Status.
*   **Problem Description / User Story:** The "why" and "what."
*   **Affected User Flow(s) & Components:** Scope of impact.
*   **Proposed Solution (Optional):** Technical approach, if known.
*   **Acceptance Criteria:** Measurable conditions for completion. *Crucial for defining "done."*
*   **Test Cases:** Specific steps for API and/or GUI testing to verify ACs. *Crucial for ensuring quality.*
*   **Notes / Dependencies / Blockers:** Any other relevant context.

By following this structured workflow and utilizing the provided templates and guides, we aim for a more robust and transparent development process.




