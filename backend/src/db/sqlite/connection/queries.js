// queries in SQL for
/**
 * DDL
 * - users table
 * - sessions table
 *
 * DML
 * - CRUD sql
 * - CRUD sessions
 * - seeding
 */

// ----- DDL -----

// users
const dropTableUsers = `
DROP TABLE IF EXISTS users;
`;

const createTableUsers = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT NOT NULL, 
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL
);
`;

// sessions
const dropTableSessions = `
DROP TABLE IF EXISTS sessions;
`;

const createTableSessions = `
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    sessionId TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
);
`;

// ----- DML -----
/* - users
 * - sessions
 */

/** ---- CRUD sessions table ---
 *
 * - create session
 * - read session
 *    - read all sessions
 * - update session
 * - delete session
 */

const createSession = `
INSERT INTO sessions (userId, sessionId) VALUES (?, ?);
`;

const deleteSession = `
DELETE FROM sessions WHERE sessionId = ?;
`;

const getSessions = `
SELECT * FROM sessions;
`;

const getSession = `
SELECT * FROM sessions WHERE sessionId = ?;
`;

const getSessionByUserId = `
SELECT * FROM sessions WHERE userId = ?;
`;

const deleteSessionByUserId = `
DELETE FROM sessions WHERE userId = ?;
`;

const deleteSessionBySessionId = `
DELETE FROM sessions WHERE sessionId = ?;
`;

/** ---- CRUD users table ---
 *
 * - create user
 * - read user
 *    - read all users
 * - update user
 * - delete user
 */

const createUser = `
INSERT INTO users (name, role, email, password) VALUES (?, ?, ?, ?);
`;

const getUsers = `
SELECT * FROM users;
`;

const getUser = `
SELECT * FROM users WHERE id = ?;
`;

const getUserByNameAndEmail = `
SELECT * FROM users WHERE name = ? AND email = ?;
`;

const getUserByEmail = `
SELECT * FROM users WHERE email = ?;
`;

const updateUser = `
UPDATE users SET name = ?, role = ?, email = ?, password = ? WHERE id = ?;
`;

const deleteUser = `
DELETE FROM users WHERE id = ?;
`;

/** ---- seeding ----- */

const seedDefaultUsers = (users) => {
  let insertQueries = "";
  users.forEach((user) => {
    insertQueries += `INSERT INTO users (name, role, email, password) VALUES ('${user.name}', '${user.role}', '${user.email}', '${user.password}');\n`;
  });
  return insertQueries;
};

// ----- export -----

const queries = {
  // ----- DDL -----

  // sessions
  dropTableSessions,
  createTableSessions,

  // users
  dropTableUsers,
  createTableUsers,

  // ----- DML -----

  // sessions
  getSessions,
  createSession,
  deleteSession,
  getSession,
  getSessionByUserId,
  deleteSessionByUserId,
  deleteSessionBySessionId,

  // users
  createUser,
  getUsers,
  getUser,
  getUserByNameAndEmail,
  getUserByEmail,
  updateUser,
  deleteUser,

  // ----- seeding -----
  seedDefaultUsers,
};

export default queries;
