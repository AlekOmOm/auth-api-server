// Simple DB bootstrap for development / CI
// Usage:
//   node src/db/setupDB.js        – ensures default schema & tables
//   node src/db/setupDB.js --delete  – drops existing tables first then reseeds
import config from "../../utils/config.js";
import seedDB from "../seed/seedDB.js";
import getPool from "./pools/auth.js";
import { getPoolForSchema } from "./pools/clientServers.js";

const deleteMode = process.argv.includes("--delete");

async function setupDB() {
   const defaultSchema = seedDB.SEED_SCHEMA;
   const pool = await getPool();
   const poolForSchema = await getPoolForSchema(defaultSchema);

   if (deleteMode) {
      console.log("dropping tables");
      await pool.query("DROP TABLE IF EXISTS client_servers CASCADE;");
      await poolForSchema.query("DROP TABLE IF EXISTS sessions CASCADE;");
      await poolForSchema.query("DROP TABLE IF EXISTS users CASCADE;");
   }

   // getPoolForSchema already (re)creates tables via template
   if (deleteMode) {
      console.log(" seeding");
      await seedDB();
   }

   console.log("✅  Database setup complete");
   process.exit(0);
}

setupDB();
