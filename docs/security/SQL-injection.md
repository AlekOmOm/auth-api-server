# SQL Injection Prevention Guidelines

This document outlines the rules and best practices to prevent SQL injection vulnerabilities within this repository. Adherence to these guidelines is mandatory for all database interactions.

## Core Principles

1.  **Never Trust User Input:** Treat all external input (from users, APIs, or other services) as potentially malicious. Always sanitize or escape input before including it in SQL queries.
2.  **Use Parameterized Queries (Prepared Statements):** This is the most effective way to prevent SQL injection. Database drivers will handle the safe substitution of parameters.
    *   **Allowed:** `pool.query('SELECT * FROM users WHERE id = $1', [userId]);`
    *   **Forbidden:** `pool.query('SELECT * FROM users WHERE id = ' + userId);`
3.  **Escape Dynamic Identifiers:** When table names, column names, or schema names need to be dynamic (e.g., multi-tenant architectures), they cannot be parameterized directly. In such cases:
    *   **Strict Whitelisting:** If the possible identifiers are from a known, limited set, validate the input against this whitelist.
    *   **Identifier Quoting:** If whitelisting is not feasible, use the database's specific mechanism for quoting identifiers. For PostgreSQL, this means enclosing the identifier in double quotes and escaping any double quotes within the identifier itself (e.g., `\"my_\"\"_table\"`).
        *   Example: `const schemaName = '\"' + userInputSchema.replace(/\"/g, '\"\"') + '\"';`
        *   `const query = \`SELECT * FROM \${schemaName}.\"users\"\`;`
    *   **Avoid Complex Logic:** Keep dynamically generated identifier logic as simple as possible to reduce the risk of errors.
4.  **Least Privilege Principle:** Database users should have only the minimum necessary permissions required for their tasks. Avoid using superuser accounts for application database access.
5.  **Regular Code Reviews:** Specifically look for SQL injection vulnerabilities during code reviews.
6.  **Keep Dependencies Updated:** Database drivers and ORMs/query builders should be kept up-to-date to benefit from the latest security patches.

## Specific Rules for This Repository

*   **Primary Method:** Always use parameterized queries with the `pg` (node-postgres) library. Values passed to `pool.query` or `client.query` as the second argument array are automatically parameterized.
    ```javascript
    // Correct
    const userId = 123;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

    const name = "O'Reilly";
    const result2 = await pool.query('INSERT INTO authors (name) VALUES ($1)', [name]);
    ```

*   **Dynamic Schema/Table Names:**
    *   The `schema.js` service handles dynamic schema name creation and usage. It employs identifier quoting for schema names.
    *   When constructing queries that involve dynamic table or schema names, ensure they are quoted using double quotes, and any internal double quotes within the name are escaped by doubling them (e.g., `\"` becomes `\"\"`).
    *   **Example from `schema.js` (for `getSchemaStats`):**
        ```javascript
        // For schemaName and table.table_name, which are identifiers
        const query = `SELECT COUNT(*) as count FROM \"${schemaName.replace(/\"/g, '\"\"')}\".\"${table.table_name.replace(/\"/g, '\"\"')}\"`;
        await pool.query(query); // Note: No parameters array here as identifiers are part of the query string itself after escaping.
        ```
    *   **Validation:** Schema names are validated using a strict regex (`/^[a-z][a-z0-9_]*$/`) and checked against a list of reserved names in `validateSchemaName` within `schema.js`. This adds an extra layer of security.

*   **Prohibited Practices:**
    *   String concatenation or template literals to build SQL queries with user-supplied *values*.
        ```javascript
        // Incorrect and vulnerable
        const userEmail = req.body.email; // e.g., 'test@example.com'; DROP TABLE users; --'
        const query = \`SELECT * FROM users WHERE email = '\${userEmail}'\`; // SQL Injection!
        await pool.query(query);
        ```
    *   Disabling a database driver's built-in sanitization features.

## Reporting Vulnerabilities

If you discover a potential SQL injection vulnerability, please report it privately to the project maintainers immediately.

By following these guidelines, we can significantly reduce the risk of SQL injection attacks and protect our data.
