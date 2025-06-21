import {
   ClientServer,
   Session,
   User,
   Schema,
   BaseModel,
   ValidationMixin,
   operations,
   prepareInstance,
   toDB,
   fromDB,
   operations as namedOperations, // alias to avoid conflict with default.operations
   Models, // Import the Models constant
} from "../index.js";
// D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend

const { ClientServerOperations, SessionOperations, UserOperations } = operations;

import modelsDefaultExport from "../index.js";

describe("Models and Operations Exports", () => {
   describe("Direct Named Exports", () => {
      // Test Models
      it("should export ClientServer model", () => {
         expect(ClientServer).toBeDefined();
      });
      it("should export Session model", () => {
         expect(Session).toBeDefined();
      });
      it("should export User model", () => {
         expect(User).toBeDefined();
      });
      it("should export Schema model", () => {
         expect(Schema).toBeDefined();
      });
      it("should export BaseModel", () => {
         expect(BaseModel).toBeDefined();
      });
      it("should export ValidationMixin", () => {
         expect(ValidationMixin).toBeDefined();
      });

      // Test Model-Specific Operations
      it("should export ClientServerOperations", () => {
         expect(ClientServerOperations).toBeDefined();
      });
      it("should export SessionOperations", () => {
         expect(SessionOperations).toBeDefined();
      });
      it("should export UserOperations", () => {
         expect(UserOperations).toBeDefined();
      });

      // Test Functional Utilities
      it("should export prepareInstance function", () => {
         expect(prepareInstance).toBeDefined();
         expect(typeof prepareInstance).toBe("function");
      });
      it("should export toDB function", () => {
         expect(toDB).toBeDefined();
         expect(typeof toDB).toBe("function");
      });
      it("should export fromDB function", () => {
         expect(fromDB).toBeDefined();
         expect(typeof fromDB).toBe("function");
      });

      // Test Aggregated Operations Object (named export)
      it("should export the 'operations' object (named export)", () => {
         expect(namedOperations).toBeDefined();
         expect(typeof namedOperations).toBe("object");
         expect(namedOperations.ClientServerOperations).toBeDefined();
         expect(namedOperations.SessionOperations).toBeDefined();
         expect(namedOperations.UserOperations).toBeDefined();
      });
   });

   describe("Default Export", () => {
      it("should have ClientServer model in default export", () => {
         expect(modelsDefaultExport.ClientServer).toBeDefined();
      });
      it("should have Session model in default export", () => {
         expect(modelsDefaultExport.Session).toBeDefined();
      });
      it("should have User model in default export", () => {
         expect(modelsDefaultExport.User).toBeDefined();
      });
      it("should have Schema model in default export", () => {
         expect(modelsDefaultExport.Schema).toBeDefined();
      });
      it("should have BaseModel in default export", () => {
         expect(modelsDefaultExport.BaseModel).toBeDefined();
      });
      it("should have ValidationMixin in default export", () => {
         expect(modelsDefaultExport.ValidationMixin).toBeDefined();
      });

      // Test operations object within default export
      it("should have 'operations' object in default export", () => {
         expect(modelsDefaultExport.operations).toBeDefined();
         expect(typeof modelsDefaultExport.operations).toBe("object");
         expect(
            modelsDefaultExport.operations.ClientServerOperations
         ).toBeDefined();
         expect(modelsDefaultExport.operations.SessionOperations).toBeDefined();
         expect(modelsDefaultExport.operations.UserOperations).toBeDefined();
      });

      // Test functional utilities in default export
      it("should have prepareInstance in default export", () => {
         expect(modelsDefaultExport.prepareInstance).toBeDefined();
         expect(typeof modelsDefaultExport.prepareInstance).toBe("function");
      });
      it("should have toDB in default export", () => {
         expect(modelsDefaultExport.toDB).toBeDefined();
         expect(typeof modelsDefaultExport.toDB).toBe("function");
      });
      it("should have fromDB in default export", () => {
         expect(modelsDefaultExport.fromDB).toBeDefined();
         expect(typeof modelsDefaultExport.fromDB).toBe("function");
      });
   });

   describe("Models Constant Export", () => {
      it("should export Models constant with all models", () => {
         expect(Models).toBeDefined(); // Use the directly imported Models
         expect(Models.ClientServer).toBeDefined();
         expect(Models.Session).toBeDefined();
         expect(Models.User).toBeDefined();
         expect(Models.Schema).toBeDefined();
      });
   });
});
