# Auth System Glossary

This glossary defines key terms used within the Auth System and its components.

- **Auth System**: The overall multi-tenant authentication and authorization service.
- **Auth System Owner**: A user role within the `auth_internal` schema, responsible for managing client applications (Client Servers) and their configurations via the Owner Panel.
- **Client App User**: A user role, typically within a `client_*` schema, who registers and logs in to use a specific client application that is integrated with the Auth System.
- **Client Server**: Represents a client application registered within the Auth System. It has its own unique schema (`client_*`), configuration (identifier URLs, entry point URLs, authorized URLs), and users.
- **Schema**: A PostgreSQL schema used for multi-tenant data isolation.
    - `auth_internal`: The schema for the Auth System itself, storing Auth System Owner accounts and Client Server registrations.
    - `client_*`: A dynamically created schema for each registered Client Server, storing its specific users and sessions (e.g., `client_trading_sim`).
    - `client_template`: A base schema used if no specific tenant can be identified.
- **Session**: A server-side record of a user's authenticated state, stored in the database within the user's respective schema.
- **Owner Panel**: The user interface within the Auth System, accessible by Auth System Owners, used to manage Client Servers.
- **Identifier URL**: A unique URL associated with a Client Server, used by the Auth System to identify the client during authentication flows.
- **Entry Point URL**: The URL to which a user is redirected after successfully authenticating for a specific Client Server.
- **Authorized URLs**: A list of URLs associated with a Client Server from which authentication requests are permitted. Used for schema detection and security.
- **`userType`**: A field used during registration (primarily on the frontend) to distinguish between a user intending to become an "Auth System Owner" (`auth`) or a "Client App User" (`client`). This is then typically mapped to a `role`.
- **`role`**: A field in the user model and session data that defines the user's permissions and type. Common values:
    - `owner`: For Auth System Owners within the `auth_internal` schema.
    - `admin`: Potentially for Auth System administrators within `auth_internal`. (Usage context might need clarification based on backend's OpenAPI).
    - `user`: For Client App Users within `client_*` schemas. 