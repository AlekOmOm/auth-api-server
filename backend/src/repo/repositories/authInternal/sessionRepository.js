// CRUD operations for sessions table (Postgres multi-tenant)

import * as queries from "../../connection/queries/queries.js";
import getPool from "../../connection/pools/auth.js";

export const createSession = async ({
   id,
   user_id,
   session_id,
   ip_address = null,
   user_agent = null,
   // default = 24 hrs
   expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
}) => {
   const pool = await getPool();
   const { rows } = await pool.query(queries.SESSION.create, [
      id,
      user_id,
      session_id,
      ip_address,
      user_agent,
      expires_at,
   ]);
   return rows[0];
};

export const getSessions = async () => {
   const pool = await getPool();
   const { rows } = await pool.query(queries.SESSION.getAll);
   return rows;
};

export const getSession = async (session_id) => {
   const pool = await getPool();
   const { rows } = await pool.query(queries.SESSION.get, [session_id]);
   return rows[0];
};

export const deleteSessionByUserId = async (user_id) => {
   const pool = await getPool();
   await pool.query(queries.SESSION.deleteByUserId, [user_id]);
};

export const deleteSessionBySessionId = async (session_id) => {
   const pool = await getPool();
   await pool.query(queries.SESSION.deleteBySessionId, [session_id]);
};

export const updateSessionExpiry = async (pool, session_id, expires_at) => {
   // Since we don't have a specific query for updating expiry, we'll need to add one
   // For now, let's use a direct query
   const query = `
      UPDATE sessions 
      SET expires_at = $2 
      WHERE session_id = $1
      RETURNING *;
   `;
   const { rows } = await pool.query(query, [session_id, expires_at]);
   return rows[0];
};

export const deleteExpiredSessions = async (pool) => {
   const result = await pool.query(queries.SESSION.deleteExpired);
   return result;
};
