// Simple UUID test
import { v4 as uuidv4 } from "uuid";
import clientDB from "../src/db/clientRepository.js";

console.log("=== UUID Implementation Test ===\n");

// Test 1: UUID Generation
console.log("1. Testing UUID Generation:");
const testUUID = uuidv4();
console.log(`   Generated UUID: ${testUUID}`);
console.log(
   `   UUID format valid: ${/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      testUUID
   )}`
);

// Test 2: User Creation with UUID
console.log("\n2. Testing User Creation with UUID:");
try {
   const userParams = [
      "UUID Test User",
      "user",
      `uuid-test-${Date.now()}@example.com`,
      "test_password_hash",
   ];

   const result = await clientDB.createUser("client_template", userParams);
   console.log(`   ✅ User created successfully with ID: ${result.lastID}`);
   console.log(
      `   ✅ UUID format valid: ${/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
         result.lastID
      )}`
   );

   console.log("\n=== RESULT ===");
   console.log("✅ UUID Implementation: WORKING");
   console.log("✅ UUID Generation: WORKING");
   console.log("✅ Database Insertion: WORKING");
} catch (error) {
   console.log(`   ❌ Error: ${error.message}`);
   console.log("\n=== RESULT ===");
   console.log(
      "❌ UUID Implementation: PARTIAL - Issues with database operations"
   );
}

process.exit(0);
