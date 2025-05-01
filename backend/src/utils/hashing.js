import bcrypt from "bcryptjs";

const hashing = {
  /**
   * Hash a password
   * @param {string} password - The plain text password to hash
   * @returns {string} - The hashed password
   */
  hash: (password) => {
    // Generate a salt
    const salt = bcrypt.genSaltSync(10);
    // Hash the password with the salt
    return bcrypt.hashSync(password, salt);
  },

  /**
   * Compare a password with a hash
   * @param {string} password - The plain text password to compare
   * @param {string} hash - The hash to compare against
   * @returns {boolean} - Whether the password matches the hash
   */
  compare: (password, hash) => {
    return bcrypt.compareSync(password, hash);
  },
};

export default hashing;
