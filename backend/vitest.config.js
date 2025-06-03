import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load .env file from project root - try .env.test first, then .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envTestPath = path.resolve(__dirname, "../.env.test");
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envTestPath)) {
   dotenv.config({ path: envTestPath });
   console.log(`🔧 Vitest using: ${envTestPath}`);
} else {
   dotenv.config({ path: envPath });
   console.log(`🔧 Vitest using: ${envPath}`);
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
         POSTGRES_HOST: process.env.POSTGRES_HOST || "localhost",
         POSTGRES_PORT: process.env.POSTGRES_PORT || "5432",
         POSTGRES_DB: process.env.POSTGRES_DB || "auth_system",
         POSTGRES_USER: process.env.POSTGRES_USER || "postgres",
         POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "password",
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
});
