import BaseModel from "./base/BaseModel.js";
import { ValidationError } from "../utils/customErrors.js";

class Schema extends BaseModel {
   constructor(schemaName = null, name = null, clientId = null) {
      super();
      this.schema = schemaName;
      this.name = name;
      this.clientId = clientId;
   }

   /**
    * Validate Schema instance
    */
   validate() {
      this.clearErrors();

      if (this.schema) {
         // Validate schema name format for tenant schemas
         if (this.schema.startsWith("client_")) {
            if (!/^client_[a-z0-9_]+$/.test(this.schema)) {
               this.addError(
                  "Schema name must start with 'client_' and contain only lowercase letters, numbers, and underscores",
                  "schema"
               );
            }
         }

         // Check length limits
         if (this.schema.length > 63) {
            this.addError("Schema name cannot exceed 63 characters", "schema");
         }

         // Prevent reserved names
         const reservedNames = [
            "public",
            "information_schema",
            "pg_catalog",
            "pg_toast",
            "auth_internal",
            "postgres",
            "template0",
            "template1",
         ];

         if (reservedNames.includes(this.schema)) {
            this.addError(`Schema name '${this.schema}' is reserved`, "schema");
         }
      }

      return this;
   }

   /**
    * Create Schema instance from service layer arguments
    * Handles different operation types that might need different data
    * @param {Object|string} requestBody - Schema data or schema name
    * @param {string} clientId - Optional client ID for assignment operations
    * @returns {Schema} Schema instance
    */
   static fromRequestBody(requestBody, clientId = null) {
      // Handle string input (just schema name)
      if (typeof requestBody === "string") {
         return new Schema(requestBody, null, clientId);
      }

      // Handle object input
      if (typeof requestBody === "object" && requestBody !== null) {
         const schema = new Schema(
            requestBody.schema || requestBody.schemaName,
            requestBody.name,
            requestBody.clientId || clientId
         );

         // Validate the instance
         schema.validate();

         if (!schema.isValid()) {
            throw new ValidationError(
               "Invalid schema data",
               schema.getErrors()
            );
         }

         return schema;
      }

      // Handle empty/null input for operations that don't need specific data
      return new Schema();
   }

   /**
    * Convert to database-ready object
    * @returns {Object} Object with parameters for database queries
    */
   toDatabaseObject() {
      const params = [];

      if (this.schema) {
         params.push(this.schema);
      }

      if (this.clientId) {
         params.push(this.clientId);
      }

      return params;
   }

   /**
    * Convert to database parameter array for SQL queries
    * @returns {Array} Array of parameters for SQL query
    */
   toDatabaseArray() {
      return this.toDatabaseObject();
   }

   /**
    * Create Schema instance from database row
    * @param {Object} dbRow - Database row
    * @returns {Schema} Schema instance
    */
   static fromDb(dbRow) {
      if (!dbRow) return null;

      const schema = new Schema(
         dbRow.schema_name || dbRow.assigned_schema_name,
         dbRow.name,
         dbRow.client_id
      );

      schema.clearErrors();
      return schema;
   }

   /**
    * Convert to API response format
    * @returns {Object} Schema data for API response
    */
   toApiResponse() {
      return {
         schemaName: this.schema,
         name: this.name,
         clientId: this.clientId,
      };
   }

   /**
    * Check if schema name represents a system schema
    * @returns {boolean} True if it's a system schema
    */
   isSystemSchema() {
      const systemSchemas = [
         "information_schema",
         "pg_catalog",
         "pg_toast",
         "public",
         "auth_internal",
      ];
      return systemSchemas.includes(this.schema);
   }

   /**
    * Check if schema name represents a tenant schema
    * @returns {boolean} True if it's a tenant schema
    */
   isTenantSchema() {
      return this.schema && this.schema.startsWith("client_");
   }
}

export default Schema;
