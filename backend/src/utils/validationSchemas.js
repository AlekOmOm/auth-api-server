import { ValidationError } from "../middleware/errorHandler.js";
import User from "../models/User.js"; // To potentially reuse existing static validation methods

/**
 * Placeholder for owner-specific validation rules (auth_internal schema).
 * This would define stricter or different rules if needed.
 * For now, it can defer to the User model's default validation,
 * but specific checks can be added here.
 */
const ownerValidationRules = {
   name: (value) => {
      if (!value)
         return { valid: false, message: "Name is required for owners." };
      if (!/^[a-zA-Z ]+$/.test(value))
         return {
            valid: false,
            message: "Owner name must contain only letters and spaces.",
         };
      if (!User.validateStringLength(value, 3, 50))
         return {
            valid: false,
            message: "Owner name must be between 3 and 50 characters.",
         };
      return { valid: true };
   },
   email: (value) => {
      if (!value)
         return { valid: false, message: "Email is required for owners." };
      if (!User.isValidEmail(value))
         return { valid: false, message: "Invalid email format for owner." };
      if (value.length > 50)
         return {
            valid: false,
            message: "Owner email must not exceed 50 characters.",
         };
      return { valid: true };
   },
   password: (value) => {
      if (!value)
         return { valid: false, message: "Password is required for owners." };
      if (value.length < 8 || value.length > 100)
         return {
            valid: false,
            message: "Owner password must be between 8 and 100 characters.",
         };
      const strength = User.validatePasswordStrength(value);
      if (!strength.valid) return { valid: false, message: strength.error };
      return { valid: true };
   },
   role: (value) => {
      if (typeof value !== "string") {
         return {
            valid: false,
            message: "Role must be a string.",
         };
      }
      const normalizedValue = value.trim().toLowerCase();
      if (!["owner", "admin"].includes(normalizedValue))
         return {
            valid: false,
            message:
               "Owner role must be 'owner' or 'admin'. Received: '" +
               value +
               "'",
         };
      return { valid: true };
   },
   // Add other owner-specific fields and rules as needed
};

/**
 * Placeholder for client user-specific validation rules.
 * This might have different requirements (e.g., name might be optional, or different password complexity).
 */
const clientUserValidationRules = {
   name: (value) => {
      // Assuming name is required for client users as per current User model
      if (!value) return { valid: false, message: "Name is required." };
      if (!/^[a-zA-Z ]+$/.test(value))
         return {
            valid: false,
            message: "Name must contain only letters and spaces.",
         };
      if (!User.validateStringLength(value, 3, 50))
         return {
            valid: false,
            message: "Name must be between 3 and 50 characters.",
         };
      return { valid: true };
   },
   email: (value) => {
      if (!value) return { valid: false, message: "Email is required." };
      if (!User.isValidEmail(value))
         return { valid: false, message: "Invalid email format." };
      if (value.length > 50)
         return {
            valid: false,
            message: "Email must not exceed 50 characters.",
         };
      return { valid: true };
   },
   password: (value) => {
      if (!value) return { valid: false, message: "Password is required." };
      if (value.length < 8 || value.length > 100)
         return {
            valid: false,
            message: "Password must be between 8 and 100 characters.",
         };
      const strength = User.validatePasswordStrength(value);
      if (!strength.valid) return { valid: false, message: strength.error };
      return { valid: true };
   },
   role: (value) => {
      if (typeof value !== "string") {
         return {
            valid: false,
            message: "Role must be a string.",
         };
      }
      const normalizedValue = value.trim().toLowerCase();
      // Client users typically should only have the 'user' role upon registration by themselves.
      if (normalizedValue !== "user")
         return {
            valid: false,
            message:
               "Role for client users must be 'user'. Received: '" +
               value +
               "'",
         };
      return { valid: true };
   },
   // Add other client-user-specific fields and rules
};

/**
 * Validates user data based on the schema context.
 * @param {string} schema - The schema context (e.g., 'auth_internal', 'client_xyz').
 * @param {object} userData - The user data to validate.
 * @returns {object} - The validated user data.
 * @throws {ValidationError} - If validation fails.
 */
export function validateUserForContext(schema, userData) {
   const rules =
      schema === "auth_internal"
         ? ownerValidationRules
         : clientUserValidationRules;
   const errors = [];

   // Check for required fields based on the chosen ruleset
   // This example assumes all fields in the rules object are required.
   // A more sophisticated setup might have a separate 'requiredFields' list per context.
   for (const field in rules) {
      if (rules.hasOwnProperty(field)) {
         const value = userData[field];
         const validationResult = rules[field](value, userData); // Pass full userData for cross-field validation if needed

         if (!validationResult.valid) {
            errors.push({ field: field, message: validationResult.message });
         }
      }
   }

   // Example: check if essential fields defined in rules are present in userData
   // This is a simplistic check; ideally, rules would define what's required.
   if (schema === "auth_internal") {
      if (userData.role && !["owner", "admin"].includes(userData.role)) {
         errors.push({
            field: "role",
            message:
               "Invalid role for auth_internal context. Must be 'owner' or 'admin'.",
         });
      }
   } else {
      // client schema
      if (userData.role && userData.role !== "user") {
         errors.push({
            field: "role",
            message: "Invalid role for client context. Must be 'user'.",
         });
      }
   }

   if (errors.length > 0) {
      throw new ValidationError(
         "User data validation failed for the given context.",
         errors,
         schema
      );
   }

   // Return a copy of the userData, potentially filtering or transforming it based on rules
   // For now, just returns the original if it passes.
   return { ...userData };
}

/**
 * Returns an array of field names that are expected/validated for a given schema context.
 * This is based on the keys of the defined validation rule objects.
 * @param {string} schema - The schema context (e.g., 'auth_internal', 'client_xyz').
 * @returns {string[]} - Array of field names.
 */
export function getRequiredFieldsForSchema(schema) {
   if (schema === "auth_internal") {
      return Object.keys(ownerValidationRules);
   } else {
      // Default to client user rules for any other schema
      return Object.keys(clientUserValidationRules);
   }
}
