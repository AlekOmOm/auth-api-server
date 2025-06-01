import hashing from "../utils/hashing.js";
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";
import BaseModel from "./base/BaseModel.js";
import { pipe, curry, pick, omit } from "../utils/functional.js";

/**
 * User Model - Functional + OOP Hybrid
 * Extends BaseModel to inherit common functionality and validation
 */
class User extends BaseModel {
   constructor(
      id = null,
      name,
      role,
      email,
      password = null,
      passwordHash = null
   ) {
      super(); // Initialize BaseModel (sets up _errors and _isValid)

      this.id = id; // db generated
      this.name = name;
      this.role = role;
      this.email = email;
      this.password = password;

      // Handle password hashing
      if (passwordHash) {
         this.passwordHash = passwordHash;
      } else if (password) {
         this.passwordHash = hashing.hash(password);
      }

      // Run validation on construction
      this.validate();
   }

   /**
    * Validate user instance
    * Uses methods from ValidationMixin via BaseModel
    */
   validate() {
      this.clearErrors();

      // Required fields validation
      this.validateRequired(["name", "email", "role"]);

      // Email validation using ValidationMixin method (available via BaseModel)
      if (this.email && !User.isValidEmail(this.email)) {
         this.addError("Invalid email format", "email");
      }

      // Role validation
      if (this.role && !User.isValidRole(this.role)) {
         this.addError("Invalid role. Must be: user, admin, or owner", "role");
      }

      // Name length validation
      if (this.name && !User.validateStringLength(this.name, 1, 50)) {
         this.addError("Name must be between 1 and 50 characters", "name");
      }

      // Password validation (only if password is provided and no hash)
      if (this.password && !this.passwordHash) {
         const passwordValidation = User.validatePasswordStrength(
            this.password
         );
         if (!passwordValidation.valid) {
            this.addError(passwordValidation.error, "password");
         }
      }

      return this;
   }

   // --- PURE FACTORY FUNCTIONS ---

   /**
    * Create user from credentials (typically from registration)
    */
   static fromCredentials = (credentials) => {
      const user = new User(
         null,
         credentials.name,
         credentials.role || "user",
         credentials.email,
         credentials.password
      );

      if (!user.isValid()) {
         throw new ValidationError("Invalid user data", user.getErrors());
      }

      return user;
   };
   /**
    * FromRequest
    *
    */
   static fromRequestBody = (request) => {
      const user = new User(
         null,
         request.body.name || null,
         request.body.role || "user",
         request.body.email,
         request.body.password
      );

      if (!user.isValid()) {
         throw new ValidationError("Invalid user data", user.getErrors());
      }

      return user;
   };
   /**
    * Create user from database row
    * @param {Object} dbRow - Database row
    * @returns {User} User instance
    */
   static fromDb = (dbRow) => {
      if (!dbRow) {
         throw new NotFoundError("User not found or access denied");
      }

      return new User(
         dbRow.id,
         dbRow.name,
         dbRow.role,
         dbRow.email,
         dbRow.password, // Usually null from DB
         dbRow.password_hash
      );
   };

   /**
    * Create user for authentication check
    */
   static forAuth = (email, plainPassword) => {
      const user = new User(null, null, "user", email, plainPassword);
      // Clear validation errors since we only need email/password for auth
      user.clearErrors();
      return user;
   };

   // --- IMMUTABLE TRANSFORMATION METHODS ---

   /**
    * Return new user instance with updated role
    * @param {string} newRole - New role
    * @returns {User} New user instance
    */
   withRole = (newRole) => {
      return new User(
         this.id,
         this.name,
         newRole,
         this.email,
         null,
         this.passwordHash
      );
   };

   /**
    * Return new user instance with updated name
    * @param {string} newName - New name
    * @returns {User} New user instance
    */
   withName = (newName) => {
      return new User(
         this.id,
         newName,
         this.role,
         this.email,
         null,
         this.passwordHash
      );
   };

   /**
    * Return new user instance with updated email
    * @param {string} newEmail - New email
    * @returns {User} New user instance
    */
   withEmail = (newEmail) => {
      return new User(
         this.id,
         this.name,
         this.role,
         newEmail,
         null,
         this.passwordHash
      );
   };

   /**
    * Return new user instance with new password
    * @param {string} newPassword - New plain password
    * @returns {User} New user instance with hashed password
    */
   withPassword = (newPassword) => {
      return new User(
         this.id,
         this.name,
         this.role,
         this.email,
         newPassword, // Will be hashed in constructor
         null
      );
   };

   // --- PURE DATA TRANSFORMERS ---

   static update(requestBody, existingUser) {
      if (!existingUser) {
         throw new ValidationError("User not found");
      }

      const allowedUpdates = ["name", "role"];

      const updateKeys = Object.keys(requestBody).filter((key) =>
         allowedUpdates.includes(key)
      );

      const updateData = Object.fromEntries(
         updateKeys.map((key) => [key, requestBody[key]])
      );

      return new User(
         existingUser.id,
         updateData.name || existingUser.name,
         updateData.role || existingUser.role,
         updateData.email || existingUser.email,
         updateData.password || existingUser.password,
         existingUser.passwordHash
      );
   }

   /**
    * Convert to database-ready object (without plain secret)
    * @returns {Object} Object ready for database insertion
    */
   toDatabaseObject = () => ({
      id: this.id,
      name: this.name,
      role: this.role,
      email: this.email,
      password_hash: this.passwordHash,
   });

   /**
    * Convert to database parameter array
    * @returns {Array} Array ready for parameterized queries
    */
   toDatabaseArray = () => [
      this.id,
      this.name,
      this.role,
      this.email,
      this.passwordHash,
   ];

   /**
    * Convert to safe API response (overrides BaseModel method)
    * @returns {Object} User object without sensitive data
    */
   toApiResponse = () => ({
      id: this.id,
      name: this.name,
      role: this.role,
      email: this.email,
   });

   /**
    * Convert to JWT payload
    * @returns {Object} User data for JWT token
    */
   toJwtPayload = () => ({
      id: this.id,
      email: this.email,
      role: this.role,
   });

   // --- PURE PREDICATES ---

   /**
    * Check if user has a specific role
    * @param {string} requiredRole - Role to check
    * @returns {boolean}
    */
   hasRole = (requiredRole) => this.role === requiredRole;

   /**
    * Check if user is admin or owner
    * @returns {boolean}
    */
   isPrivileged = () => this.role === "admin" || this.role === "owner";

   /**
    * Check if user can manage another user
    * @param {User} otherUser - User to check against
    * @returns {boolean}
    */
   canManage = (otherUser) => {
      if (this.role === "owner") return true;
      if (this.role === "admin" && otherUser.role === "user") return true;
      return this.id === otherUser.id;
   };

   /**
    * Verify password against hash
    * @param {string} plainPassword - Plain password to verify
    * @returns {boolean}
    */
   verifyPassword = (plainPassword) => {
      if (!this.passwordHash) return false;
      return hashing.verify(plainPassword, this.passwordHash);
   };

   /**
    * Alternative validation approach using validation rules
    * Example of how to use the comprehensive validation system
    */
   static getValidationRules() {
      return [
         {
            field: "email",
            validators: [
               (value) =>
                  value
                     ? { valid: true }
                     : { valid: false, error: "Email is required" },
               (value) =>
                  User.isValidEmail(value)
                     ? { valid: true }
                     : { valid: false, error: "Invalid email format" },
            ],
         },
         {
            field: "name",
            validators: [
               (value) =>
                  value
                     ? { valid: true }
                     : { valid: false, error: "Name is required" },
               (value) =>
                  User.validateStringLength(value, 1, 50)
                     ? { valid: true }
                     : {
                          valid: false,
                          error: "Name must be between 1 and 50 characters",
                       },
            ],
         },
         {
            field: "role",
            validators: [
               (value) =>
                  User.isValidRole(value)
                     ? { valid: true }
                     : { valid: false, error: "Invalid role" },
            ],
         },
      ];
   }
}

// --- FUNCTIONAL OPERATIONS FOR USER ---

/**
 * Functional operations that work with User instances
 */
export const UserOperations = {
   // for repo pipelines
   toDB: (user) => user.toDatabaseObject(),
   fromDB: (dbRow) => User.fromDb(dbRow),

   // Utility functions
   removePassword: (user) => {
      if (!user) return null;
      const { password, password_hash, ...filteredUser } = user;
      return filteredUser;
   },

   // Transformation pipelines
   prepareForApi: (user) => user.toApiResponse(),
   prepareForJwt: (user) => user.toJwtPayload(),

   // Predicates
   isAdmin: (user) => user.hasRole("admin"),
   isOwner: (user) => user.hasRole("owner"),
   isRegularUser: (user) => user.hasRole("user"),
   canAccessAdminPanel: (user) => user.isPrivileged(),

   // Update operations (return new instances)
   promoteToAdmin: (user) => user.withRole("admin"),
   demoteToUser: (user) => user.withRole("user"),

   // Filtering operations
   filterByRole: curry((role, users) =>
      users.filter((user) => user.hasRole(role))
   ),
   filterPrivileged: (users) => users.filter((user) => user.isPrivileged()),
   filterActive: (users) => users.filter((user) => user.isValid()),

   // Sorting operations
   sortByName: (users) =>
      [...users].sort((a, b) => a.name.localeCompare(b.name)),
   sortByEmail: (users) =>
      [...users].sort((a, b) => a.email.localeCompare(b.email)),
   sortByRole: (users) =>
      [...users].sort((a, b) => {
         const roleOrder = { owner: 0, admin: 1, user: 2 };
         return roleOrder[a.role] - roleOrder[b.role];
      }),

   // Safe operations
   safeTransform: curry((transformer, user) => {
      try {
         return { success: true, data: transformer(user) };
      } catch (error) {
         return { success: false, error: error.message };
      }
   }),

   // Composite operations
   createAndValidate: pipe(User.fromCredentials, (user) =>
      user.isValid() ? user : null
   ),

   // Batch operations
   batchUpdateRole: curry((newRole, users) =>
      users.map((user) => user.withRole(newRole))
   ),

   // Data extraction
   extractEmails: (users) => users.map((user) => user.email),
   extractIds: (users) => users.map((user) => user.id),

   // Grouping operations
   groupByRole: (users) =>
      users.reduce((groups, user) => {
         const role = user.role;
         groups[role] = groups[role] || [];
         groups[role].push(user);
         return groups;
      }, {}),
};

export default User;
