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

import format from "pg-format";

// Sessions
export const create = (schema) =>
   format(
      "INSERT INTO %I.sessions (id, user_id, session_id, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;",
      schema
   );

export const getAll = (schema) =>
   format("SELECT * FROM %I.sessions ORDER BY created_at DESC;", schema);

export const get = (schema) =>
   format("SELECT * FROM %I.sessions WHERE session_id = $1;", schema);

export const getById = (schema) =>
   format("SELECT * FROM %I.sessions WHERE id = $1;", schema);

export const getByUserId = (schema) =>
   format("SELECT * FROM %I.sessions WHERE user_id = $1;", schema);

export const update = (schema) =>
   format(
      "UPDATE %I.sessions SET expires_at = $1, user_agent = $2, ip_address = $3 WHERE session_id = $4;",
      schema
   ); // Note: user_agent and ip_address might not be typically updated this way.

export const deleteById = (schema) =>
   format("DELETE FROM %I.sessions WHERE session_id = $1;", schema);

export const deleteAll = (schema) => format("DELETE FROM %I.sessions;", schema);

export const deleteByUserId = (schema) =>
   format("DELETE FROM %I.sessions WHERE user_id = $1;", schema);

export const deleteExpired = (schema) =>
   format("DELETE FROM %I.sessions WHERE expires_at < NOW();", schema);

export const SESSION = {
   create,
   getAll,
   get,
   getById,
   getByUserId,
   update,
   deleteById,
   deleteAll,
   deleteByUserId,
   deleteExpired,
};
