/**
 * Integration Test Setup
 * - Real database connections
 * - Test data management
 * - Schema setup/cleanup
 */

import pg from "pg";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

const { Pool } = pg;

// Test database configuration
const TEST_CONFIG = {
   host: process.env.POSTGRES_HOST || "localhost",
   port: process.env.POSTGRES_PORT || 5432,
   database: process.env.POSTGRES_DB || "auth_system",
   user: process.env.POSTGRES_USER || "postgres",
   password: process.env.POSTGRES_PASSWORD || "password",
};

// Test schemas
export const TEST_SCHEMAS = {
   AUTH_INTERNAL: "auth_internal",
   CLIENT_TEST: "test_client_schema",
   CLIENT_TEST_2: "test_client_schema_2",
};

// Test data
export const TEST_USERS = {
   REGULAR_USER: {
      id: uuidv4(),
      name: "Test User",
      email: "test@example.com",
      password: "TestPassword123!",
      role: "user",
   },
   ADMIN_USER: {
      id: uuidv4(),
      name: "Admin User",
      email: "admin@example.com",
      password: "AdminPassword123!",
      role: "admin",
   },
   OWNER_USER: {
      id: uuidv4(),
      name: "Owner User",
      email: "owner@example.com",
      password: "OwnerPassword123!",
      role: "owner",
   },
};

export const TEST_CLIENT_SERVERS = {
   CLIENT_1: {
      client_id: uuidv4(),
      app_name: "Test App 1",
      identifier_url: "https://test-app-1.com",
      entry_point_url: "https://test-app-1.com/auth",
      authorized_urls: ["https://test-app-1.com/*"],
      client_mode: "development",
      assigned_schema_name: TEST_SCHEMAS.CLIENT_TEST,
   },
   CLIENT_2: {
      client_id: uuidv4(),
      app_name: "Test App 2",
      identifier_url: "https://test-app-2.com",
      entry_point_url: "https://test-app-2.com/auth",
      authorized_urls: ["https://test-app-2.com/*"],
      client_mode: "production",
      assigned_schema_name: TEST_SCHEMAS.CLIENT_TEST_2,
   },
};

/**
 * Get test database connection
 */
export async function getTestDbConnection() {
   const pool = new Pool(TEST_CONFIG);
   return pool;
}

/**
 * Setup test schemas
 */
export async function setupTestSchemas() {
   const pool = await getTestDbConnection();

   try {
      // Create test schemas
      for (const schema of Object.values(TEST_SCHEMAS)) {
         await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

         // Create users table in each schema
         await pool.query(`
            CREATE TABLE IF NOT EXISTS "${schema}".users (
               id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
               name VARCHAR(255) NOT NULL,
               email VARCHAR(255) UNIQUE NOT NULL,
               password_hash VARCHAR(255) NOT NULL,
               role VARCHAR(50) DEFAULT 'user',
               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
               updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
         `);

         // Create sessions table in each schema
         await pool.query(`
            CREATE TABLE IF NOT EXISTS "${schema}".sessions (
               id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
               user_id UUID NOT NULL,
               session_id UUID UNIQUE NOT NULL,
               ip_address INET,
               user_agent TEXT,
               expires_at TIMESTAMP NOT NULL,
               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
               FOREIGN KEY (user_id) REFERENCES "${schema}".users(id) ON DELETE CASCADE
            )
         `);
      }

      // Create client_servers table in auth_internal schema only
      await pool.query(`
         CREATE TABLE IF NOT EXISTS "${TEST_SCHEMAS.AUTH_INTERNAL}".client_servers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID UNIQUE NOT NULL,
            client_secret_hash VARCHAR(255) NOT NULL,
            app_name VARCHAR(255) NOT NULL,
            assigned_schema_name VARCHAR(100) NOT NULL,
            identifier_url TEXT NOT NULL,
            entry_point_url TEXT NOT NULL,
            authorized_urls TEXT[] NOT NULL,
            user_id UUID NOT NULL,
            client_mode VARCHAR(50) DEFAULT 'development',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES "${TEST_SCHEMAS.AUTH_INTERNAL}".users(id) ON DELETE CASCADE
         )
      `);
   } finally {
      await pool.end();
   }
}

/**
 * Seed test data
 */
export async function seedTestData() {
   const pool = await getTestDbConnection();

   try {
      // Hash passwords
      const hashedPasswords = {};
      for (const [key, user] of Object.entries(TEST_USERS)) {
         hashedPasswords[key] = await bcrypt.hash(user.password, 12);
      }

      // Insert test users into auth_internal schema
      for (const [key, user] of Object.entries(TEST_USERS)) {
         await pool.query(
            `
            INSERT INTO "${TEST_SCHEMAS.AUTH_INTERNAL}".users 
            (id, name, email, password_hash, role)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role
         `,
            [user.id, user.name, user.email, hashedPasswords[key], user.role]
         );
      }

      // Insert test users into client schemas
      for (const schema of [
         TEST_SCHEMAS.CLIENT_TEST,
         TEST_SCHEMAS.CLIENT_TEST_2,
      ]) {
         for (const [key, user] of Object.entries(TEST_USERS)) {
            const clientUserId = uuidv4(); // Different ID for client schemas
            await pool.query(
               `
               INSERT INTO "${schema}".users 
               (id, name, email, password_hash, role)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (email) DO UPDATE SET
               name = EXCLUDED.name,
               password_hash = EXCLUDED.password_hash,
               role = EXCLUDED.role
            `,
               [
                  clientUserId,
                  user.name,
                  user.email,
                  hashedPasswords[key],
                  user.role,
               ]
            );
         }
      }

      // Insert test client servers (only in auth_internal)
      for (const [key, client] of Object.entries(TEST_CLIENT_SERVERS)) {
         const clientSecretHash = await bcrypt.hash("test-secret-" + key, 12);
         await pool.query(
            `
            INSERT INTO "${TEST_SCHEMAS.AUTH_INTERNAL}".client_servers
            (client_id, client_secret_hash, app_name, assigned_schema_name, 
             identifier_url, entry_point_url, authorized_urls, user_id, client_mode)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (client_id) DO UPDATE SET
            app_name = EXCLUDED.app_name,
            assigned_schema_name = EXCLUDED.assigned_schema_name
         `,
            [
               client.client_id,
               clientSecretHash,
               client.app_name,
               client.assigned_schema_name,
               client.identifier_url,
               client.entry_point_url,
               client.authorized_urls,
               TEST_USERS.OWNER_USER.id, // Owned by owner user
               client.client_mode,
            ]
         );
      }
   } finally {
      await pool.end();
   }
}

/**
 * Clean test data
 */
export async function cleanTestData() {
   const pool = await getTestDbConnection();

   try {
      // Clean all test schemas
      for (const schema of Object.values(TEST_SCHEMAS)) {
         await pool.query(`DELETE FROM "${schema}".sessions`);
         await pool.query(`DELETE FROM "${schema}".users`);

         if (schema === TEST_SCHEMAS.AUTH_INTERNAL) {
            await pool.query(`DELETE FROM "${schema}".client_servers`);
         }
      }
   } finally {
      await pool.end();
   }
}

/**
 * Cleanup test schemas (for complete teardown)
 */
export async function teardownTestSchemas() {
   const pool = await getTestDbConnection();

   try {
      for (const schema of Object.values(TEST_SCHEMAS)) {
         await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      }
   } finally {
      await pool.end();
   }
}

/**
 * Wait for database to be ready
 */
export async function waitForDatabase(maxRetries = 30, delay = 1000) {
   for (let i = 0; i < maxRetries; i++) {
      try {
         const pool = await getTestDbConnection();
         await pool.query("SELECT 1");
         await pool.end();
         console.log("✅ Database is ready");
         return;
      } catch (error) {
         console.log(`⏳ Waiting for database... (${i + 1}/${maxRetries})`);
         await new Promise((resolve) => setTimeout(resolve, delay));
      }
   }
   throw new Error("❌ Database not ready after maximum retries");
}

export default {
   setupTestSchemas,
   seedTestData,
   cleanTestData,
   teardownTestSchemas,
   waitForDatabase,
   getTestDbConnection,
   TEST_SCHEMAS,
   TEST_USERS,
   TEST_CLIENT_SERVERS,
};
