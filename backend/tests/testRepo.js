// backend/src/testRepo.js
import clientDB from "../src/db/clientRepository.js"; // Adjust path if needed
import "dotenv/config"; // To load .env variables like SEED_SCHEMA

const TEST_SCHEMA = process.env.SEED_SCHEMA || "client_template"; // Or whatever schema you use for testing

async function testUserCreation() {
   console.log(`Testing user creation in schema: ${TEST_SCHEMA}`);
   try {
      const newUserParams = [
         "Test User Terminal",
         "admin",
         `test-${Date.now()}@example.com`, // Unique email
         "hashed_password_example",
      ];
      const result = await clientDB.createUser(TEST_SCHEMA, newUserParams);
      console.log("User created successfully:", result);
      if (!result || !result.lastID) {
         console.error("Error: User creation did not return the expected ID.");
         return null;
      }

      const createdUser = await clientDB.getUser(TEST_SCHEMA, result.lastID);
      console.log("Fetched created user:", createdUser);
      return createdUser; // Return the full user object which includes the id
   } catch (error) {
      console.error("Error creating or fetching user:", error);
      return null;
   }
}

async function testSessionCreation(userId) {
   if (!userId) {
      console.error("Cannot create session without a userId.");
      return;
   }
   console.log(
      `\nTesting session creation for user ID: ${userId} in schema: ${TEST_SCHEMA}`
   );
   try {
      // paramsArray for createSession now only needs [user_id]
      const result = await clientDB.createSession(TEST_SCHEMA, [userId]);
      console.log("Session created successfully:", result);
      if (!result || !result.id || !result.session_id) {
         console.error(
            "Error: Session creation did not return the expected IDs."
         );
         return;
      }
      // You might want to fetch the session to verify, e.g., using getSession
      const createdSession = await clientDB.getSession(
         TEST_SCHEMA,
         result.session_id
      );
      console.log("Fetched created session:", createdSession);
   } catch (error) {
      console.error("Error creating or fetching session:", error);
   }
}

async function runTests() {
   const user = await testUserCreation();
   if (user && user.id) {
      await testSessionCreation(user.id);
   } else {
      console.log(
         "Skipping session creation due to user creation failure or missing ID."
      );
   }
}

runTests()
   .then(() => {
      console.log("\nTests finished. Check output above.");
      // You might need to manually exit if your DB pool keeps the script alive
      // process.exit(0);
   })
   .catch((err) => {
      console.error("Unhandled error during tests:", err);
      // process.exit(1);
   });
