import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import readline from "readline";

// consts
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = path.join(ROOT, ".env");
const ENV_TEMPLATE_FILE = path.join(ROOT, ".env.template");

// Generate secure random secrets
const generateSecret = () => crypto.randomBytes(64).toString("hex");

// Create readline interface for user input
const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout,
});

// Helper function to prompt user for input
const promptUser = (question, defaultValue = "") => {
   return new Promise((resolve) => {
      const prompt = defaultValue
         ? `${question} (default: ${defaultValue}): `
         : `${question}: `;

      rl.question(prompt, (answer) => {
         resolve(answer.trim() || defaultValue);
      });
   });
};

// PostgreSQL configuration prompts
const collectPostgresConfig = async () => {
   console.log("\n📊 PostgreSQL Database Configuration");
   console.log("Press Enter to use default values in parentheses\n");

   const postgresConfig = {
      POSTGRES_USER: await promptUser("POSTGRES_USER", "your_username"),
      POSTGRES_PASSWORD: await promptUser("POSTGRES_PASSWORD", "your_password"),
      POSTGRES_DB: await promptUser("POSTGRES_DB", "your_database_name"),
      POSTGRES_HOST: await promptUser("POSTGRES_HOST", "localhost"),
      POSTGRES_PORT: await promptUser("POSTGRES_PORT", "5432"),
   };

   return postgresConfig;
};

// Security secrets configuration prompts
const collectSecurityConfig = async () => {
   console.log("\n🔐 Security Configuration");
   console.log("Press Enter to auto-generate secure random secrets\n");

   const sessionSecret = await promptUser("SECRET_KEY", "[auto-generate]");
   const jwtSecret = await promptUser("JWT_SECRET", "[auto-generate]");

   return {
      SECRET_KEY:
         sessionSecret === "[auto-generate]" ? generateSecret() : sessionSecret,
      JWT_SECRET:
         jwtSecret === "[auto-generate]" ? generateSecret() : jwtSecret,
   };
};

// Main setup function
const setupEnv = async () => {
   if (fs.existsSync(ENV_FILE)) {
      console.log(".env file already exists, skipping setup");
      rl.close();
      process.exit(0);
   }

   if (!fs.existsSync(ENV_TEMPLATE_FILE)) {
      console.error(`File ${ENV_TEMPLATE_FILE} does not exist`);
      rl.close();
      process.exit(1);
   }

   console.log("\n");
   console.log("🚀 Setting up environment configuration...\n");

   try {
      // Read template file
      let envContent = fs.readFileSync(ENV_TEMPLATE_FILE, "utf8");

      // Collect PostgreSQL configuration
      const postgresConfig = await collectPostgresConfig();

      // Collect security configuration
      const securityConfig = await collectSecurityConfig();

      // Replace PostgreSQL placeholders
      envContent = envContent.replace(
         /POSTGRES_USER=.*/,
         `POSTGRES_USER=${postgresConfig.POSTGRES_USER}`
      );
      envContent = envContent.replace(
         /POSTGRES_PASSWORD=.*/,
         `POSTGRES_PASSWORD=${postgresConfig.POSTGRES_PASSWORD}`
      );
      envContent = envContent.replace(
         /POSTGRES_DB=.*/,
         `POSTGRES_DB=${postgresConfig.POSTGRES_DB}`
      );
      envContent = envContent.replace(
         /POSTGRES_HOST=.*/,
         `POSTGRES_HOST=${postgresConfig.POSTGRES_HOST}`
      );
      envContent = envContent.replace(
         /POSTGRES_PORT=.*/,
         `POSTGRES_PORT=${postgresConfig.POSTGRES_PORT}`
      );

      // Replace secret placeholders
      envContent = envContent.replace(
         /SECRET_KEY=.*/,
         `SECRET_KEY=${securityConfig.SECRET_KEY}`
      );
      envContent = envContent.replace(
         /JWT_SECRET=.*/,
         `JWT_SECRET=${securityConfig.JWT_SECRET}`
      );

      // Write the modified content to .env file
      fs.writeFileSync(ENV_FILE, envContent);

      console.log("\n✅ .env file created successfully!");
      console.log("📊 PostgreSQL configuration set");
      console.log("🔑 Security secrets configured");
      console.log("\n📄 Configuration summary:");
      console.log(`   POSTGRES_DB: ${postgresConfig.POSTGRES_DB}`);
      console.log(
         `   POSTGRES_HOST: ${postgresConfig.POSTGRES_HOST}:${postgresConfig.POSTGRES_PORT}`
      );
      console.log(`   POSTGRES_USER: ${postgresConfig.POSTGRES_USER}`);
      console.log(
         `   🔐 SECRET_KEY: ${
            securityConfig.SECRET_KEY.length > 32
               ? "Auto-generated (64 bytes)"
               : "Custom provided"
         }`
      );
      console.log(
         `   🔐 JWT_SECRET: ${
            securityConfig.JWT_SECRET.length > 32
               ? "Auto-generated (64 bytes)"
               : "Custom provided"
         }`
      );
      console.log("\n");
   } catch (error) {
      console.error(`❌ Error setting up .env file: ${error}`);
      process.exit(1);
   } finally {
      rl.close();
   }
};

// Run the setup
setupEnv();
