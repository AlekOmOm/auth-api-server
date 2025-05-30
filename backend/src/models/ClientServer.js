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

import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { ValidationError, NotFoundError } from "../middleware/errorHandler.js";
import BaseModel from "./base/BaseModel.js";
import { pipe, curry } from "../utils/functional.js";
class ClientServer extends BaseModel {
   constructor(
      appName,
      identifierUrl,
      entryPointUrl,
      authorizedUrls,
      userId = null,
      clientMode = "frontend-login-proxy"
   ) {
      super(); // Initialize BaseModel

      this.app_name = appName;
      this.identifier_url = identifierUrl;
      this.entry_point_url = entryPointUrl;
      this.authorized_urls = authorizedUrls;
      this.user_id = userId;
      this.client_mode = clientMode;

      // Generate unique identifiers
      this.client_id = `client_${uuidv4().replace(/-/g, "")}`;
      this.assigned_schema_name = ClientServer.sanitizeSchemaName(
         `client_${appName}_${Date.now()}`
      );

      // Will store the plain secret (for returning to user) and hashed version
      this.client_secret = null;
      this.client_secret_hash = null;

      // Run validation
      this.validate();
   }

   /**
    * Validate ClientServer instance
    * Uses ValidationMixin methods available through BaseModel
    */
   validate() {
      this.clearErrors();

      // Required fields
      this.validateRequired([
         "app_name",
         "identifier_url",
         "entry_point_url",
         "authorized_urls",
      ]);

      // URL validations
      if (
         this.identifier_url &&
         !ClientServer.isValidUrl(this.identifier_url)
      ) {
         this.addError("Invalid identifier URL format", "identifier_url");
      }

      if (
         this.entry_point_url &&
         !ClientServer.isValidUrl(this.entry_point_url)
      ) {
         this.addError("Invalid entry point URL format", "entry_point_url");
      }

      // Authorized URLs validation
      if (this.authorized_urls) {
         if (!ClientServer.isNonEmptyArray(this.authorized_urls)) {
            this.addError(
               "Authorized URLs must be a non-empty array",
               "authorized_urls"
            );
         } else {
            const urlValidation = ClientServer.validateUrlArray(
               this.authorized_urls,
               true
            ); // Allow insecure in dev
            if (!urlValidation.valid) {
               this.addError(urlValidation.error, "authorized_urls");
            }
         }
      }

      // Client mode validation
      if (
         this.client_mode &&
         !ClientServer.isValidClientMode(this.client_mode)
      ) {
         this.addError(
            "Invalid client mode. Must be: frontend-login-proxy or api-auth-server",
            "client_mode"
         );
      }

      // App name validation
      if (
         this.app_name &&
         !ClientServer.validateStringLength(this.app_name, 1, 255)
      ) {
         this.addError(
            "App name must be between 1 and 255 characters",
            "app_name"
         );
      }

      return this;
   }

   /**
    * Static factory method to create ClientServer from req.body
    * Handles validation and data extraction automatically
    * @param {Object} requestBody - Express req.body object
    * @param {string} userId - Optional user ID
    * @returns {Promise<ClientServer>} Fully initialized ClientServer instance
    */
   static async fromRequestBody(requestBody, userId = null) {
      // Handle cases where requestBody might be a simple string (e.g., a URL for lookup)
      if (typeof requestBody === "string") {
         const minimalInstance = new ClientServer(
            `lookup-${Date.now()}`,
            requestBody,
            requestBody,
            [requestBody]
         );
         try {
            await minimalInstance.generateClientSecret();
         } catch (e) {
            /* ignore */
         }
         minimalInstance.clearErrors();
         return minimalInstance;
      }

      const {
         app_name: appName,
         identifier_url: identifierUrl,
         entry_point_url: entryPointUrl,
         authorized_urls: authorizedUrls,
         client_mode: clientMode = "frontend-login-proxy",
      } = requestBody;

      // Create and initialize the ClientServer
      const clientServer = new ClientServer(
         appName,
         identifierUrl,
         entryPointUrl,
         authorizedUrls,
         userId,
         clientMode
      );

      // Check if valid
      if (!clientServer.isValid()) {
         throw new ValidationError(
            "Invalid client server data",
            clientServer.getErrors()
         );
      }

      await clientServer.generateClientSecret();
      return clientServer;
   }

   /**
    * Static method to validate and process update data from req.body
    * @param {Object} requestBody - Express req.body object
    * @param {Object} existingClient - Existing client server data
    * @returns {Object} Validated update data ready for database
    */
   static update(requestBody, existingClient) {
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

      // Create a temporary instance for validation
      const tempClient = new ClientServer(
         updateData.app_name || existingClient.app_name,
         updateData.identifier_url || existingClient.identifier_url,
         updateData.entry_point_url || existingClient.entry_point_url,
         updateData.authorized_urls || existingClient.authorized_urls,
         existingClient.user_id,
         updateData.client_mode || existingClient.client_mode
      );

      if (!tempClient.isValid()) {
         throw new ValidationError(
            "Invalid update data",
            tempClient.getErrors()
         );
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

      if (!clientServer.isValid()) {
         throw new ValidationError(
            "Invalid client server data",
            clientServer.getErrors()
         );
      }

      await clientServer.generateClientSecret();
      return clientServer;
   }

   /**
    * Static factory method to create a ClientServer instance
    * @param {Object} requestBody -
    * @param {string} [userId=null] - Optional user ID.
    * @returns {ClientServer} A new ClientServer instance.
    */
   static forLogin(requestBody, userId = null) {
      const {
         app_name: appName,
         identifier_url: identifierUrl,
         entry_point_url: entryPointUrl,
         authorized_urls: authorizedUrls,
         client_mode: clientMode,
      } = requestBody || {};

      return new ClientServer(
         appName,
         identifierUrl,
         entryPointUrl,
         authorizedUrls,
         userId,
         clientMode
      );
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

      // Clear any validation errors since we're loading from DB
      clientServer.clearErrors();

      return clientServer;
   }

   /**
    * Convert to safe API response
    * @returns {Object} ClientServer without sensitive data
    */
   toApiResponse() {
      const response = super.toApiResponse();
      // Never include the secret hash in API responses
      delete response.client_secret_hash;
      // Include plain secret only when it's just been generated
      if (!this.client_secret) {
         delete response.client_secret;
      }
      return response;
   }

   /**
    * Checks if the client server record is considered expired.
    * Placeholder implementation, as expiry logic is not currently defined for ClientServer.
    * @returns {boolean} True if expired, false otherwise.
    */
   isExpired() {
      // Implementation depends on your expiry logic
      // This is a placeholder that always returns false
      return false;
   }

   /**
    * Checks if the client server has an associated user ID.
    * @returns {boolean} True if a user_id is present, false otherwise.
    */
   hasUser() {
      return this.user_id != null;
   }

   /**
    * Checks if the client server has an assigned schema name.
    * @returns {boolean} True if an assigned_schema_name is present, false otherwise.
    */
   hasSchema() {
      return this.assigned_schema_name != null;
   }
}

export default ClientServer;

// --- FUNCTIONAL OPERATIONS FOR CLIENT SERVER ---

/**
 * Functional operations that work with ClientServer instances
 */
export const ClientServerOperations = {
   // for service pipelines
   fromRequestBody: (requestBody) => ClientServer.fromRequestBody(requestBody),

   // for repo pipelines
   toDB: (clientServer) => clientServer.toDatabaseObject(),
   fromDB: (dbRow) => ClientServer.fromDb(dbRow),

   // Curried enrichment functions
   enrichWithUser: curry((user, clientServer) => clientServer.withUser(user)),
   enrichWithSchema: curry((schema, clientServer) =>
      clientServer.withSchema(schema)
   ),
   extendExpiry: curry((hours, clientServer) =>
      clientServer.withExtendedExpiry(hours)
   ),

   // Transformation pipelines
   prepareForDatabase: (clientServer) => clientServer.toDatabaseObject(),
   prepareForApi: (clientServer) => clientServer.toApiResponse(),

   // Predicates
   isValid: (clientServer) => clientServer.isValid(),
   isExpired: (clientServer) => clientServer.isExpired(),
   hasRequiredData: (clientServer) =>
      clientServer.hasUser() && clientServer.hasSchema(),

   // Composite operations
   createAndEnrich: pipe(ClientServer.forLogin, (clientServer) =>
      clientServer.isValid() ? clientServer : null
   ),

   // Filter operations
   // - based on: referer, hash, assigned_schema_name
   filterReferer: (clientServers, referer) =>
      clientServers.filter(
         (clientServer) =>
            clientServer.identifier_url === referer ||
            clientServer.entry_point_url === referer ||
            clientServer.authorized_urls.includes(referer)
      ),
   filterHash: (clientServers, hash) =>
      clientServers.filter(
         (clientServer) => clientServer.client_secret_hash === hash
      ),
   filterSchema: (clientServers, schema) =>
      clientServers.filter(
         (clientServer) => clientServer.assigned_schema_name === schema
      ),
   filterValid: (clientServers) =>
      clientServers.filter((clientServer) =>
         ClientServerOperations.isValid(clientServer)
      ),

   // Sorting operations
   // - created_at
   // - updated_at
   sortByCreatedAt: (clientServers) =>
      [...clientServers].sort(
         (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ),

   sortByUpdatedAt: (clientServers) =>
      [...clientServers].sort(
         (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      ),
};
