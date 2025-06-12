import bcrypt from "bcryptjs";

async function generateHashes() {
   const saltRounds = 10;

   // Test user credentials from frontend/__tests__/api/authApi.integration.test.js and clientServerApi.integration.test.js
   const usersToHash = {
      TEST_ADMIN_USER: {
         name: "Admin User",
         email: "admin@auth-system.com",
         password: "admin123",
         role: "admin",
      },
      TEST_REGULAR_USER: {
         name: "Regular Test User",
         email: "testuser@example.com",
         password: "password123",
         role: "user", // Default role for new users, or can be owner if they create clients
      },
      TEST_OWNER_USER: {
         name: "Owner Test User",
         email: "owner@example.com",
         password: "password123",
         role: "owner", // Explicitly an owner
      },
   };

   const results = {};

   console.log("Generating bcrypt hashes for test users...");
   for (const key in usersToHash) {
      const user = usersToHash[key];
      try {
         const hash = await bcrypt.hash(user.password, saltRounds);
         results[key] = { ...user, password_hash: hash };
         console.log(
            `User: ${user.name} (${user.email}), Role: ${user.role}, Password: "${user.password}", Hash: "${hash}"`
         );
      } catch (error) {
         console.error(`Error hashing password for ${user.name}:`, error);
      }
   }
   console.log("\n--- JSON Output of Hashes (for programmatic use) ---");
   console.log(JSON.stringify(results, null, 2));
   console.log("\n--- End of JSON Output ---");
   console.log("\nCopy the hashes into your SQL INSERT statements.");
   return results;
}

generateHashes();
