import sqlite3 from "sqlite3";
import { open } from "sqlite";

const dbPath = "../db/auth.db";

if (!dbPath) {
  console.error("Error: DATABASE_PATH environment variable is not set.");
  process.exit(1); // Exit if DB path is not configured
}

console.log(`Attempting to connect to database at: ${dbPath}`); // Log the path

const connection = await open({
  filename: dbPath,
  driver: sqlite3.Database,
});

console.log("Database connection established successfully."); // Log success

export default connection;
