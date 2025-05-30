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

// --- create ---
export const create = `
  INSERT INTO sessions (id, user_id, session_id, ip_address, user_agent, expires_at)
  VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
  RETURNING *;
`;
// --- get ---
export const get = `SELECT * FROM sessions WHERE session_id = $1::uuid;`;
export const getAll = `SELECT * FROM sessions;`;
export const getByUserId = `SELECT * FROM sessions WHERE user_id = $1::uuid;`;
export const getById = `SELECT * FROM sessions WHERE id = $1::uuid;`;

// --- update ---
export const update = `
  UPDATE sessions SET expires_at = $1 WHERE session_id = $2::uuid;
`;

// --- delete ---
export const deleteById = `DELETE FROM sessions WHERE session_id = $1::uuid;`;
export const deleteAll = `
   DELETE FROM sessions;
`;
export const deleteByUserId = `DELETE FROM sessions WHERE user_id = $1::uuid;`;
export const deleteExpired = `
  DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at <= NOW();
`;

export const SESSION = {
   create,
   get,
   getAll,
   getByUserId,
   getById,
   update,
   deleteById,
   deleteAll,
   deleteByUserId,
   deleteExpired,
};
