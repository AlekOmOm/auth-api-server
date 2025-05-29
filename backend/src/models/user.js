import hashing from "../utils/hashing.js";
import { NotFoundError } from "../middleware/errorHandler.js";

class User {
   constructor(
      id = null,
      name,
      role,
      email,
      password = null,
      passwordHash = null
   ) {
      this.id = id; // db generated
      this.name = name;
      this.role = role;
      this.email = email;
      this.password = password;
      passwordHash
         ? (this.passwordHash = passwordHash)
         : hashing.hash(password);
   }

   /**
    * Convert to database-ready object (without plain secret)
    * @returns {Object} Object ready for database insertion
    */
   toDatabaseObject() {}

   toDatabaseArray() {}

   static fromDbRows(dbRows) {
      return dbRows.map((dbRow) => User.fromDb(dbRow));
   }

   static fromDb(dbRow) {
      if (!dbRow) {
         throw new NotFoundError("User not found or access denied");
      }

      return new User(
         dbRow.id,
         dbRow.name,
         dbRow.role,
         dbRow.email,
         dbRow.password,
         dbRow.password_hash
      );
   }
}

export { User };
