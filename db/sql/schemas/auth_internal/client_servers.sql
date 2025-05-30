-- for orchestration of client servers
CREATE SCHEMA IF NOT EXISTS auth_internal;

-- In schema: auth_internal
CREATE TABLE client_servers (
    client_id VARCHAR(255) PRIMARY KEY,
    client_secret_hash VARCHAR(255) NOT NULL, -- Store a hash of the client secret
    app_name VARCHAR(255) NOT NULL,
    assigned_schema_name VARCHAR(255) UNIQUE NOT NULL, -- e.g., 'client_acme_corp_users'
    identifier_url VARCHAR(255) NOT NULL, -- e.g., 'https://trading-sim.com/trading'
    entry_point_url VARCHAR(255) NOT NULL, -- e.g., 'https://trading-sim.com/trading'
    authorized_urls TEXT[] NOT NULL, -- Array of allowed URLs for redirection
    user_id UUID NOT NULL, -- Links to user who owns this client
    client_mode VARCHAR(50) DEFAULT 'frontend-login-proxy', -- 'frontend-login-proxy' or 'api-auth-server'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- indexes: client_id, identifier_url, entry_point_url
CREATE INDEX IF NOT EXISTS idx_client_servers_client_id ON client_servers(client_id);
CREATE INDEX IF NOT EXISTS idx_client_servers_user_id ON client_servers(user_id);
CREATE INDEX IF NOT EXISTS idx_client_servers_identifier_url ON client_servers(identifier_url);
CREATE INDEX IF NOT EXISTS idx_client_servers_entry_point_url ON client_servers(entry_point_url);
CREATE INDEX IF NOT EXISTS idx_client_servers_authorized_urls ON client_servers(authorized_urls);
