/**
 * Escapes a string to be safely used as a database identifier (e.g., schema, table, or column name).
 * It surrounds the identifier with double quotes and escapes any internal double quotes by doubling them.
 *
 * This is the standard way to quote identifiers in PostgreSQL.
 *
 * @param {string} identifier The identifier to escape.
 * @returns {string} The escaped and quoted identifier.
 * @throws {Error} If the identifier is not a string or is empty.
 */
export const escapeDbIdentifier = (identifier) => {
   if (typeof identifier !== "string" || identifier.length === 0) {
      throw new Error("Identifier must be a non-empty string.");
   }
   // replace all occurrences of " with "" and wrap in "
   return `"${identifier.replace(/"/g, '""')}"`;
};
