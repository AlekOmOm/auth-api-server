// models/base/ValidationMixin.js

/**
 * Validation Mixin
 * Provides common validation methods that can be mixed into model classes
 */
class ValidationMixin {
   // --- URL Validation ---

   /**
    * Validate if string is a valid URL
    */
   static isValidUrl(url) {
      if (!url || typeof url !== "string") return false;

      try {
         new URL(url);
         return true;
      } catch {
         return false;
      }
   }

   /**
    * Validate if URL uses HTTPS (for production)
    */
   static isSecureUrl(url) {
      if (!this.isValidUrl(url)) return false;
      return url.startsWith("https://");
   }

   /**
    * Validate array of URLs
    */
   static validateUrlArray(urls, allowInsecure = false) {
      if (!Array.isArray(urls)) {
         return { valid: false, error: "URLs must be an array" };
      }

      for (let i = 0; i < urls.length; i++) {
         if (!this.isValidUrl(urls[i])) {
            return {
               valid: false,
               error: `Invalid URL at index ${i}: ${urls[i]}`,
            };
         }

         if (!allowInsecure && !this.isSecureUrl(urls[i])) {
            return {
               valid: false,
               error: `Insecure URL at index ${i}: ${urls[i]} (HTTPS required)`,
            };
         }
      }

      return { valid: true };
   }

   // --- Email Validation ---

   /**
    * Validate email format
    */
   static isValidEmail(email) {
      if (!email || typeof email !== "string") return false;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email.toLowerCase());
   }

   // --- String Validation ---

   /**
    * Validate string length
    */
   static validateStringLength(str, min = 0, max = Infinity) {
      if (typeof str !== "string") return false;
      return str.length >= min && str.length <= max;
   }

   /**
    * Validate string contains only allowed characters
    */
   static validateStringPattern(str, pattern) {
      if (typeof str !== "string") return false;
      return pattern.test(str);
   }

   /**
    * Sanitize string for database schema name
    */
   static sanitizeSchemaName(str) {
      if (typeof str !== "string") return "";
      return str
         .toLowerCase()
         .replace(/[^a-z0-9]/g, "_")
         .replace(/_{2,}/g, "_")
         .replace(/^_|_$/g, "");
   }

   // --- UUID Validation ---

   /**
    * Validate UUID format
    */
   static isValidUUID(uuid) {
      if (!uuid || typeof uuid !== "string") return false;

      const uuidRegex =
         /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
   }

   // --- Array Validation ---

   /**
    * Validate array is not empty
    */
   static isNonEmptyArray(arr) {
      return Array.isArray(arr) && arr.length > 0;
   }

   /**
    * Validate all array elements match a condition
    */
   static validateArrayElements(arr, validator) {
      if (!Array.isArray(arr)) return false;
      return arr.every(validator);
   }

   // --- Role Validation ---

   /**
    * Validate user role
    */
   static isValidRole(role) {
      const validRoles = ["user", "admin", "owner"];
      return validRoles.includes(role);
   }

   // --- Client Mode Validation ---

   /**
    * Validate client mode
    */
   static isValidClientMode(mode) {
      const validModes = ["frontend-login-proxy", "api-auth-server"];
      return validModes.includes(mode);
   }

   // --- Password Validation ---

   /**
    * Validate password strength
    */
   static validatePasswordStrength(password) {
      if (!password || typeof password !== "string") {
         return { valid: false, error: "Password is required" };
      }

      if (password.length < 8) {
         return {
            valid: false,
            error: "Password must be at least 8 characters",
         };
      }

      if (!/[A-Z]/.test(password)) {
         return {
            valid: false,
            error: "Password must contain at least one uppercase letter",
         };
      }

      if (!/[a-z]/.test(password)) {
         return {
            valid: false,
            error: "Password must contain at least one lowercase letter",
         };
      }

      if (!/\d/.test(password)) {
         return {
            valid: false,
            error: "Password must contain at least one number",
         };
      }

      return { valid: true };
   }

   // --- Comprehensive Validation Method ---

   /**
    * Run multiple validations and collect errors
    */
   static runValidations(data, validationRules) {
      const errors = [];

      validationRules.forEach((rule) => {
         const { field, validators } = rule;
         const value = data[field];

         validators.forEach((validator) => {
            try {
               const result = validator(value, data);
               if (result && !result.valid) {
                  errors.push({
                     field,
                     message: result.error || `Validation failed for ${field}`,
                  });
               }
            } catch (error) {
               errors.push({
                  field,
                  message: `Validation error: ${error.message}`,
               });
            }
         });
      });

      return {
         valid: errors.length === 0,
         errors,
      };
   }
}

export default ValidationMixin;
