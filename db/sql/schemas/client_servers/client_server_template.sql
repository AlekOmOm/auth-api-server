-- Template SQL for client server schema
-- NOTE: This file creates a sample schema called client_template.
--       At runtime, Auth-System will duplicate the same structure
--       for each onboarded clientServer by replacing `client_template`
--       with the requested schema name.

-- 1) Ensure the schema exists
CREATE SCHEMA IF NOT EXISTS client_template;

-- 2) Use the newly-created schema for the rest of this script
SET search_path TO client_template;

-- 3) Enable extension(s)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 4) Core tables

-- Users table (auth & profile)
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    role            VARCHAR(100) NOT NULL DEFAULT 'user',
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Sessions table (cookie / token mapping)
CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id      UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id); 