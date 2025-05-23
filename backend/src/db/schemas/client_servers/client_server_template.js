import format from "pg-format";

const DEFAULT_SCHEMA_NAME = "client_template";

const ident = (s) => format.ident(s);

export const ddl = (tenant = DEFAULT_SCHEMA_NAME) => [
   `begin;`,
   `create schema if not exists ${ident(tenant)};`,
   `set local search_path to ${ident(tenant)}, public;`,
   `create table if not exists ${ident(tenant)}.users (
    id              UUID PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    role            VARCHAR(100) NOT NULL DEFAULT 'user',
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);`,
   `create table if not exists ${ident(tenant)}.sessions (
    id              UUID PRIMARY KEY,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id      UUID UNIQUE NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
  );`,
   `commit;`,
];

export const clientServerTemplateSchema = {
   ddl,
};
