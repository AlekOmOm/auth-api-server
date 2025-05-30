-- Complete auth_internal schema for Auth-System
-- Contains all tables needed for auth-system operations:
-- - users: Owner and admin accounts  
-- - sessions: Auth-system sessions
-- - client_servers: Client application management

CREATE SCHEMA IF NOT EXISTS auth_internal;
SET search_path TO auth_internal;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for auth-system (owners, admins)
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    role            VARCHAR(100) NOT NULL DEFAULT 'owner', -- 'owner', 'admin'
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Sessions table for auth-system
CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id      UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);

-- Client servers table for client management
CREATE TABLE IF NOT EXISTS client_servers (
    client_id VARCHAR(255) PRIMARY KEY,
    client_secret_hash VARCHAR(255) NOT NULL,
    app_name VARCHAR(255) NOT NULL,
    assigned_schema_name VARCHAR(255) UNIQUE NOT NULL,
    identifier_url VARCHAR(255) NOT NULL,
    entry_point_url VARCHAR(255) NOT NULL,
    authorized_urls TEXT[] NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Links to owner
    client_mode VARCHAR(50) DEFAULT 'frontend-login-proxy',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Indexes for sessions table  
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Indexes for client_servers table
CREATE INDEX IF NOT EXISTS idx_client_servers_client_id ON client_servers(client_id);
CREATE INDEX IF NOT EXISTS idx_client_servers_user_id ON client_servers(user_id);
CREATE INDEX IF NOT EXISTS idx_client_servers_identifier_url ON client_servers(identifier_url);
CREATE INDEX IF NOT EXISTS idx_client_servers_entry_point_url ON client_servers(entry_point_url);
CREATE INDEX IF NOT EXISTS idx_client_servers_assigned_schema ON client_servers(assigned_schema_name); 
