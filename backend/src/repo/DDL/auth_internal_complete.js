console.log(
   "[DDL_FILE_LOAD_CONFIRM_V1] Loading auth_internal_complete.js - DDL for auth_internal schema. UUIDs should be auto-generated."
);

/**
 * Complete DDL for auth_internal schema
 *
 * This schema contains ALL tables needed for the auth-system itself:
 * - client_servers: Client application management
 * - users: Owner and admin accounts
 * - sessions: Auth-system sessions
 */

import format from "pg-format";

const ident = (s) => format.ident(s);

export const ddl = (tenant = "auth_internal") => [
   `begin;`,
   `create schema if not exists ${ident(tenant)};`,
   `set local search_path to ${ident(tenant)}, public;`,

   // Enable UUID extension
   `create extension if not exists "uuid-ossp";`,

   // Users table for auth-system (owners, admins)
   `create table if not exists ${ident(tenant)}.users (
      id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name            VARCHAR(255) NOT NULL,
      role            VARCHAR(100) NOT NULL DEFAULT 'owner', -- 'owner', 'admin'
      email           VARCHAR(255) UNIQUE NOT NULL,
      password_hash   VARCHAR(255) NOT NULL,
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
   );`,

   // Sessions table for auth-system
   `create table if not exists ${ident(tenant)}.sessions (
      id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id         UUID REFERENCES ${ident(
         tenant
      )}.users(id) ON DELETE CASCADE,
      session_id      UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
      ip_address      INET,
      user_agent      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at      TIMESTAMPTZ
   );`,

   // Client servers table for client management
   `create table if not exists ${ident(tenant)}.client_servers (
      client_id VARCHAR(255) PRIMARY KEY,
      client_secret_hash VARCHAR(255) NOT NULL,
      app_name VARCHAR(255) NOT NULL,
      assigned_schema_name VARCHAR(255) UNIQUE NOT NULL,
      identifier_url VARCHAR(255) NOT NULL,
      entry_point_url VARCHAR(255) NOT NULL,
      authorized_urls TEXT[] NOT NULL,
      user_id UUID REFERENCES ${ident(
         tenant
      )}.users(id) ON DELETE CASCADE, -- Links to owner
      client_mode VARCHAR(50) DEFAULT 'frontend-login-proxy',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
   );`,

   // Indexes for users table
   `create index if not exists idx_users_email on ${ident(
      tenant
   )}.users(email);`,
   `create index if not exists idx_users_role on ${ident(tenant)}.users(role);`,

   // Indexes for sessions table
   `create index if not exists idx_sessions_session_id on ${ident(
      tenant
   )}.sessions(session_id);`,
   `create index if not exists idx_sessions_user_id on ${ident(
      tenant
   )}.sessions(user_id);`,
   `create index if not exists idx_sessions_expires_at on ${ident(
      tenant
   )}.sessions(expires_at);`,

   // Indexes for client_servers table
   `create index if not exists idx_client_servers_client_id on ${ident(
      tenant
   )}.client_servers(client_id);`,
   `create index if not exists idx_client_servers_user_id on ${ident(
      tenant
   )}.client_servers(user_id);`,
   `create index if not exists idx_client_servers_identifier_url on ${ident(
      tenant
   )}.client_servers(identifier_url);`,
   `create index if not exists idx_client_servers_entry_point_url on ${ident(
      tenant
   )}.client_servers(entry_point_url);`,
   `create index if not exists idx_client_servers_assigned_schema on ${ident(
      tenant
   )}.client_servers(assigned_schema_name);`,

   `commit;`,
];

export const authInternalDDL = {
   ddl,
};

export default authInternalDDL;
