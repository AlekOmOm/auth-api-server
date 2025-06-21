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
   console.log("📍 Environment variables (should be set by vitest.config.js):");
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
