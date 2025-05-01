// Main repository module that combines user and session repositories
import userRepository from "./repository/userRepository.js";
import sessionRepository from "./repository/sessionRepository.js";

// Additional methods from MODIFICATIONS-NEEDED.md
import db from "./connection/connection.js";
import queries from "./connection/queries.js";

const getUserByEmail = (email) => {
  return db.get(queries.getUserByEmail, email);
};

const getUserByNameAndEmail = (name, email) => {
  return db.get(queries.getUserByNameAndEmail, [name, email]);
};

const getSessionByUserId = (userId) => {
  return db.get(queries.getSessionByUserId, userId);
};

const deleteSessionByUserId = (userId) => {
  return db.run(queries.deleteSessionByUserId, userId);
};

// combined export for repositories
export default {
  // User methods
  ...userRepository,
  getUserByEmail,
  getUserByNameAndEmail,

  // Session methods
  ...sessionRepository,
  getSessionByUserId,
  deleteSessionByUserId,
};
