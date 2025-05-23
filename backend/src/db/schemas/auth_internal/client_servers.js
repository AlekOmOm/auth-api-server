// for orchestration of client servers
// In schema: auth_internal
import format from "pg-format";

const ident = (s) => format.ident(s);

export const ddl = (tenant = "auth_internal") => [
   `begin;`,
   `create schema if not exists ${ident(tenant)};`,
   `set local search_path to ${ident(tenant)}, public;`,
   `create table if not exists ${ident(tenant)}.client_servers (
        client_id VARCHAR(255) PRIMARY KEY,
        client_secret_hash VARCHAR(255) NOT NULL, -- Store a hash of the client secret
        app_name VARCHAR(255) NOT NULL,
        assigned_schema_name VARCHAR(255) UNIQUE NOT NULL, -- e.g., 'client_acme_corp_users'
        allowed_return_urls TEXT[] NOT NULL, -- Array of allowed URLs for redirection
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,
   `commit;`,
];
