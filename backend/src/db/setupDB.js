import db from "./connection/connection.js";
import queries from "./connection/queries.js";
import seedData from "./connection/seedData.json" with { type: "json" };

// Delete mode
process.argv.includes("--delete") && console.log("Deleting tables...");

const deleteMode = process.argv.includes("--delete");

if (deleteMode) {
  await db.exec(queries.dropTableUsers);
  await db.exec(queries.dropTableSessions);
}

// DDL
await db.exec(queries.createTableUsers);
await db.exec(queries.createTableSessions);

// DML

// -- seeding --

if (deleteMode) {
  console.log("Seeding tables...");

  const seedQueries = queries.seedDefaultUsers(seedData.users);
  await db.exec(seedQueries);
}

// ------ print out ------

try {
  const users = await db.all(queries.getUsers);
  console.log("Users:", users);
} catch (error) {
  console.error("Error retrieving users:", error);
}

try {
  const sessions = await db.all(queries.getSessions);
  sessions.forEach((session) => {
    session.password = undefined;
    session.role = undefined;
    session.id = undefined;
  });
  console.log("Sessions:", sessions);
} catch (error) {
  console.error("Error retrieving sessions:", error);
}