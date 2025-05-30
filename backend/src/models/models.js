/**
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

import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { ValidationError, NotFoundError } from "../middleware/errorHandler.js";

class ClientServer {
   constructor(
      appName,
      identifierUrl,
      entryPointUrl,
      authorizedUrls,
      userId = null,
      clientMode = "frontend-login-proxy"
   ) {
      this.app_name = appName;
      this.identifier_url = identifierUrl;
      this.entry_point_url = entryPointUrl;
      this.authorized_urls = authorizedUrls;
      this.user_id = userId;
      this.client_mode = clientMode;

      // Generate unique identifiers
      this.client_id = `client_${uuidv4().replace(/-/g, "")}`;
      this.assigned_schema_name = `client_${appName
         .toLowerCase()
         .replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;

      // Will store the plain secret (for returning to user) and hashed version
      this.client_secret = null;
      this.client_secret_hash = null;
   }

   /**
    * Static factory method to create ClientServer from req.body
    * Handles validation and data extraction automatically
    * @param {Object} requestBody - Express req.body object
    * @param {string} userId - Optional user ID
    * @returns {Promise<ClientServer>} Fully initialized ClientServer instance
    */
   static async fromRequestBody(requestBody, userId = null) {
      const {
         app_name: appName,
         identifier_url: identifierUrl,
         entry_point_url: entryPointUrl,
         authorized_urls: authorizedUrls,
         client_mode: clientMode = "frontend-login-proxy",
      } = requestBody;

      // Validate required fields
      if (
         !appName ||
         !identifierUrl ||
         !entryPointUrl ||
         !authorizedUrls ||
         !Array.isArray(authorizedUrls)
      ) {
         throw new ValidationError(
            "app_name, identifier_url, entry_point_url, and authorized_urls (array) are required"
         );
      }

      // Validate URLs
      try {
         new URL(identifierUrl);
         new URL(entryPointUrl);
         authorizedUrls.forEach((url) => new URL(url));
      } catch (error) {
         throw new ValidationError("Invalid URL format provided");
      }

      // Create and initialize the ClientServer
      const clientServer = new ClientServer(
         appName,
         identifierUrl,
         entryPointUrl,
         authorizedUrls,
         userId,
         clientMode
      );

      await clientServer.generateClientSecret();
      return clientServer;
   }

   /**
    * Static method to validate and process update data from req.body
    * @param {Object} requestBody - Express req.body object
    * @param {Object} existingClient - Existing client server data
    * @returns {Object} Validated update data ready for database
    */
   static validateUpdateData(requestBody, existingClient) {
      if (!existingClient) {
         throw new ValidationError("Client server not found");
      }

      const allowedUpdates = [
         "app_name",
         "identifier_url",
         "entry_point_url",
         "authorized_urls",
         "client_mode",
      ];
      const updateData = {};

      allowedUpdates.forEach((field) => {
         if (requestBody[field] !== undefined) {
            updateData[field] = requestBody[field];
         }
      });

      // Validate URLs if provided
      if (updateData.identifier_url) {
         try {
            new URL(updateData.identifier_url);
         } catch (error) {
            throw new ValidationError("Invalid identifier_url format");
         }
      }

      if (updateData.entry_point_url) {
         try {
            new URL(updateData.entry_point_url);
         } catch (error) {
            throw new ValidationError("Invalid entry_point_url format");
         }
      }

      if (updateData.authorized_urls) {
         if (!Array.isArray(updateData.authorized_urls)) {
            throw new ValidationError("authorized_urls must be an array");
         }
         try {
            updateData.authorized_urls.forEach((url) => new URL(url));
         } catch (error) {
            throw new ValidationError("Invalid URL format in authorized_urls");
         }
      }

      // Merge with existing data (keep existing values for fields not being updated)
      return {
         client_id: existingClient.client_id,
         client_secret_hash: existingClient.client_secret_hash, // Keep existing hash
         app_name: updateData.app_name || existingClient.app_name,
         assigned_schema_name: existingClient.assigned_schema_name, // Cannot change schema
         identifier_url:
            updateData.identifier_url || existingClient.identifier_url,
         entry_point_url:
            updateData.entry_point_url || existingClient.entry_point_url,
         authorized_urls:
            updateData.authorized_urls || existingClient.authorized_urls,
         client_mode: updateData.client_mode || existingClient.client_mode,
      };
   }

   /**
    * Generate client secret and hash it
    * @returns {string} The plain client secret (for returning to user)
    */
   async generateClientSecret() {
      this.client_secret = uuidv4();
      this.client_secret_hash = await bcrypt.hash(this.client_secret, 12);
      return this.client_secret;
   }

   /**
    * Static factory method to create a fully initialized ClientServer
    * @param {string} appName - Application name
    * @param {string} identifierUrl - Identifier URL
    * @param {string} entryPointUrl - Entry point URL
    * @param {Array} authorizedUrls - Array of authorized URLs
    * @param {string} userId - User ID who owns this client
    * @param {string} clientMode - Client mode (default: "api-auth-server")
    * @returns {Promise<ClientServer>} Fully initialized ClientServer instance
    */
   static async create(
      appName,
      identifierUrl,
      entryPointUrl,
      authorizedUrls,
      userId = null,
      clientMode = "api-auth-server"
   ) {
      const clientServer = new ClientServer(
         appName,
         identifierUrl,
         entryPointUrl,
         authorizedUrls,
         userId,
         clientMode
      );
      await clientServer.generateClientSecret();
      return clientServer;
   }

   /**
    * Convert to database-ready object (without plain secret)
    * @returns {Object} Object ready for database insertion
    */
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
      };
   }

   /**
    * Convert to database parameter array for SQL queries
    * Order matches: client_id, client_secret_hash, app_name, assigned_schema_name, identifier_url, entry_point_url, authorized_urls, user_id, client_mode
    * @returns {Array} Array of parameters for SQL query
    */
   toDatabaseArray() {
      return [
         this.client_id,
         this.client_secret_hash,
         this.app_name,
         this.assigned_schema_name,
         this.identifier_url,
         this.entry_point_url,
         this.authorized_urls,
         this.user_id,
         this.client_mode,
      ];
   }

   static fromDbRows(dbRows) {
      return dbRows.map((dbRow) => ClientServer.fromDb(dbRow));
   }

   /**
    * Static factory method to create ClientServer from a database row
    * @param {Object} dbRow - The row object from the database
    * @returns {ClientServer} A ClientServer instance
    */
   static fromDb(dbRow) {
      if (!dbRow) {
         throw new NotFoundError("Client server not found or access denied");
      }

      const clientServer = new ClientServer(
         dbRow.app_name,
         dbRow.identifier_url,
         dbRow.entry_point_url,
         dbRow.authorized_urls,
         dbRow.user_id,
         dbRow.client_mode
      );

      clientServer.client_id = dbRow.client_id;
      clientServer.assigned_schema_name = dbRow.assigned_schema_name;
      clientServer.client_secret_hash = dbRow.client_secret_hash;

      return clientServer;
   }
}

class Session {
   constructor(
      id = null, // db generated
      userId,
      sessionId = null, // db generated
      ipAddress = null,
      userAgent = null,
      createdAt = null, // db generated
      expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 1)
   ) {
      this.id = id;
      this.userId = userId;
      this.sessionId = sessionId;
      this.ipAddress = ipAddress;
      this.userAgent = userAgent;
      this.createdAt = createdAt;
      this.expiresAt = expiresAt;
   }
}

export { ClientServer, Session };
