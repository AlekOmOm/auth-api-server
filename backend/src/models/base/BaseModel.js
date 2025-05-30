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
         throw new NotFoundError(`${this.name} not found or access denied`);
      }
      throw new Error(`fromDb method must be implemented in ${this.name}`);
   }

   /**
    * Create multiple model instances from database rows
    * Common implementation for all models
    */
   static fromDbRows(dbRows) {
      if (!Array.isArray(dbRows)) {
         return [];
      }
      return dbRows.map((row) => this.fromDb(row));
   }

   /**
    * Create model from user input (req.body)
    * Override in child classes
    */
   static fromInput(inputData) {
      throw new Error(
         `fromInput method must be implemented in ${this.constructor.name}`
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
      // Default: return all non-sensitive properties
      const obj = { ...this };

      // Remove common sensitive fields
      delete obj.password;
      delete obj.passwordHash;
      delete obj.client_secret;
      delete obj.client_secret_hash;
      delete obj._errors;
      delete obj._isValid;

      return obj;
   }

   /**
    * Convert to JSON (for serialization)
    */
   toJSON() {
      return this.toApiResponse();
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

   /**
    * Run comprehensive validations using ValidationMixin
    * @param {Array} validationRules - Array of validation rules
    * @returns {Object} Validation result
    */
   runValidations(validationRules) {
      const data = this.toDatabaseObject ? this.toDatabaseObject() : this;
      const result = ValidationMixin.runValidations(data, validationRules);

      if (!result.valid) {
         result.errors.forEach((error) => {
            this.addError(error.message, error.field);
         });
      }

      return result;
   }

   // --- Utility Methods ---

   /**
    * Create a deep copy of the model
    */
   clone() {
      const cloned = Object.create(Object.getPrototypeOf(this));
      Object.assign(cloned, JSON.parse(JSON.stringify(this)));
      return cloned;
   }

   /**
    * Check if model has specific property
    */
   hasProperty(property) {
      return this.hasOwnProperty(property) && this[property] !== undefined;
   }

   /**
    * Get model class name
    */
   getModelName() {
      return this.constructor.name;
   }

   /**
    * Timestamp utilities
    */
   static getCurrentTimestamp() {
      return new Date();
   }

   static getExpiryTimestamp(hours = 24) {
      return new Date(Date.now() + hours * 60 * 60 * 1000);
   }
}

// Copy static methods from ValidationMixin to BaseModel
// This allows child classes to use these validation methods directly
Object.getOwnPropertyNames(ValidationMixin).forEach((name) => {
   if (name !== "prototype" && name !== "length" && name !== "name") {
      BaseModel[name] = ValidationMixin[name];
   }
});

export default BaseModel;
