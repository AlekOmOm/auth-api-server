// ----- DML QUERIES FOR POSTGRES (multi-tenant) -----

/**
 * operations
 * - create
 * - get
 * - getAll
 * - getByID (client_id)
 * - update
 * - deleteByID (client_id)
 * - deleteAll
 *
 * custom
 * - getBySecretHash
 * - getByReferer
 * - getByUserId
 * - getByUserIdAndClientId
 * - deleteByUserIdAndClientId
 * - getAllowedUrls
 *
 */

import format from "pg-format";

// Client Servers
export const create = (schema) =>
   format(
      "INSERT INTO %I.client_servers (client_id, client_secret_hash, app_name, assigned_schema_name, identifier_url, entry_point_url, authorized_urls, user_id, client_mode) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;",
      schema
   );

export const get = (schema) =>
   format("SELECT * FROM %I.client_servers WHERE client_id = $1;", schema);

export const getAll = (schema) =>
   format("SELECT * FROM %I.client_servers ORDER BY created_at DESC;", schema);

export const getBySecretHash = (schema) =>
   format(
      "SELECT * FROM %I.client_servers WHERE client_secret_hash = $1;",
      schema
   );

export const getByReferer = (schema) => {
   console.log(
      "[queries/clientServer.js GBR_DEBUG] Received schema for getByReferer:",
      schema,
      "(type:",
      typeof schema,
      ")"
   );
   if (typeof schema !== "string") {
      console.error(
         "[queries/clientServer.js GBR_DEBUG] CRITICAL: schema argument to getByReferer is NOT a string! Value:",
         schema
      );
      // This will likely cause pg-format to fail if it expects a string for %I
      // Consider throwing an error here or ensuring schema is always a string before this point.
   }
   return format(
      "SELECT * FROM %I.client_servers WHERE identifier_url = $1 OR entry_point_url = $1 OR $1 = ANY(authorized_urls);",
      schema
   );
};

export const update = (schema) =>
   format(
      "UPDATE %I.client_servers SET client_secret_hash = $2, app_name = $3, assigned_schema_name = $4, identifier_url = $5, entry_point_url = $6, authorized_urls = $7, user_id = $8, client_mode = $9 WHERE client_id = $1 RETURNING *;",
      schema
   );

// does not return the entity
export const deleteByID = (schema) =>
   format("DELETE FROM %I.client_servers WHERE client_id = $1;", schema);

export const deleteAll = (schema) =>
   format("DELETE FROM %I.client_servers;", schema);

// User-specific client server queries
export const getByUserId = (schema) =>
   format(
      "SELECT * FROM %I.client_servers WHERE user_id = $1 ORDER BY created_at DESC;",
      schema
   );

export const getByUserIdAndClientId = (schema) =>
   format(
      "SELECT * FROM %I.client_servers WHERE user_id = $1 AND client_id = $2;",
      schema
   );

export const deleteByUserIdAndClientId = (schema) =>
   format(
      "DELETE FROM %I.client_servers WHERE user_id = $1 AND client_id = $2 RETURNING *;",
      schema
   );

export const getAllowedUrls = (schema) =>
   format(
      "SELECT identifier_url, entry_point_url, authorized_urls FROM %I.client_servers WHERE user_id = $1;",
      schema
   );

export const CLIENT_SERVER = {
   // global
   create,
   get,
   getAll,
   getBySecretHash,
   getByReferer,
   update,
   deleteByID,
   deleteAll,
   // user-specific
   getByUserId,
   getByUserIdAndClientId,
   deleteByUserIdAndClientId,
   // helper
   getAllowedUrls,
};
