// CRUD operations for sessions table (Postgres multi-tenant)

import * as queries from "../connection/queries.js";

export const createSession = async (
   pool,
   {
      id,
      user_id,
      session_id,
      ip_address = null,
      user_agent = null,
      expires_at = null,
   }
) => {
   const { rows } = await pool.query(queries.createSession, [
      id,
      user_id,
      session_id,
      ip_address,
      user_agent,
      expires_at,
   ]);
   return rows[0];
};

export const getSessions = async (pool) => {
   const { rows } = await pool.query(queries.getSessions);
   return rows;
};

export const getSession = async (pool, session_id) => {
   const { rows } = await pool.query(queries.getSession, [session_id]);
   return rows[0];
};

export const deleteSessionByUserId = async (pool, user_id) => {
   await pool.query(queries.deleteSessionByUserId, [user_id]);
};

export const deleteSessionBySessionId = async (pool, session_id) => {
   await pool.query(queries.deleteSessionBySessionId, [session_id]);
};
