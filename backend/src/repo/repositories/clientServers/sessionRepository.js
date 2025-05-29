/**
 * Session Repository
 * - CRUD operations for sessions of a Client Server
 *
 * schema: client_servers  (./schemas/client_servers.sql)
 * queries: ./connection/queries/clientServers/sessionQueries.js
 * 
 * flow
 * - CRUD(req, session)
 *   - getPoolForSchema(schemaName)
 *   - query(pool, query, params)
 *   - return result
 */

import * as queries from "../../connection/queries/clientServers/sessionQueries.js";
import getPoolForSchema from "../../connection/pools/clientServers.js";

// --- CRUD Sessions ---

// create session
const createSession = async (req, session) => {
   const pool = await getPoolForSchema(req.params.schemaName);


