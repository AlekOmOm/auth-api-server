console.log(
   "[AUTH_JS_LOAD_CONFIRM_V5.2] Loading pools/auth.js V5.2 - transactional DDL, explicit client, robust promise."
);

/**
 * connection to auth server
 *
 * schema for orchestration of client servers
 *
 * - client_servers table
 */
import { Pool } from "pg";
import config from "../../../config/env.js";
import { ddl } from "../../DDL/auth_internal_complete.js";

let pool;
let initializationPromise = null; // This promise will resolve to the initialized pool or reject on error

async function initSchemaAndPool() {
   console.log(
      "[AuthPool_INIT_V5_ENTRY] Initializing auth_internal schema and pool..."
   );

   const pgConfig = {
      host: config.POSTGRES.HOST,
      port: config.POSTGRES.PORT,
      user: config.POSTGRES.USER,
      password: config.POSTGRES.PASSWORD,
      database: config.POSTGRES.DATABASE,
   };

   const tempPool = new Pool(pgConfig);

   // Set search_path for every new connection from this pool
   tempPool.on("connect", (client) => {
      return client.query("SET search_path TO auth_internal, public");
   });

   console.log("[AuthPool_INIT_V5_CONNECT] Connecting to database...");
   const client = await tempPool.connect(); // Use a single client for the whole DDL transaction
   console.log("[AuthPool_INIT_V5_CONNECT_SUCCESS] Connected.");

   try {
      console.log("[AuthPool_INIT_V5_TX] BEGIN DDL transaction.");
      await client.query("BEGIN");

      const allDdlStatements = ddl();
      // Log the DDL statements that are about to be processed
      console.log(
         "[AuthPool_INIT_V5_DDL_CONTENT_START] === DDL Statements to be processed ==="
      );
      allDdlStatements.forEach((stmt, index) => {
         console.log(`[AuthPool_INIT_V5_DDL_STMT_${index + 1}] ${stmt}`);
      });
      console.log(
         "[AuthPool_INIT_V5_DDL_CONTENT_END] ====================================="
      );

      const coreDdlStatements = allDdlStatements.filter((stmt) => {
         const upperStmt = stmt.toUpperCase().trim();
         return upperStmt !== "BEGIN;" && upperStmt !== "COMMIT;";
      });

      for (const stmt of coreDdlStatements) {
         console.log(
            `[AuthPool_INIT_V5_DDL] Executing: ${stmt.substring(0, 120)}...`
         );
         await client.query(stmt);
      }

      const verificationQuery = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'auth_internal' AND table_name = 'users';`;
      console.log(
         "[AuthPool_INIT_V5_VERIFY] Verifying auth_internal.users table..."
      );
      const { rows } = await client.query(verificationQuery);

      if (rows.length > 0) {
         console.log(
            "[AuthPool_INIT_V5_VERIFY_SUCCESS] ✅ Table 'auth_internal.users' verified."
         );
         await client.query("COMMIT");
         console.log("[AuthPool_INIT_V5_TX] COMMIT DDL transaction.");
         pool = tempPool; // Assign the successfully initialized pool to the module-scoped variable
         return pool; // Initialization successful, return the pool
      } else {
         console.error(
            "[AuthPool_INIT_V5_VERIFY_FAIL] ❌ Table 'auth_internal.users' NOT FOUND after DDL."
         );
         await client.query("ROLLBACK");
         console.log(
            "[AuthPool_INIT_V5_TX] ROLLBACK DDL transaction due to verification failure."
         );
         throw new Error(
            "Schema initialization failed: auth_internal.users not found post-DDL."
         );
      }
   } catch (error) {
      console.error(
         "[AuthPool_INIT_V5_DDL_ERROR] 🔥 Error during DDL execution/verification:",
         error.message
      );
      try {
         await client.query("ROLLBACK");
         console.log(
            "[AuthPool_INIT_V5_TX] ROLLBACK DDL transaction due to error."
         );
      } catch (rbError) {
         console.error(
            "[AuthPool_INIT_V5_ROLLBACK_ERROR] 🔥 Error during ROLLBACK:",
            rbError.message
         );
      }
      // If DDL fails, we should clean up the temporary pool we tried to connect with if it wasn't assigned to the main 'pool'
      if (tempPool && !pool) {
         // pool would be null if it was never successfully assigned
         await tempPool
            .end()
            .catch((e) =>
               console.error(
                  "[AuthPool_INIT_V5_CLEANUP_ERROR] Error ending tempPool:",
                  e
               )
            );
      }
      throw error; // Re-throw the original DDL error
   } finally {
      client.release();
      console.log("[AuthPool_INIT_V5_CLIENT_RELEASE] Released DDL client.");
   }
}

const getPool = async () => {
   if (pool) {
      return pool;
   }

   if (!initializationPromise) {
      console.log(
         "[AuthPool_GETPOOL_V5_INIT_CREATE] No existing pool or init promise. Creating new initialization promise."
      );
      initializationPromise = initSchemaAndPool();
   }
   // If there's an existing promise (either just created or from another call), await it.
   try {
      console.log(
         "[AuthPool_GETPOOL_V5_AWAIT_PROMISE] Awaiting initialization promise..."
      );
      const initializedPool = await initializationPromise;
      console.log(
         "[AuthPool_GETPOOL_V5_AWAIT_SUCCESS] Initialization promise resolved. Pool ready."
      );
      return initializedPool;
   } catch (error) {
      console.error(
         "[AuthPool_GETPOOL_V5_AWAIT_ERROR] 🔥 Initialization promise rejected:",
         error.message
      );
      initializationPromise = null; // Reset promise on failure to allow a new attempt by a subsequent call
      throw error; // Re-throw to the caller so they know it failed
   }
};

export default getPool;
