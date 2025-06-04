/**
 * Schema Queries
 *
 * - CRUD operations on schemas
 * - Queries for schema metadata and statistics
 *
 *
 */

import { ddl as tenantTemplateDDL } from "../../../repo/DDL/tenant_template.js";

// --- Schema CRUD Operations ---

/**
 * Create a new tenant schema with full structure
 * Note: This returns the DDL statements, actual execution happens in the service layer
 * @param {string} schemaName - Name of the schema to create
 * @returns {string[]} Array of DDL statements
 */
export const createTenantSchema = (schemaName) => {
   if (!schemaName || !/^client_[a-z0-9_]+$/.test(schemaName)) {
      throw new Error(
         "Invalid schema name format. Must start with 'client_' and contain only lowercase letters, numbers, and underscores"
      );
   }
   return tenantTemplateDDL(schemaName);
};

/**
 * Drop a schema and all its contents (DANGEROUS)
 * @param {string} schemaName - Name of the schema to drop
 * @returns {string} DROP SCHEMA DDL statement
 */
export const dropSchema = (schemaName) => {
   if (
      !schemaName ||
      schemaName === "auth_internal" ||
      schemaName === "public"
   ) {
      throw new Error("Cannot drop system schemas or invalid schema name");
   }
   return `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`;
};

/**
 * Get basic schema info (name only)
 * @param {string} schemaName - Schema name to check
 * @returns {string} Query to check if schema exists
 */
export const getSchema = `
   SELECT schema_name 
   FROM information_schema.schemata 
   WHERE schema_name = $1;
`;

/**
 * Get all tenant schemas (excluding system schemas)
 * @returns {string} Query to list all client schemas
 */
export const getAllTenantSchemas = `
   SELECT schema_name 
   FROM information_schema.schemata 
   WHERE schema_name LIKE 'client_%'
   ORDER BY schema_name;
`;

/**
 * Update schema name (PostgreSQL doesn't support direct schema rename with data)
 * Note: This would require creating new schema, copying data, and dropping old schema
 * For safety, this operation is not implemented as a simple query
 */
export const updateSchema = null; // Intentionally not implemented for safety

/**
 * Assign schema to client server
 * @returns {string} Query to update client_servers with assigned schema
 */
export const assignSchemaToClient = `
   UPDATE client_servers 
   SET assigned_schema_name = $2 
   WHERE client_id = $1 
   RETURNING *;
`;

/**
 * Unassign schema from client server
 * @returns {string} Query to remove schema assignment from client_servers
 */
export const unassignSchemaFromClient = `
   UPDATE client_servers 
   SET assigned_schema_name = NULL 
   WHERE client_id = $1 
   RETURNING *;
`;

// --- Schema Metadata and Statistics ---
export const checkSchemaExists = `
   SELECT schema_name 
   FROM information_schema.schemata 
   WHERE schema_name = $1;
`;

export const listNonSystemSchemas = `
   SELECT schema_name 
   FROM information_schema.schemata 
   WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
   ORDER BY schema_name;
`;

export const getClientInfoBySchema = `
   SELECT client_id, app_name, user_id, created_at 
   FROM client_servers 
   WHERE assigned_schema_name = $1;
`;

export const getSchemaTableInfo = `
   SELECT 
      t.table_name,
      COUNT(c.column_name) as column_count
   FROM information_schema.tables t
   LEFT JOIN information_schema.columns c ON c.table_schema = $1 AND c.table_name = t.table_name
   WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE'
   GROUP BY t.table_name
   ORDER BY t.table_name;
`;

// Note: For dynamic table row count queries, we still need to construct them dynamically
// because table names can't be parameterized in PostgreSQL
export const getTableRowCountTemplate = (schemaName, tableName) => {
   // This is a template function, not a static query
   // It will be used in the service layer with proper identifier escaping
   return `SELECT COUNT(*) as count FROM "${schemaName}"."${tableName}"`;
};

/**
 * Get schema statistics (table count, total rows, etc.)
 * @returns {string} Query to get comprehensive schema stats
 */
export const getSchemaStats = `
   SELECT 
      schemaname as schema_name,
      COUNT(*) as table_count,
      SUM(n_tup_ins) as total_inserts,
      SUM(n_tup_upd) as total_updates,
      SUM(n_tup_del) as total_deletes,
      SUM(n_live_tup) as total_live_rows
   FROM pg_stat_user_tables 
   WHERE schemaname = $1
   GROUP BY schemaname;
`;

export const SCHEMA = {
   // CRUD operations
   createTenantSchema,
   dropSchema,
   getSchema,
   getAllTenantSchemas,
   updateSchema, // null - not supported for safety
   assignSchemaToClient,
   unassignSchemaFromClient,

   // Metadata and statistics
   checkSchemaExists,
   listNonSystemSchemas,
   getClientInfoBySchema,
   getSchemaTableInfo,
   getTableRowCountTemplate,
   getSchemaStats,
};
