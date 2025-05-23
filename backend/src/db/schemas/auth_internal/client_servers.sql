-- for orchestration of client servers
-- In schema: auth_internal
CREATE SCHEMA IF NOT EXISTS auth_internal;

SET search_path TO auth_internal, public;

-- Note: UUID generation is handled in JavaScript, not PostgreSQL

CREATE TABLE IF NOT EXISTS client_servers (
    client_id VARCHAR(255) PRIMARY KEY,
    client_secret_hash VARCHAR(255) NOT NULL, -- Store a hash of the client secret
    app_name VARCHAR(255) NOT NULL,
    assigned_schema_name VARCHAR(255) UNIQUE NOT NULL, -- e.g., 'client_acme_corp_users'
    allowed_return_urls TEXT[] NOT NULL, -- Array of allowed URLs for redirection
    user_id UUID, -- Links to user who owns this client (nullable for public API)
    client_mode VARCHAR(50) DEFAULT 'frontend-login-proxy', -- 'frontend-login-proxy' or 'api-auth-server'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);