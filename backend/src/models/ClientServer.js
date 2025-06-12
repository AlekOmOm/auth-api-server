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
// import { ValidationError, NotFoundError } from "../middleware/errorHandler.js";
import BaseModel from "./base/BaseModel.js";
// import { pipe, curry } from "../utils/functional.js";

export class ClientServer extends BaseModel {
   constructor(appName, identifierUrl, entryPointUrl, authorizedUrls, userId) {
      super();
      this.app_name = appName;
      this.identifier_url = identifierUrl;
      this.entry_point_url = entryPointUrl;
      this.authorized_urls = authorizedUrls;
      this.user_id = userId;
      this.client_id = "temp-client-id"; // Placeholder
      this.assigned_schema_name = "temp-schema-name"; // Placeholder
      this.client_secret_hash = "temp-hash"; // Placeholder
      console.log(
         "[ClientServer CONSTRUCTOR_DIAGNOSTIC] Simplified ClientServer instance created."
      );
   }

   // Comment out all other methods and static methods to simplify
   // validate() { this.clearErrors(); return this; }
   // static async fromRequestBody(requestData, operationUserId = null) {
   //   console.log("[ClientServer DIAGNOSTIC] fromRequestBody called with:", requestData);
   //   return new ClientServer("diag", "diag", "diag", [], "diag");
   // }
   // static update(requestBody, existingClient) { return { ...existingClient, ...requestBody }; }
   // async generateClientSecret() { this.client_secret_hash = "new-temp-hash"; return "secret"; }
   // static async create() { return new ClientServer("diag_create", "diag", "diag", [], "diag"); }
   // static forLogin() { return new ClientServer("diag_login", "diag", "diag", [], "diag"); }
   toDatabaseObject() {
      return { client_id: this.client_id };
   }
   // static fromDb(dbRow) { return new ClientServer(dbRow.app_name, dbRow.identifier_url, dbRow.entry_point_url, dbRow.authorized_urls, dbRow.user_id); }
   toApiResponse() {
      return { client_id: this.client_id };
   }
   // isExpired() { return false; }
   // hasUser() { return true; }
   // hasSchema() { return true; }
}
