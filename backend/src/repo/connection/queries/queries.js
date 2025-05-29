// ----- DML QUERIES FOR POSTGRES (multi-tenant) -----

// Client Servers
export const createClientServer = `
  INSERT INTO client_servers (client_id, client_secret_hash, app_name, assigned_schema_name, identifier_url, entry_point_url, authorized_urls, user_id, client_mode)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING *;
`;

export const getClientServer = `
  SELECT * FROM client_servers WHERE client_id = $1;
`;

export const getClientServers = `
  SELECT * FROM client_servers ORDER BY created_at DESC;
`;

export const getClientServerByClientSecretHash = `
  SELECT * FROM client_servers WHERE client_secret_hash = $1;
`;

export const getClientServerByReferer = `
  SELECT * FROM client_servers WHERE identifier_url = $1 OR entry_point_url = $1 OR authorized_urls @> $1;
`;

export const updateClientServer = `
  UPDATE client_servers SET client_secret_hash = $2, app_name = $3, assigned_schema_name = $4, identifier_url = $5, entry_point_url = $6, authorized_urls = $7, user_id = $8, client_mode = $9
  WHERE client_id = $1 RETURNING *;
`;

export const deleteClientServer = `
  DELETE FROM client_servers WHERE client_id = $1;
`;

export const deleteClientServers = `
  DELETE FROM client_servers;
`;

// User-specific client server queries
export const getClientServersByUserId = `
  SELECT * FROM client_servers WHERE user_id = $1 ORDER BY created_at DESC;
`;

export const getClientServerByUserIdAndClientId = `
  SELECT * FROM client_servers WHERE user_id = $1 AND client_id = $2;
`;

export const deleteClientServerByUserIdAndClientId = `
  DELETE FROM client_servers WHERE user_id = $1 AND client_id = $2 RETURNING *;
`;

import * as userQueries from "./usersQueries.js";
import * as sessionQueries from "./sessionQueries.js";
//import * as ownerPanelQueries from "./ownerPanelQueries.js";

export const USER = {
   create: userQueries.createUser,
   getAll: userQueries.getUsers,
   get: userQueries.getUserById,
   getByEmail: userQueries.getUserByEmail,
   update: userQueries.updateUser,
   delete: userQueries.deleteUser,
};

export const SESSION = {
   create: sessionQueries.createSession,
   getAll: sessionQueries.getSessions,
   get: sessionQueries.getSession,
   getByUserId: sessionQueries.getSessionByUserId,
   delete: sessionQueries.deleteSession,
   deleteByUserId: sessionQueries.deleteSessionByUserId,
   deleteBySessionId: sessionQueries.deleteSessionBySessionId,
   deleteExpired: sessionQueries.deleteExpiredSessions,
};

export const CLIENT_SERVER = {
   create: createClientServer,
   getAll: getClientServers,
   get: getClientServer,
   getByClientSecretHash: getClientServerByClientSecretHash,
   getByReferer: getClientServerByReferer,
   update: updateClientServer,
   delete: deleteClientServer,
   deleteAll: deleteClientServers,
   getByUserId: getClientServersByUserId,
   getByUserIdAndClientId: getClientServerByUserIdAndClientId,
   deleteByUserIdAndClientId: deleteClientServerByUserIdAndClientId,
};
