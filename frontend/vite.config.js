import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ command, mode }) => {
   // Load env file based on `mode` in the current working directory.
   // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
   const env = loadEnv(mode, resolve(process.cwd(), ".."), "");

   // Load env variables
   const isProd = mode === "production";

   const FRONTEND_PORT = isProd
      ? env.PROD_FRONTEND_PORT || 3000
      : env.DEV_FRONTEND_PORT || 3000;

   // For local development, Vite typically runs on localhost or 0.0.0.0
   // Using "frontend" as a hostname implies a containerized setup.
   // If running locally without Docker resolving "frontend", this should be localhost.
   const FRONTEND_HOST = isProd
      ? env.PROD_FRONTEND_HOST || "localhost"
      : env.DEV_FRONTEND_HOST || "localhost";

   const BACKEND_PORT = isProd
      ? env.PROD_BACKEND_PORT || 3001
      : env.DEV_BACKEND_PORT || 3001;

   // Corrected BACKEND_HOST to use environment variables or 'localhost' as a fallback.
   // Also corrected the typo from process.env to env for PROD_BACKEND_HOST.
   const BACKEND_HOST = isProd
      ? env.PROD_BACKEND_HOST || "localhost"
      : env.DEV_BACKEND_HOST || "localhost";

   // BACKEND_URL should be constructed dynamically for both prod and dev
   // using the resolved BACKEND_HOST and BACKEND_PORT.
   const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

   // apiUrl will now also use the corrected BACKEND_HOST
   const apiUrl = `http://${BACKEND_HOST}:${BACKEND_PORT}/api`;

   console.log("🔍 [VITE CONFIG] apiUrl:", apiUrl);
   console.log("🔍 [VITE CONFIG] BACKEND_URL:", BACKEND_URL);
   console.log("🔍 [VITE CONFIG] BACKEND_HOST:", BACKEND_HOST);
   console.log("🔍 [VITE CONFIG] BACKEND_PORT:", BACKEND_PORT);

   return {
      plugins: [svelte()],
      envDir: resolve(process.cwd(), ".."),
      server: {
         port: FRONTEND_PORT,
         host: FRONTEND_HOST,

         // proxy object
         proxy: {
            "/api": {
               target: BACKEND_URL,
               changeOrigin: true,
               secure: false,
               cookieDomainRewrite: "localhost",
               cookiePathRewrite: "/",
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
                  proxy.on("proxyRes", (proxyRes, req, res) => {
                     // Log response headers to debug cookie issues
                     if (req.url.includes("/auth/")) {
                        console.log(
                           "Auth proxy response headers:",
                           proxyRes.headers
                        );
                     }
                  });
               },
            },
         },
      },
      define: {
         "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl),
         "import.meta.env.VITE_BACKEND_URL": JSON.stringify(apiUrl),
      },
   };
});
