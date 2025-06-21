import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load .env file from project root - try .env.test first, then .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendEnvTestPath = path.resolve(__dirname, "./.env.test");
const rootEnvPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(backendEnvTestPath)) {
   dotenv.config({ path: backendEnvTestPath });
   console.log(`🔧 Vitest using: ${backendEnvTestPath}`);
} else if (fs.existsSync(rootEnvPath)) {
   dotenv.config({ path: rootEnvPath });
   console.log(`🔧 Vitest using (fallback from root): ${rootEnvPath}`);
} else {
   console.warn(
      `⚠️ Vitest WARNING: Neither backend/.env.test nor root .env found. Tests will rely on hardcoded fallbacks or preset environment variables.`
   );
}

export default defineConfig({
   test: {
      globals: true,
      environment: "node",
      testTimeout: 30000,
      hookTimeout: 30000,
      pool: "forks",
      poolOptions: {
         forks: {
            singleFork: true,
         },
      },
      env: {
         NODE_ENV: "test",
         // Use environment variables from .env, with fallbacks for local development
         POSTGRES_HOST: "localhost",
         POSTGRES_PORT: "5432",
         POSTGRES_DB: "your_database_name",
         POSTGRES_USER: "your_username",
         POSTGRES_PASSWORD: "your_password",
         TEST_BASE_URL: "http://localhost:3001",
      },
      include: [
         "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
         "src/**/*.integration.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      ],
      setupFiles: ["./src/services/__tests__/setup/vitest-setup.js"],
      coverage: {
         reporter: ["text", "json", "html"],
         exclude: [
            "node_modules/",
            "src/**/__tests__/**",
            "src/**/*.test.{js,ts}",
            "src/**/*.integration.test.{js,ts}",
            "**/*.config.{js,ts}",
         ],
      },
   },
   // Added SSR configuration for bcryptjs
   ssr: {
      noExternal: ["bcryptjs"],
   },
});
