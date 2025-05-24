import seedData from "./seedData.json" with { type: "json" };
import * as userRepo from "../repositories/userRepository.js";
import getPool from "../connection/pools/auth.js";
import getPoolForSchema from "../connection/pools/clientServers.js";
import { v4 as uuidv4 } from "uuid";

export const SEED_SCHEMA_NAME = seedData.assigned_schema_name || "client_template";

console.log("SEED_SCHEMA_NAME", SEED_SCHEMA_NAME);

// init
const initSeed = async () => {
   const schemaDB = await getPoolForSchema(SEED_SCHEMA_NAME);

   console.log("schema name", SEED_SCHEMA_NAME);

   // seed users - need to add UUIDs to the user objects
   const usersWithIds = seedData.seed_data.users.map((user) => ({
      id: uuidv4(),
      ...user
   }));
   
   await userRepo.createUsers(schemaDB, SEED_SCHEMA_NAME, usersWithIds);
};

export default initSeed;

initSeed();

