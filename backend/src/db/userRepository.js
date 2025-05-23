// Main repository module that combines user and session repositories
import * as userRepo from "./repositories/userRepository.js";
import * as sessionRepo from "./repositories/sessionRepository.js";

import { getPoolForSchema } from "./connection/pools/clientServers.js";
import { v4 as uuidv4 } from "uuid";

let DEFAULT_SCHEMA = process.env.SEED_SCHEMA;

/*
 * lazy loading of pools
 * - if schema is not in pools, create a new pool and add it to key-value pair in pools
 * - if schema is in pools, return the pool
 */
const pools = {
   [DEFAULT_SCHEMA]: null,
};
const check = async (schema = DEFAULT_SCHEMA) => {
   if (!pools[schema]) {
      try {
         pools[schema] = await getPoolForSchema(schema);
      } catch (error) {
         console.error(
            `[clientRepository.js] Error calling getPoolForSchema for ${schema}:`,
            error
         );
         pools[schema] = undefined;
         throw error;
      }
   }
   return pools[schema];
};

// --- User helpers (array based to stay compatible with existing services) ---
const createUser = async (schema = DEFAULT_SCHEMA, paramsArray) => {
   const pool = await check(schema);
   if (!pool) {
      throw new Error("Failed to obtain a database pool in createUser.");
   }
   const [name, role, email, password_hash] = paramsArray;
   const id = uuidv4();
   return userRepo
      .createUser(pool, schema, {
         id,
         name,
         role,
         email,
         password_hash,
      })
      .then((user) => ({ lastID: user.id }));
};

const getUsers = async (schema = DEFAULT_SCHEMA) => {
   const pool = await check(schema);
   return userRepo.getUsers(pool, schema);
};

const getUser = async (schema = DEFAULT_SCHEMA, id) => {
   const pool = await check(schema);
   return userRepo.getUser(pool, schema, id);
};

const getUserByEmail = async (schema = DEFAULT_SCHEMA, email) => {
   const pool = await check(schema);
   return userRepo
      .getUsers(pool, schema)
      .then((users) => users.find((u) => u.email === email));
};

const getUserByNameAndEmail = async (schema = DEFAULT_SCHEMA, name, email) => {
   const pool = await check(schema);
   return userRepo
      .getUsers(pool, schema)
      .then((users) => users.find((u) => u.name === name && u.email === email));
};

const updateUser = async (schema = DEFAULT_SCHEMA, paramsArray) => {
   const [name, role, email, password_hash, id] = paramsArray;
   const pool = await check(schema);
   return userRepo.updateUser(pool, schema, {
      id,
      name,
      role,
      email,
      password_hash,
   });
};

const deleteUser = async (schema = DEFAULT_SCHEMA, id) => {
   const pool = await check(schema);
   return userRepo.deleteUser(pool, schema, id);
};

// --- Session helpers ---

const createSession = async (schema = DEFAULT_SCHEMA, paramsArray) => {
   const [user_id] = paramsArray;
   const pool = await check(schema);
   const id = uuidv4();
   const session_id = uuidv4();
   return sessionRepo.createSession(pool, {
      id,
      user_id,
      session_id,
   });
};

const getSessions = async (schema = DEFAULT_SCHEMA, userId) => {
   const pool = await check(schema);
   return sessionRepo
      .getSessions(pool)
      .then((sessions) =>
         userId ? sessions.filter((s) => s.user_id === userId) : sessions
      );
};

const getSession = async (schema = DEFAULT_SCHEMA, sessionId) => {
   const pool = await check(schema);
   return sessionRepo.getSession(pool, sessionId);
};

const getSessionByUserId = async (schema = DEFAULT_SCHEMA, userId) => {
   const pool = await check(schema);
   return sessionRepo
      .getSessions(pool)
      .then((sessions) => sessions.find((s) => s.user_id === userId));
};

const deleteSessionByUserId = async (schema = DEFAULT_SCHEMA, userId) => {
   const pool = await check(schema);
   return sessionRepo.deleteSessionByUserId(pool, userId);
};

const deleteSessionBySessionId = async (schema = DEFAULT_SCHEMA, sessionId) => {
   const pool = await check(schema);
   return sessionRepo.deleteSessionBySessionId(pool, sessionId);
};

export default {
   // Users
   createUser,
   getUsers,
   getUser,
   getUserByEmail,
   getUserByNameAndEmail,
   updateUser,
   deleteUser,

   // Sessions
   createSession,
   getSessions,
   getSession,
   getSessionByUserId,
   deleteSessionByUserId,
   deleteSessionBySessionId,
};
