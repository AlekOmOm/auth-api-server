# guide for end-to-end testing 

## context:

testing users:
- [owner3 user](../tests/owner-login-credentials.md)

## approaches

1. GUI testing 
  - use MCP tool: playwright to navigate Browser, click, fill forms, etc.

## tools

### postgres mcp 

tool calls available:
- `list_schemas`
- `list_objects`
- `get_object_details`
- `explain_query`
- `analyze_workload_indexes`
- `analyze_query_indexes`
- `analyze_db_health`
- `get_top_queries`
- `execute_sql`

### for GUI testing: playwright mcp 

mcp tool:
- playwright

tool calls:
- `browser_navigate` 
- `browser_close`
- `browser_resize`
- `browser_console_messages`
- `browser_handle_dialog`
- `browser_file_upload`
- `browser_install`
- `browser_press_key`
- `browser_navigate`
- `browser_navigate_back`
- `browser_navigate_forward`
- `browser_network_requests`
- `browser_pdf_save`
- `browser_take_screenshot`
- `browser_snapshot`
- `browser_click`
- `browser_drag`
- `browser_hover`
- `browser_type`
- `browser_select_option`
- `browser_tab_list`
- `browser_tab_new`
- `browser_tab_select`
- `browser_tab_close`
- `browser_generate_playwright_test`
- `browser_wait_for`

## endpoints:

trading-sim (client app):
- home: http://localhost:5173/home
- trading-sim: http://localhost:5173/
  - requires authentication

auth-server
- login: http://localhost:3000/login
- register: http://localhost:3000/register

owner endpoints of auth-server:
- http://localhost:3000/owner






