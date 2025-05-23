import sqlite3 from "sqlite3";
import { open } from "sqlite";

const dbPath = process.env.DATABASE_PATH || "../db/auth.db";

if (!dbPath) {
  console.error("Error: DATABASE_PATH environment variable is not set.");
  process.exit(1); // Exit if DB path is not configured
}

// Database connection
const connection = await open({
  filename: dbPath,
  driver: sqlite3.Database,
});

export default connection;
