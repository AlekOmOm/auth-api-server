// CRUD operations for users table in sqlite db: auth.db

import db from "../connection/connection.js";
import queries from "../connection/queries.js";

// ----- DML -----

/** ---- CRUD sessions table ---
 *
 * - create session
 * - read session
 *    - read all sessions
 * - update session
 * - delete session
 */

const createSession = (session) => {
  return db.run(queries.createSession, session);
};

const getSessions = () => {
  return db.all(queries.getSessions);
};

const getSession = (id) => {
  return db.get(queries.getSession, id);
};

const updateSession = (session) => {
  return db.run(queries.updateSession, session);
};

const deleteSession = (id) => {
  return db.run(queries.deleteSession, id);
};

// Export the repository functions
export default {
  createSession,
  getSessions,
  getSession,
  updateSession,
  deleteSession,
};
