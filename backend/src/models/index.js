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
import { ClientServer, ClientServerOperations } from "./ClientServer.js";
import { Session, SessionOperations } from "./Session.js";
import { User, UserOperations } from "./User.js";
import Schema from "./Schema.js";

// operations
export {
   ClientServerOperations,
   SessionOperations,
   UserOperations,
} from "./index.js";

// base and validation
import BaseModel from "./base/BaseModel.js";
import ValidationMixin from "./base/ValidationMixin.js";

// --- exports ---
export { ClientServer, Session, User, Schema, BaseModel, ValidationMixin };
export const operations = {
   ClientServerOperations,
   SessionOperations,
   UserOperations,
};

export default {
   ClientServer,
   Session,
   User,
   Schema,
   BaseModel,
   ValidationMixin,
   operations,
};

export const Models = {
   ClientServer,
   Session,
   User,
   Schema,
};
