import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

const hashing = {
   /**
    * Hash a password
    * @param {string} password - The plain text password to hash
    * @returns {string} - The hashed password
    */
   hash: (password) => {
      const salt = bcrypt.genSaltSync(SALT_ROUNDS);
      return bcrypt.hashSync(password, salt);
   },

   /**
    * check if valid password
    * @param {string} password - The plain text password to compare
    * @param {string} hash - The hash to compare against
    * @returns {boolean} - Whether the password matches the hash
    */
   same: (password, hash) => {
      return bcrypt.compareSync(password, hash);
   },
};

export default hashing;
