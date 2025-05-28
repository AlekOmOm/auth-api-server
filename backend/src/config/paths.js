import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const main directories
//backend\src\utils\paths.js
export const BACKEND_DIR = path.resolve(__dirname, "..", "..");
/**
 * - constrollers
 * - db
 *   - postgres
 *   - schemas
 *     - auth_internal/auth_internal.sql
 *     - client_trading_sim/client_server_schema.sql
 * - middleware
 * - routes
 * - utils
 */

// env absolute path
export const ENV_PATH = path.resolve(BACKEND_DIR, "..", ".env");
// src dirs
export const CONTROLLERS_DIR = path.resolve(BACKEND_DIR, "src", "controllers");
export const DB_DIR = path.resolve(BACKEND_DIR, "src", "db");
export const MIDDLEWARE_DIR = path.resolve(BACKEND_DIR, "src", "middleware");
export const ROUTES_DIR = path.resolve(BACKEND_DIR, "src", "routes");

// sub src dirs
export const SCHEMAS_DIR = path.resolve(DB_DIR, "schemas");
export const POSTGRES_DIR = path.resolve(DB_DIR, "postgres");
export const ENV_JS = path.resolve(BACKEND_DIR, "src", "config", "env.js");

// files

export const paths = {
   BACKEND_DIR: BACKEND_DIR,
   ENV_PATH: ENV_PATH,
   // src dirs
   CONTROLLERS_DIR,
   MIDDLEWARE_DIR,
   ROUTES_DIR,
   DB_DIR,
   // sub src dirs
   SCHEMAS_DIR,
   POSTGRES_DIR,
   ENV_JS,
};

export default paths;
