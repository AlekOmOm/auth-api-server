// models/index.js

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
