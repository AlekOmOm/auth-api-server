# Modular Database

## Core Concepts

pre-condition:
- Postgres (docker container)

1. **Modular database schema**  

   • Auth-System keeps a registry of authorised clientServers and dynamically opens the correct DB connection based on the active **socket or API token**.

2. **Single template for clientServer schemas**  
   • A single SQL file (`db/client_servers/client_server_schema.sql`) defines the user/session tables.  
   • At onboarding time Auth-System duplicates that definition into a *new* Postgres schema (e.g. `acme_corp`) instead of shipping N different .sql files.  
   • This keeps migrations DRY – you only maintain the structure once and script the name substitution in code.
