/**
 * Vitest Setup for Integration Tests
 * Global setup and configuration for all tests
 */

import { beforeAll, afterAll } from "vitest";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get current file directory and resolve .env path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env.test first, then fallback to .env
const envTestPath = path.resolve(__dirname, "../../../../../.env.test");
const envPath = path.resolve(__dirname, "../../../../../.env");

let loadedEnvFile;
if (fs.existsSync(envTestPath)) {
   dotenv.config({ path: envTestPath });
   loadedEnvFile = envTestPath;
   console.log(`🔧 Loading test .env from: ${envTestPath}`);
} else {
   dotenv.config({ path: envPath });
   loadedEnvFile = envPath;
   console.log(`🔧 Loading .env from: ${envPath}`);
   console.log(`💡 Tip: Create .env.test for test-specific configuration`);
}

// Global test setup
beforeAll(async () => {
   console.log("🔧 Global test setup starting...");

   // Set test environment variables if not already set
   if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = "test";
   }

   // Ensure database connection environment variables are set
   const requiredEnvVars = [
      "POSTGRES_HOST",
      "POSTGRES_PORT",
      "POSTGRES_DB",
      "POSTGRES_USER",
      "POSTGRES_PASSWORD",
   ];

   const missingVars = [];
   for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
         missingVars.push(envVar);
         console.warn(
            `⚠️ Environment variable ${envVar} not set, using default`
         );
      }
   }

   // Log loaded environment (for debugging)
   console.log(`📍 Environment file: ${loadedEnvFile}`);
   console.log(`📍 POSTGRES_HOST: ${process.env.POSTGRES_HOST}`);
   console.log(`📍 POSTGRES_DB: ${process.env.POSTGRES_DB}`);
   console.log(`📍 POSTGRES_USER: ${process.env.POSTGRES_USER}`);
   console.log(`📍 NODE_ENV: ${process.env.NODE_ENV}`);

   if (missingVars.length > 0) {
      console.warn(
         `⚠️ Missing environment variables: ${missingVars.join(", ")}`
      );
      console.warn(
         `💡 Make sure your .env file has real database credentials, not placeholders`
      );
   }

   console.log("✅ Global test setup complete");
});

// Global test cleanup
afterAll(async () => {
   console.log("🧹 Global test cleanup...");

   // Add any global cleanup here if needed
   // For example, closing global database connections

   console.log("✅ Global test cleanup complete");
});

// Handle unhandled promise rejections in tests
process.on("unhandledRejection", (reason, promise) => {
   console.error("Unhandled Rejection at:", promise, "reason:", reason);
   // Don't exit the process in tests, but log the error
});

// Handle uncaught exceptions in tests
process.on("uncaughtException", (error) => {
   console.error("Uncaught Exception:", error);
   // Don't exit the process in tests, but log the error
});

export default {
   // Export any test utilities here if needed
};
