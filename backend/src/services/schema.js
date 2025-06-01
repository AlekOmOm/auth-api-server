/**
 * Schema Service
 *
 * Centralized service for schema lifecycle management.
 * Uses DDL templates from repo/DDL/ for consistent schema operations.
 *
 * Operations:
 * - createSchema() - Create new tenant schema
 * - dropSchema() - Delete schema and all data
 * - validateSchemaName() - Validate schema naming
 * - schemaExists() - Check if schema exists
 * - listSchemas() - Get all schemas
 */

import { ValidationError, AuthError } from "../middleware/errorHandler.js";
import { getAuthPool } from "../repo/connection/pools/auth.js";
import { getPoolForSchema } from "../repo/connection/pools/clientServers.js";
import * as clientServerRepo from "../repo/repositories/authInternal/repository.js";
import { escapeDbIdentifier } from "../utils/dbUtils.js";

// Import DDL templates
import { ddl as authInternalDDL } from "../repo/DDL/auth_internal_complete.js";
import { ddl as tenantTemplateDDL } from "../repo/DDL/tenant_template.js";

/**
 * Create auth_internal schema (system schema)
 * Used during initial system setup
 */
export const createAuthInternalSchema = async () => {
   try {
      const pool = await getAuthPool();
      await pool.query("BEGIN"); // Start transaction

      // Execute DDL statements (includes tables + indexes)
      const statements = authInternalDDL("auth_internal");
      for (const statement of statements) {
         await pool.query(statement);
      }

      await pool.query("COMMIT"); // Commit transaction

      return {
         success: true,
         message: "auth_internal schema created successfully with all tables",
         schema: "auth_internal",
         tables: ["users", "sessions", "client_servers"],
      };
   } catch (error) {
      console.error(
         "🏗️ [SCHEMA SERVICE] Failed to create auth_internal schema:",
         error
      );
      // Rollback transaction if an error occurs
      // Check if pool was initialized before trying to rollback
      if (pool) {
         try {
            await pool.query("ROLLBACK");
            console.info(
               "🏗️ [SCHEMA SERVICE] Transaction rolled back for auth_internal schema creation."
            );
         } catch (rollbackError) {
            console.error(
               "🏗️ [SCHEMA SERVICE] Failed to rollback transaction:",
               rollbackError
            );
         }
      }
      throw error;
   }
};

/**
 * Create tenant schema for a client application
 * @param {Object} params - Schema creation parameters
 * @param {string} params.schemaName - Name of schema to create
 * @param {string} params.clientId - Client ID that will own this schema
 * @param {string} params.ownerId - Owner user ID performing the action
 * @returns {Object} Creation result
 */
export const createTenantSchema = async ({ schemaName, clientId, ownerId }) => {
   try {
      // Validate inputs
      if (!schemaName || !clientId || !ownerId) {
         throw new ValidationError(
            "Schema name, client ID, and owner ID are required"
         );
      }

      // Validate schema name format
      validateSchemaName(schemaName);

      // Verify owner has permission for this client
      const client = await clientServerRepo.getClientServerByUserIdAndClientId(
         ownerId,
         clientId
      );
      if (!client) {
         throw new AuthError(
            "You don't have permission to create schemas for this client"
         );
      }

      // Check if schema already exists
      const exists = await schemaExists(schemaName);
      if (exists) {
         throw new ValidationError(`Schema '${schemaName}' already exists`);
      }

      const pool = await getAuthPool();
      await pool.query("BEGIN"); // Start transaction

      // Execute tenant template DDL
      const statements = tenantTemplateDDL(schemaName);
      for (const statement of statements) {
         await pool.query(statement);
      }

      // Update client record with assigned schema
      const updatedClient = await clientServerRepo.updateClientServer({
         ...client,
         assigned_schema_name: schemaName,
      });

      await pool.query("COMMIT"); // Commit transaction

      return {
         success: true,
         message: "Tenant schema created successfully",
         data: {
            schemaName,
            clientId,
            client: updatedClient,
         },
      };
   } catch (error) {
      console.error(
         "🏗️ [SCHEMA SERVICE] Failed to create tenant schema:",
         error
      );
      if (pool) {
         try {
            await pool.query("ROLLBACK");
         } catch (rollbackError) {
            rollbackError;
         }
      }
      throw error;
   }
};

/**
 * Drop a tenant schema (DANGEROUS - destroys all data)
 * @param {Object} params - Schema deletion parameters
 * @param {string} params.schemaName - Name of schema to delete
 * @param {string} params.clientId - Client ID that owns this schema
 * @param {string} params.ownerId - Owner user ID performing the action
 * @param {boolean} params.confirm - Confirmation flag (must be true)
 * @returns {Object} Deletion result
 */
export const dropTenantSchema = async ({
   schemaName,
   clientId,
   ownerId,
   confirm = false,
}) => {
   try {
      // Validate inputs
      if (!schemaName || !clientId || !ownerId) {
         throw new ValidationError(
            "Schema name, client ID, and owner ID are required"
         );
      }

      if (!confirm) {
         throw new ValidationError(
            "Deletion must be confirmed with confirm=true"
         );
      }

      // Prevent deletion of system schemas
      if (isSystemSchema(schemaName)) {
         throw new ValidationError("Cannot delete system schemas");
      }

      // Verify owner has permission
      const client = await clientServerRepo.getClientServerByUserIdAndClientId(
         ownerId,
         clientId
      );
      if (!client || client.assigned_schema_name !== schemaName) {
         throw new AuthError("You don't have permission to delete this schema");
      }

      const pool = await getAuthPool();

      // Drop schema with CASCADE to remove all tables and data
      // Safely escape schemaName to prevent SQL injection
      const escapedSchemaName = escapeDbIdentifier(schemaName);
      await pool.query(`DROP SCHEMA IF EXISTS ${escapedSchemaName} CASCADE;`);

      // Update client record to remove assigned schema
      const updatedClient = await clientServerRepo.updateClientServer({
         ...client,
         assigned_schema_name: null,
      });

      return {
         success: true,
         message: "Schema deleted successfully",
         data: {
            schemaName,
            clientId,
            client: updatedClient,
         },
      };
   } catch (error) {
      console.error("🗑️ [SCHEMA SERVICE] Failed to delete schema:", error);
      throw error;
   }
};

/**
 * Check if a schema exists
 * @param {string} schemaName - Schema name to check
 * @returns {boolean} True if schema exists
 */
export const schemaExists = async (schemaName) => {
   try {
      const pool = await getAuthPool();

      const result = await pool.query(
         "SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1",
         [schemaName]
      );

      return result.rows.length > 0;
   } catch (error) {
      console.error(
         "🔍 [SCHEMA SERVICE] Failed to check schema existence:",
         error
      );
      throw error;
   }
};

/**
 * List all non-system schemas
 * @param {string} ownerId - Optional: filter by owner ID (shows only their schemas)
 * @returns {Array} List of schema objects
 */
export const listSchemas = async (ownerId = null) => {
   try {
      const pool = await getAuthPool();

      // Get schema names from information_schema
      const schemaResult = await pool.query(`
         SELECT schema_name 
         FROM information_schema.schemata 
         WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
         ORDER BY schema_name
      `);

      const schemas = [];

      for (const row of schemaResult.rows) {
         const schemaName = row.schema_name;

         // Skip system schemas
         if (isSystemSchema(schemaName)) {
            continue;
         }

         // Get client info for this schema
         let clientInfo = null;
         try {
            const clientResult = await pool.query(
               "SELECT client_id, app_name, user_id, created_at FROM client_servers WHERE assigned_schema_name = $1",
               [schemaName]
            );

            if (clientResult.rows.length > 0) {
               clientInfo = clientResult.rows[0];

               // Filter by owner if specified
               if (ownerId && clientInfo.user_id !== ownerId) {
                  continue;
               }
            }
         } catch (error) {
            console.warn(
               `Failed to get client info for schema ${schemaName}:`,
               error
            );
         }

         schemas.push({
            schemaName,
            clientId: clientInfo?.client_id || null,
            appName: clientInfo?.app_name || null,
            ownerId: clientInfo?.user_id || null,
            createdAt: clientInfo?.created_at || null,
            isOrphaned: !clientInfo, // Schema exists but no client record
         });
      }

      return schemas;
   } catch (error) {
      console.error("📋 [SCHEMA SERVICE] Failed to list schemas:", error);
      throw error;
   }
};

/**
 * Get schema statistics (table count, row counts, size, etc.)
 * @param {string} schemaName - Schema to analyze
 * @returns {Object} Schema statistics
 */
export const getSchemaStats = async (schemaName) => {
   try {
      const pool = await getAuthPool();

      // Get table information
      const tableResult = await pool.query(
         `
         SELECT 
            table_name,
            (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = $1 AND table_name = t.table_name) as column_count
         FROM information_schema.tables t
         WHERE table_schema = $1 AND table_type = 'BASE TABLE'
         ORDER BY table_name
      `,
         [schemaName]
      );

      const tables = [];
      let totalRows = 0;

      // Get row counts for each table
      for (const table of tableResult.rows) {
         try {
            // Use utility function for both schemaName and table.table_name
            const query = `SELECT COUNT(*) as count FROM ${escapeDbIdentifier(
               schemaName
            )}.${escapeDbIdentifier(table.table_name)}`;
            const rowResult = await pool.query(query);
            const rowCount = parseInt(rowResult.rows[0].count);
            totalRows += rowCount;

            tables.push({
               name: table.table_name,
               columnCount: parseInt(table.column_count),
               rowCount,
            });
         } catch (error) {
            console.warn(
               `Failed to get row count for ${escapeDbIdentifier(
                  schemaName
               )}.${escapeDbIdentifier(table.table_name)}:`,
               error
            );
            tables.push({
               name: table.table_name,
               columnCount: parseInt(table.column_count),
               rowCount: 0,
               error: "Failed to get row count",
            });
         }
      }

      return {
         schemaName,
         tableCount: tables.length,
         totalRows,
         tables,
      };
   } catch (error) {
      console.error("📊 [SCHEMA SERVICE] Failed to get schema stats:", error);
      throw error;
   }
};

/**
 * Validate schema name format
 * @param {string} schemaName - Schema name to validate
 * @throws {ValidationError} If schema name is invalid
 */
export const validateSchemaName = (schemaName) => {
   if (!schemaName || typeof schemaName !== "string") {
      throw new ValidationError("Schema name must be a non-empty string");
   }

   // Check format: must start with letter, contain only lowercase letters, numbers, underscores
   if (!/^[a-z][a-z0-9_]*$/.test(schemaName)) {
      throw new ValidationError(
         "Schema name must start with a letter and contain only lowercase letters, numbers, and underscores"
      );
   }

   // Check length limits
   if (schemaName.length < 3) {
      throw new ValidationError(
         "Schema name must be at least 3 characters long"
      );
   }

   if (schemaName.length > 63) {
      throw new ValidationError("Schema name cannot exceed 63 characters");
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

   if (reservedNames.includes(schemaName)) {
      throw new ValidationError(`Schema name '${schemaName}' is reserved`);
   }
};

/**
 * Check if schema name is a system schema that shouldn't be modified
 * @param {string} schemaName - Schema name to check
 * @returns {boolean} True if it's a system schema
 */
export const isSystemSchema = (schemaName) => {
   const systemSchemas = [
      "information_schema",
      "pg_catalog",
      "pg_toast",
      "public",
      "auth_internal", // Our system schema
   ];
   return systemSchemas.includes(schemaName);
};

const schemaService = {
   createAuthInternalSchema,
   createTenantSchema,
   dropTenantSchema,
   schemaExists,
   listSchemas,
   getSchemaStats,
   validateSchemaName,
   isSystemSchema,
};

export default schemaService;
