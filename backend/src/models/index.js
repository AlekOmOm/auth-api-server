// models/index.js

/**
 * Model Operations Required by Service Pipeline Pattern:
 *
 * MUST HAVE (used by all services):
 * - fromRequestBody(...args) - Create model from service layer arguments
 * - toDB() - Convert to database format (maps to toDatabaseObject)
 * - fromDB() - Create from database row (maps to fromDb)
 *
 * FUTURE NEEDS:
 * - toApiResponse() - Format for API responses
 * - validate() / isValid() - Data validation
 *
 * Special Cases:
 * - User model: Password hashing in constructor and comparison methods
 */

// --- models ---
import ClientServer from "./ClientServer.js";
import Session from "./Session.js";
import User from "./User.js";

// operations
export { ClientServerOperations } from "./ClientServer.js";
export { SessionOperations } from "./Session.js";
export { UserOperations } from "./User.js";

// base and validation
import BaseModel from "./base/BaseModel.js";
import ValidationMixin from "./base/ValidationMixin.js";

// --- exports ---
export { ClientServer, Session, User, BaseModel, ValidationMixin };
export const operations = {
   ClientServerOperations,
   SessionOperations,
   UserOperations,
};

export default {
   ClientServer,
   Session,
   User,
   BaseModel,
   ValidationMixin,
   operations,
};

export const Models = {
   ClientServer,
   Session,
   User,
};
