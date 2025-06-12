/**
 * ClientServer Model
 * 
 * schema files: 
 * - db/schemas/auth_internal/client_servers.sql
 * - db/schemas/client_servers/client_server_template.sql
 * 
-- In schema: auth_internal
CREATE TABLE client_servers (
    client_id VARCHAR(255) PRIMARY KEY,
    client_secret_hash VARCHAR(255) NOT NULL,
    app_name VARCHAR(255) NOT NULL,
    assigned_schema_name VARCHAR(255) UNIQUE NOT NULL,
    identifier_url VARCHAR(255) NOT NULL,
    entry_point_url VARCHAR(255) NOT NULL,
    authorized_urls TEXT[] NOT NULL,
    user_id UUID NOT NULL,
    client_mode VARCHAR(50) DEFAULT 'frontend-login-proxy',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- in tenant schema
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    role            VARCHAR(100) NOT NULL DEFAULT 'user',
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Sessions table (cookie / token mapping)
CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id      UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id); 
 */

// import { v4 as uuidv4 } from "uuid";
// import bcrypt from "bcrypt"; // Temporarily commented for testing Vitest module loading
import { ValidationError, NotFoundError } from "../utils/customErrors.js";
import BaseModel from "./base/BaseModel.js";
import { generateUuidV4 } from "../utils/uuid.js";
import crypto from "crypto";
// import { pipe, curry } from "../utils/functional.js";

export class ClientServer extends BaseModel {
   constructor(appName, identifierUrl, entryPointUrl, authorizedUrls, userId) {
      super();
      this.app_name = appName;
      this.identifier_url = identifierUrl;
      this.entry_point_url = entryPointUrl;
      this.authorized_urls = authorizedUrls;
      this.user_id = userId;
      this.client_id = `cs_${generateUuidV4()}`; // Generate unique client ID
      this.assigned_schema_name = `client_${crypto
         .randomBytes(8)
         .toString("hex")}`; // Generate unique schema name

      // Generate plain secret and its hash
      this._plainClientSecret = crypto.randomBytes(32).toString("hex"); // Plain secret
      this.client_secret_hash = crypto
         .createHash("sha256")
         .update(this._plainClientSecret)
         .digest("hex"); // Hash of the plain secret

      console.log(
         "[ClientServer CONSTRUCTOR_DIAGNOSTIC] ClientServer instance created with unique IDs and secret."
      );
   }

   getPlainClientSecretOnce() {
      const secret = this._plainClientSecret;
      delete this._plainClientSecret; // Clear it after retrieval
      return secret;
   }

   validate() {
      this.clearErrors();
      return this;
   }

   static fromRequestBody(requestData, operationUserId = null) {
      console.log(
         "[ClientServer DIAGNOSTIC] fromRequestBody called with:",
         requestData
      );
      if (typeof requestData === "string") {
         // For string inputs (like URL lookup), create a minimal instance
         // Ensure it's still an instance of ClientServer
         const instance = new ClientServer(null, requestData, null, [], null);
         // Clear any validation errors that might arise from missing constructor args
         // if they are not relevant for a lookup operation.
         instance.clearErrors();
         return instance;
      }

      // Extract data from request body
      const data = requestData.body || requestData;

      // Create instance with provided data
      const instance = new ClientServer(
         data.app_name || data.appName,
         data.identifier_url || data.identifierUrl,
         data.entry_point_url || data.entryPointUrl,
         data.authorized_urls || data.authorizedUrls || [],
         operationUserId || data.user_id || data.userId
      );

      // Set additional properties if provided
      if (data.client_id) instance.client_id = data.client_id;
      if (data.assigned_schema_name)
         instance.assigned_schema_name = data.assigned_schema_name;
      if (data.client_secret_hash)
         instance.client_secret_hash = data.client_secret_hash;

      return instance;
   }

   static update(requestBody, existingClient) {
      return { ...existingClient, ...requestBody };
   }

   async generateClientSecret() {
      this.client_secret_hash = "new-temp-hash";
      return "secret";
   }

   static async create() {
      return new ClientServer("diag_create", "diag", "diag", [], "diag");
   }

   static forLogin() {
      return new ClientServer("diag_login", "diag", "diag", [], "diag");
   }

   toDatabaseObject() {
      return {
         client_id: this.client_id,
         client_secret_hash: this.client_secret_hash,
         app_name: this.app_name,
         assigned_schema_name: this.assigned_schema_name,
         identifier_url: this.identifier_url,
         entry_point_url: this.entry_point_url,
         authorized_urls: this.authorized_urls,
         user_id: this.user_id,
         client_mode: this.client_mode,
         // created_at and updated_at are usually handled by the database automatically
      };
   }

   static fromDb(dbRow) {
      if (!dbRow) return null;
      return new ClientServer(
         dbRow.app_name,
         dbRow.identifier_url,
         dbRow.entry_point_url,
         dbRow.authorized_urls,
         dbRow.user_id
      );
   }

   toApiResponse() {
      return {
         client_id: this.client_id,
         app_name: this.app_name,
         identifier_url: this.identifier_url,
         entry_point_url: this.entry_point_url,
         authorized_urls: this.authorized_urls,
         assigned_schema_name: this.assigned_schema_name,
      };
   }

   isExpired() {
      return false;
   }

   hasUser() {
      return true;
   }

   hasSchema() {
      return true;
   }
}
