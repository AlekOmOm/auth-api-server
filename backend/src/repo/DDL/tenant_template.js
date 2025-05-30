/**
 * Tenant Schema Template DDL
 *
 * This template creates the standard schema structure for each client application.
 * Contains only tables needed for tenant users:
 * - users: Tenant application users
 * - sessions: Tenant user sessions
 */

import format from "pg-format";

const ident = (s) => format.ident(s);

export const ddl = (tenant = "client_template") => [
   `begin;`,
   `create schema if not exists ${ident(tenant)};`,
   `set local search_path to ${ident(tenant)}, public;`,

   // Enable UUID extension
   `create extension if not exists "uuid-ossp";`,

   // Users table for tenant application users
   `create table if not exists ${ident(tenant)}.users (
      id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name            VARCHAR(255) NOT NULL,
      role            VARCHAR(100) NOT NULL DEFAULT 'user', -- Tenant-specific roles
      email           VARCHAR(255) UNIQUE NOT NULL,
      password_hash   VARCHAR(255) NOT NULL,
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
   );`,

   // Sessions table for tenant user sessions
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

   // Indexes for users table
   `create index if not exists ${ident(tenant)}.idx_users_email on ${ident(
      tenant
   )}.users(email);`,
   `create index if not exists ${ident(tenant)}.idx_users_role on ${ident(
      tenant
   )}.users(role);`,

   // Indexes for sessions table
   `create index if not exists ${ident(
      tenant
   )}.idx_sessions_session_id on ${ident(tenant)}.sessions(session_id);`,
   `create index if not exists ${ident(tenant)}.idx_sessions_user_id on ${ident(
      tenant
   )}.sessions(user_id);`,
   `create index if not exists ${ident(
      tenant
   )}.idx_sessions_expires_at on ${ident(tenant)}.sessions(expires_at);`,

   `commit;`,
];

export const tenantTemplateDDL = {
   ddl,
};

export default tenantTemplateDDL;
