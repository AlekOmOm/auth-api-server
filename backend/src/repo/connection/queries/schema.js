/**
 * Schema Queries
 *
 * Queries for schema metadata and statistics
 */

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
   return `SELECT COUNT(*) as count FROM ${schemaName}.${tableName}`;
};

export const SCHEMA = {
   checkSchemaExists,
   listNonSystemSchemas,
   getClientInfoBySchema,
   getSchemaTableInfo,
   getTableRowCountTemplate,
};
