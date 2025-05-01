import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Load env variables
const isProd = process.env.NODE_ENV === "production";

/* .env.template

# Frontend
DEV_FRONTEND_PORT=3000
DEV_FRONTEND_HOST=localhost
PROD_FRONTEND_PORT=3000
PROD_FRONTEND_HOST=localhost

# Backend
DEV_BACKEND_PORT=3001
DEV_BACKEND_HOST=localhost
PROD_BACKEND_PORT=3001
PROD_BACKEND_HOST=localhost

# API
DEV_API_URL=http://localhost:3001/api
PROD_API_URL=http://localhost:3001/api

*/

const FRONTEND_PORT = isProd
  ? process.env.PROD_FRONTEND_PORT || 3000
  : process.env.DEV_FRONTEND_PORT || 3000;

const FRONTEND_HOST = isProd
  ? process.env.PROD_FRONTEND_HOST || "localhost"
  : process.env.DEV_FRONTEND_HOST || "localhost";

const BACKEND_PORT = isProd
  ? process.env.PROD_BACKEND_PORT || 3001
  : process.env.DEV_BACKEND_PORT || 3001;

const BACKEND_HOST = isProd
  ? process.env.PROD_BACKEND_HOST || "localhost"
  : process.env.DEV_BACKEND_HOST || "localhost";

// --- urls ---
const BACKEND_URL = isProd
  ? `http://${BACKEND_HOST}:${BACKEND_PORT}`
  : `http://${BACKEND_HOST}:${BACKEND_PORT}`;

const apiUrl = isProd
  ? `http://${BACKEND_HOST}:${BACKEND_PORT}/api`
  : `http://${BACKEND_HOST}:${BACKEND_PORT}/api`;

// https://vite.dev/config/

// auth-system_NodeJS\.env
// auth-system_NodeJS\frontend
// auth-system_NodeJS\backend
export default defineConfig({
  plugins: [svelte()],
  envDir: resolve(__dirname, ".."),
  server: {
    port: FRONTEND_PORT,
    host: FRONTEND_HOST,
  },
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl),
    "import.meta.env.VITE_BACKEND_URL": JSON.stringify(apiUrl),
  },
});
