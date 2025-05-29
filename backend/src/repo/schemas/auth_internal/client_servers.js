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
        identifier_url VARCHAR(255) NOT NULL, -- e.g., 'https://trading-sim.com/trading'
        entry_point_url VARCHAR(255) NOT NULL, -- e.g., 'https://trading-sim.com/trading'
        authorized_urls TEXT[] NOT NULL, -- Array of allowed URLs for redirection
        user_id UUID, -- Links to user who owns this client (nullable for public API)
        client_mode VARCHAR(50) DEFAULT 'frontend-login-proxy', -- 'frontend-login-proxy' or 'api-auth-server'
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,
   `commit;`,
];

// three indexes:
// - client_id
// - identifier_url
// - entry_point_url
export const createIndex = (tenant = "auth_internal") => [
   // client_id
   `create index if not exists ${ident(
      tenant
   )}.idx_client_servers_client_id on ${ident(
      tenant
   )}.client_servers(client_id);`,
   // identifier_url
   `create index if not exists ${ident(
      tenant
   )}.idx_client_servers_identifier_url on ${ident(
      tenant
   )}.client_servers(identifier_url);`,
   // entry_point_url
   `create index if not exists ${ident(
      tenant
   )}.idx_client_servers_entry_point_url on ${ident(
      tenant
   )}.client_servers(entry_point_url);`,
];
