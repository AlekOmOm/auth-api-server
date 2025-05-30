// models/index.js

// --- models ---
import ClientServer from "./ClientServer.js";
import Session from "./Session.js";
import User from "./User.js";

// base and validation
import BaseModel from "./base/BaseModel.js";
import ValidationMixin from "./base/ValidationMixin.js";

// --- exports ---
export { ClientServer, Session, User, BaseModel, ValidationMixin };

export default {
   ClientServer,
   Session,
   User,
   BaseModel,
   ValidationMixin,
};

export const Models = {
   ClientServer,
   Session,
   User,
};
