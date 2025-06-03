/**
 * Functional Model Operations
 *
 * Central export for all functional operations on models.
 * These operations provide pure functional transformations
 * and utilities for working with model instances.
 */

export { UserOperations } from "../User.js";
export { SessionOperations } from "../Session.js";
export { ClientServerOperations } from "../ClientServer.js";

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
const MODELS = (tableName, operation) => {
   const modelsMap = {
      client_server: {
         toDB: ClientServerOperations.toDB,
         fromDB: ClientServerOperations.fromDB,
      },
      session: {
         toDB: SessionOperations.toDB,
         fromDB: SessionOperations.fromDB,
      },
      user: {
         toDB: UserOperations.toDB,
         fromDB: UserOperations.fromDB,
      },
   };
   // return the operation for the model
   return MODELS[tableName][operation];
};

// toDB
export const toDB = (tableName, instance) => {
   return MODELS(tableName, "toDB")(instance);
};

// fromDB
export const fromDB = (tableName, entity) => {
   return MODELS(tableName, "fromDB")(entity);
};
