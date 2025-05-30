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
 *
 */

// Client Servers
export const create = `
  INSERT INTO client_servers (client_id, client_secret_hash, app_name, assigned_schema_name, identifier_url, entry_point_url, authorized_urls, user_id, client_mode)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING *;
`;

export const get = `
  SELECT * FROM client_servers WHERE client_id = $1;
`;

export const getAll = `
  SELECT * FROM client_servers ORDER BY created_at DESC;
`;

export const getBySecretHash = `
  SELECT * FROM client_servers WHERE client_secret_hash = $1;
`;

export const getByReferer = `
  SELECT * FROM client_servers WHERE identifier_url = $1 OR entry_point_url = $1 OR authorized_urls @> $1;
`;

export const update = `
  UPDATE client_servers SET client_secret_hash = $2, app_name = $3, assigned_schema_name = $4, identifier_url = $5, entry_point_url = $6, authorized_urls = $7, user_id = $8, client_mode = $9
  WHERE client_id = $1 RETURNING *;
`;

// does not return the entity
export const deleteByID = `
  DELETE FROM client_servers WHERE client_id = $1;
`;

export const deleteAll = `
  DELETE FROM client_servers;
`;

// User-specific client server queries
export const getByUserId = `
  SELECT * FROM client_servers WHERE user_id = $1 ORDER BY created_at DESC;
`;

export const getByUserIdAndClientId = `
  SELECT * FROM client_servers WHERE user_id = $1 AND client_id = $2;
`;

export const deleteByUserIdAndClientId = `
  DELETE FROM client_servers WHERE user_id = $1 AND client_id = $2 RETURNING *;
`;

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
};
