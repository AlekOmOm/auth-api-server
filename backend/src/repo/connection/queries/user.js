/**
 * User Queries
 *
 */

import format from "pg-format";

// Users
/**
 * SQL query to create a new user.
 * IMPORTANT: The `id` column is explicitly included in the INSERT statement and a corresponding parameter placeholder (`$1` after formatting, then `$5` in final query due to other params)
 * is used. This is because UUIDs are generated application-side (`src/utils/uuid.js` via the `User` model)
 * and must be explicitly passed to the database. This deviates from relying on a database default for UUID generation.
 * The order of parameters in the VALUES clause must match the order in the `paramExtractor` in `queries/index.js`.
 */
export const create = (schema) =>
   format(
      "INSERT INTO %I.users (id, name, role, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *;",
      schema
   );

// Note: createUsers might need special handling if it's a bulk insert with varying schemas,
// or if pg-format needs a different approach for multi-row inserts with schema.
// For now, assuming it targets a single schema per call.
export const createUsers = (schema, usersData) => {
   // Assuming usersData is an array of arrays for VALUES (), ()
   // e.g. [[id1, name1, ...], [id2, name2, ...]]
   // This needs to be structured by the caller (Repo or service layer) before paramExtractor.
   return format(
      "INSERT INTO %I.users (id, name, role, email, password_hash) VALUES %L RETURNING *;",
      schema,
      usersData
   );
};

export const getAll = (schema) =>
   format("SELECT * FROM %I.users ORDER BY created_at DESC;", schema);

export const get = (schema) =>
   format("SELECT * FROM %I.users WHERE id = $1;", schema);

export const update = (schema) =>
   format(
      "UPDATE %I.users SET name = $1, role = $2, email = $3, password_hash = $4 WHERE id = $5 RETURNING *;",
      schema
   );

export const deleteByID = (schema) =>
   format("DELETE FROM %I.users WHERE id = $1;", schema);

export const deleteAll = (schema) => format("DELETE FROM %I.users;", schema);

export const getByEmail = (schema) =>
   format("SELECT * FROM %I.users WHERE email = $1;", schema);

export const USER = {
   create,
   createUsers, // Will need careful implementation in Repo/service
   getAll,
   get,
   update,
   deleteByID,
   deleteAll,
   getByEmail,
};
