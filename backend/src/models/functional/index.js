/**
 * Functional Model Operations
 *
 * Central export for all functional operations on models.
 * These operations provide pure functional transformations
 * and utilities for working with model instances.
 */
// import { ClientServerOperations } from "../ClientServer.js"; // REMOVE
// import { UserOperations } from "../User.js";                 // REMOVE
// import { SessionOperations } from "../Session.js";               // REMOVE

// Import Model CLASSES instead
import { ClientServer } from "../ClientServer.js";
import { User } from "../User.js";
import { Session } from "../Session.js";
import { pipe, curry } from "../../utils/functional.js"; // Fixed path - should be ../../utils not ../utils

// --- Define Operations locally ---

const UserOperations = {
   toDB: (user) => user.toDatabaseObject(),
   fromDB: (dbRow) => User.fromDb(dbRow),
   fromRequestBody: (...args) => User.fromRequestBody(...args),
   // Re-adding other User-specific functional operations
   removePassword: (user) => {
      if (!user) return null;
      // Ensure we are working with a plain object if user is a class instance
      const userObject = user.toApiResponse
         ? user.toApiResponse()
         : { ...user };
      const { password, passwordHash, ...filteredUser } = userObject;
      return filteredUser;
   },
   prepareForApi: (user) => user.toApiResponse(),
   prepareForJwt: (user) => user.toJwtPayload(),
   isAdmin: (user) => user.hasRole("admin"),
   isOwner: (user) => user.hasRole("owner"),
   isRegularUser: (user) => user.hasRole("user"),
   canAccessAdminPanel: (user) => user.isPrivileged(),
   promoteToAdmin: (user) => user.withRole("admin"),
   demoteToUser: (user) => user.withRole("user"),
   filterByRole: curry((role, users) =>
      users.filter((user) => user.hasRole(role))
   ),
   filterPrivileged: (users) => users.filter((user) => user.isPrivileged()),
   // Assuming user.isValid() exists on the User model for filterActive
   filterActive: (users) =>
      users.filter((user) => (user.isValid ? user.isValid() : true)),
   sortByName: (users) =>
      [...users].sort((a, b) => a.name.localeCompare(b.name)),
   sortByEmail: (users) =>
      [...users].sort((a, b) => a.email.localeCompare(b.email)),
   sortByRole: (users) =>
      [...users].sort((a, b) => {
         const roleOrder = { owner: 0, admin: 1, user: 2 };
         return roleOrder[a.role] - roleOrder[b.role];
      }),
   createAndValidate: pipe(User.fromCredentials, (user) =>
      user.isValid() ? user : null
   ),
   extractEmails: (users) => users.map((user) => user.email),
   extractIds: (users) => users.map((user) => user.id),
   groupByRole: (users) =>
      users.reduce((groups, user) => {
         const role = user.role;
         groups[role] = groups[role] || [];
         groups[role].push(user);
         return groups;
      }, {}),
};

const SessionOperations = {
   toDB: (session) => session.toDatabaseObject(),
   fromDB: (dbRow) => Session.fromDb(dbRow),
   fromRequestBody: (...args) => Session.fromRequestBody(...args),
   // Re-adding other Session-specific functional operations
   enrichWithUser: curry((user, session) => session.withUser(user)),
   enrichWithSchema: curry((schema, session) => session.withSchema(schema)),
   extendExpiry: curry((hours, session) => session.withExtendedExpiry(hours)),
   prepareForDatabase: (session) => session.toDatabaseObject(),
   prepareForApi: curry((authorizedUrls, session) =>
      session.toApiResponse(authorizedUrls)
   ),
   prepareForExpress: (session) => session.toExpressSession(),
   isValid: (session) => session.isValid() && !session.isExpired(),
   isExpired: (session) => session.isExpired(),
   hasRequiredData: (session) => session.hasUser() && session.hasSchema(),
   createAndEnrich: pipe(Session.forLogin, (session) =>
      session.isValid() ? session : null
   ),
   filterExpired: (sessions) =>
      sessions.filter((session) => !session.isExpired()),
   filterValid: (sessions) =>
      sessions.filter((session) => SessionOperations.isValid(session)), // Ensure SessionOperations is defined for self-reference
   sortByCreatedAt: (sessions) =>
      [...sessions].sort(
         (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ),
   sortByExpiresAt: (sessions) =>
      [...sessions].sort(
         (a, b) => new Date(a.expiresAt) - new Date(b.expiresAt)
      ),
};

const ClientServerOperations = {
   toDB: (clientServer) => clientServer.toDatabaseObject(),
   fromDB: (dbRow) => ClientServer.fromDb(dbRow),
   fromRequestBody: (...args) => ClientServer.fromRequestBody(...args),
   // Re-adding other ClientServer-specific functional operations
   enrichWithUser: curry((user, clientServer) => clientServer.withUser(user)),
   enrichWithSchema: curry((schema, clientServer) =>
      clientServer.withSchema(schema)
   ),
   // Assuming withExtendedExpiry exists or is similar for ClientServer if needed
   // extendExpiry: curry((hours, clientServer) => clientServer.withExtendedExpiry(hours)),
   prepareForDatabase: (clientServer) => clientServer.toDatabaseObject(),
   prepareForApi: (clientServer) => clientServer.toApiResponse(),
   isValid: (clientServer) => clientServer.isValid(),
   isExpired: (clientServer) => clientServer.isExpired(), // Assuming isExpired exists
   hasRequiredData: (clientServer) =>
      clientServer.hasUser &&
      clientServer.hasUser() &&
      clientServer.hasSchema &&
      clientServer.hasSchema(),
   createAndEnrich: pipe(ClientServer.forLogin, (clientServer) =>
      clientServer.isValid() ? clientServer : null
   ),
   filterReferer: (clientServers, referer) =>
      clientServers.filter(
         (cs) =>
            cs.identifier_url === referer ||
            cs.entry_point_url === referer ||
            (cs.authorized_urls && cs.authorized_urls.includes(referer))
      ),
   filterHash: (clientServers, hash) =>
      clientServers.filter((cs) => cs.client_secret_hash === hash),
   filterSchema: (clientServers, schema) =>
      clientServers.filter((cs) => cs.assigned_schema_name === schema),
   filterValid: (clientServers) => clientServers.filter((cs) => cs.isValid()),
   sortByCreatedAt: (clientServers) =>
      [...clientServers].sort(
         (a, b) => new Date(b.created_at) - new Date(a.created_at)
      ),
   // sortByUpdatedAt: (clientServers) => [...clientServers].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)),
};

export const operations = {
   ClientServerOperations,
   UserOperations,
   SessionOperations,
};

// --- for Service Layer ---
/**
 * prepare instance for service layer
 * @param {Object} instance - instance to prepare
 * @param {Array} requiredFields - required fields for service operation
 * @returns {Object} prepared instance
 */
export const prepareInstance = (instance, requiredFields) => {
   return requiredFields.reduce((acc, field) => {
      acc[field] = instance[field];
      return acc;
   }, {});
};

// --- for Database Operations ---
// toDB and fromDB
// identify the table and the operations to perform
const MODELS = (tableName, operationType) => {
   // Access operations dynamically when MODELS is called
   if (tableName === "client_servers") {
      if (operationType === "toDB") return ClientServerOperations.toDB;
      if (operationType === "fromDB") return ClientServerOperations.fromDB;
   } else if (tableName === "sessions") {
      if (operationType === "toDB") return SessionOperations.toDB;
      if (operationType === "fromDB") return SessionOperations.fromDB;
   } else if (tableName === "users") {
      if (operationType === "toDB") return UserOperations.toDB;
      if (operationType === "fromDB") return UserOperations.fromDB;
   }
   // console.warn(
   //    `No operation found for table '${tableName}' and operation type '${operationType}'`
   // );
   return undefined; // Or throw an error if this case should not happen
};

// toDB
export const toDB = (tableName, instance) => {
   try {
      const operation = MODELS(tableName, "toDB");
      if (!operation) {
         console.warn(
            `No toDB operation for table '${tableName}', returning raw instance`
         );
         return instance;
      }
      return operation(instance);
   } catch (error) {
      console.warn(
         `Error in toDB operation for table '${tableName}':`,
         error.message,
         "- returning raw instance"
      );
      return instance;
   }
};

// fromDB
export const fromDB = (tableName, entity) => {
   try {
      const operation = MODELS(tableName, "fromDB");
      if (!operation) {
         console.warn(
            `No fromDB operation for table '${tableName}', returning raw entity`
         );
         return entity;
      }
      return operation(entity);
   } catch (error) {
      console.warn(
         `Error in fromDB operation for table '${tableName}': - returning raw entity. Original error:`
      );
      console.error(error);
      return entity;
   }
};
