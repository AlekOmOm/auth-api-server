/**
 * Session Queries
 * - CRUD operations for sessions of a Client Server
 *
 * schema: client_servers  (./schemas/client_servers.sql)

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
 */

export const createSession = `
  INSERT INTO sessions (id, user_id, session_id, ip_address, user_agent, expires_at)
  VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
  RETURNING *;
`;
export const getSessions = `SELECT * FROM sessions;`;
export const getSession = `SELECT * FROM sessions WHERE session_id = $1::uuid;`;
export const getSessionByUserId = `SELECT * FROM sessions WHERE user_id = $1::uuid;`;
export const deleteSessionByUserId = `DELETE FROM sessions WHERE user_id = $1::uuid;`;
export const deleteSessionBySessionId = `DELETE FROM sessions WHERE session_id = $1::uuid;`;

export const getSessionBySessionId = `
  SELECT * FROM sessions WHERE session_id = $1 AND (expires_at IS NULL OR expires_at > NOW());
`;

export const deleteSession = `
  DELETE FROM sessions WHERE session_id = $1;
`;

export const deleteExpiredSessions = `
  DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at <= NOW();
`;

export const deleteSessions = `
   DELETE FROM sessions;
`;

// delete all sessions for a user
export const deleteSessionsByUserId = `
   DELETE FROM sessions WHERE user_id = $1;
`;

// delete all sessions for a user by session_id
export const deleteSessionsBySessionId = `
   DELETE FROM sessions WHERE session_id = $1;
`;
