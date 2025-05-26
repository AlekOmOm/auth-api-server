import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Load env variables
const isProd = process.env.NODE_ENV === "production";

const FRONTEND_PORT = isProd
   ? process.env.PROD_FRONTEND_PORT || 3000
   : process.env.DEV_FRONTEND_PORT || 3000;

const FRONTEND_HOST = isProd
   ? process.env.PROD_FRONTEND_HOST || "localhost"
   : process.env.DEV_FRONTEND_HOST || "localhost";

const BACKEND_PORT = isProd
   ? process.env.PROD_BACKEND_PORT || 3003
   : process.env.DEV_BACKEND_PORT || 3003;

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

export default defineConfig({
   plugins: [svelte()],
   envDir: resolve(__dirname, ".."),
   server: {
      port: FRONTEND_PORT,
      host: FRONTEND_HOST,
      // proxy calls to backend on /api
      proxy: {
         "/api": {
            target: BACKEND_URL,
            changeOrigin: true,
            secure: false,
            configure: (proxy, options) => {
               proxy.on("error", (err, req, res) => {
                  console.log("Proxy error:", err);
               });
               proxy.on("proxyReq", (proxyReq, req, res) => {
                  console.log(
                     "Proxying request:",
                     req.method,
                     req.url,
                     "->",
                     options.target + req.url
                  );
               });
            },
         },
      },
   },
   define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl),
      "import.meta.env.VITE_BACKEND_URL": JSON.stringify(apiUrl),
   },
});
