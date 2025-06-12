// models/base/BaseModel.js

import { NotFoundError } from "../../middleware/errorHandler.js";
import ValidationMixin from "./ValidationMixin.js";

/**
 * Base Model Class
 * Provides common functionality shared across all models
 * Integrates ValidationMixin for comprehensive validation capabilities
 */
class BaseModel {
   constructor() {
      this._errors = [];
      this._isValid = true;
   }

   // --- Common Factory Methods ---

   /**
    * Create model instance from database row
    * Override in child classes
    */
   static fromDb(dbRow) {
      if (!dbRow) {
         throw new NotFoundError(
            `${BaseModel.name} not found or access denied`
         );
      }
      throw new Error(`fromDb method must be implemented in ${BaseModel.name}`);
   }

   /**
    * Create multiple model instances from database rows
    * Common implementation for all models
    */
   static fromDbRows(dbRows) {
      if (!Array.isArray(dbRows)) {
         return [];
      }
      return dbRows.map((row) => BaseModel.fromDb(row));
   }

   /**
    * Create model from request body/service layer arguments.
    * This method is crucial for the service pipeline pattern.
    * Used by all service files in their pipeline pattern.
    * @param {...any} args - Arguments from the service layer, specific to the operation.
    * @returns {Object|any} Model instance or payload for the repository query.
    * @throws {Error} If not implemented or if validation fails.
    */
   static fromRequestBody(...args) {
      throw new Error(
         `static fromRequestBody(...args) method must be implemented in ${BaseModel.name}`
      );
   }

   // --- Common Transformation Methods ---

   /**
    * Convert to database-ready object
    * Override in child classes
    */
   toDatabaseObject() {
      throw new Error(
         `toDatabaseObject method must be implemented in ${this.constructor.name}`
      );
   }

   /**
    * Convert to database parameter array
    * Override in child classes
    */
   toDatabaseArray() {
      throw new Error(
         `toDatabaseArray method must be implemented in ${this.constructor.name}`
      );
   }

   /**
    * Convert to safe API response (removes sensitive data)
    * Override in child classes
    */
   toApiResponse() {
      // Default: return all non-sensitive properties using destructuring for better performance
      /* eslint-disable camelcase */
      const {
         password,
         passwordHash,
         client_secret,
         client_secret_hash,
         _errors,
         _isValid,
         ...safe
      } = this;
      /* eslint-enable camelcase */
      return safe;
   }

   // --- Validation Methods ---

   /**
    * Check if model instance is valid
    */
   isValid() {
      return this._isValid && this._errors.length === 0;
   }

   /**
    * Get validation errors
    */
   getErrors() {
      return [...this._errors];
   }

   /**
    * Add validation error
    */
   addError(message, field = null) {
      this._errors.push({ message, field });
      this._isValid = false;
      return this;
   }

   /**
    * Clear all validation errors
    */
   clearErrors() {
      this._errors = [];
      this._isValid = true;
      return this;
   }

   /**
    * Validate required fields
    */
   validateRequired(fields) {
      fields.forEach((field) => {
         if (!this[field] || this[field] === "") {
            this.addError(`${field} is required`, field);
         }
      });
      return this;
   }

   /**
    * Validate field types
    */
   validateTypes(fieldTypes) {
      Object.entries(fieldTypes).forEach(([field, expectedType]) => {
         if (this[field] !== undefined && this[field] !== null) {
            const actualType = typeof this[field];
            if (actualType !== expectedType) {
               this.addError(
                  `${field} must be of type ${expectedType}, got ${actualType}`,
                  field
               );
            }
         }
      });
      return this;
   }

   /**
    * Run validations defined in child class
    * Override this in child classes to define specific validations
    */
   validate() {
      this.clearErrors();
      // Child classes should override this method
      return this;
   }

   // --- Essential Utility Methods ---

   /**
    * Timestamp utilities (used by Session model)
    */
   static getCurrentTimestamp() {
      return new Date();
   }

   static getExpiryTimestamp(hours = 24) {
      return new Date(Date.now() + hours * 60 * 60 * 1000);
   }
}

// Temporarily comment out the ValidationMixin application for diagnostics
/*
Object.getOwnPropertyNames(ValidationMixin).forEach((name) => {
   if (name !== "prototype" && name !== "length" && name !== "name") {
      BaseModel[name] = ValidationMixin[name];
   }
});
*/

export default BaseModel;
