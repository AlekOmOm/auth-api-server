// CRUD operations for users table in sqlite db: auth.db

import db from "../connection/connection.js";
import queries from "../connection/queries.js";

// ----- DML -----

/** ---- CRUD users table ---
 *
 * - create user
 * - read user
 *    - read all users
 * - update user
 * - delete user
 */

const createUser = (user) => {
  return db.run(queries.createUser, user);
};

const getUsers = () => {
  return db.all(queries.getUsers);
};

const getUser = (id) => {
  return db.get(queries.getUser, id);
};

const updateUser = (user) => {
  return db.run(queries.updateUser, user);
};

const deleteUser = (id) => {
  return db.run(queries.deleteUser, id);
};

// Export the repository functions
export default {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
