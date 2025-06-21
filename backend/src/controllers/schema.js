import * as service from "../services/schema.js";
import { standardizeResponse } from "../utils/responseUtils.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import { ValidationError } from "../utils/customErrors.js";

const listSchemasController = async (req, res, next) => {
   const serviceResult = await service.listSchemas();
   res.status(200).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

const createSchemaController = async (req, res, next) => {
   if (!req.body || Object.keys(req.body).length === 0) {
      throw new ValidationError(
         "Request body is required for schema creation."
      );
   }
   const serviceResult = await service.createSchema(req.body);
   res.status(201).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

const updateSchemaController = async (req, res, next) => {
   const schemaId = req.params.schemaId;
   if (!schemaId) {
      throw new ValidationError("Schema ID parameter is required.");
   }
   if (!req.body || Object.keys(req.body).length === 0) {
      throw new ValidationError("Request body is required for schema update.");
   }
   const serviceResult = await service.updateSchema(schemaId, req.body);
   res.status(200).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

const deleteSchemaController = async (req, res, next) => {
   const schemaId = req.params.schemaId;
   if (!schemaId) {
      throw new ValidationError("Schema ID parameter is required.");
   }
   const serviceResult = await service.deleteSchema(schemaId);
   res.status(200).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

export const listSchemas = asyncErrorHandler(listSchemasController);
export const createSchema = asyncErrorHandler(createSchemaController);
export const updateSchema = asyncErrorHandler(updateSchemaController);
export const deleteSchema = asyncErrorHandler(deleteSchemaController);
