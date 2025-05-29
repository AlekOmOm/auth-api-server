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

export const getSessions = async () => {
   const pool = await getPool();
   const { rows } = await pool.query(queries.getSessions);
   return rows;
};

export const getSession = async (session_id) => {
   const pool = await getPool();
   const { rows } = await pool.query(queries.getSession, [session_id]);
   return rows[0];
};

export const deleteSessionByUserId = async (user_id) => {
   const pool = await getPool();
   await pool.query(queries.deleteSessionByUserId, [user_id]);
};

export const deleteSessionBySessionId = async (session_id) => {
   const pool = await getPool();
   await pool.query(queries.deleteSessionBySessionId, [session_id]);
};
