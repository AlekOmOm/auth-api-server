import express from "express";
const router = express.Router();
// layers
import { isAuthenticated, isAdminOrOwner } from "../middleware/auth.js";
import * as controller from "../controllers/schema.js";
import * as service from "../services/schema.js";
import { Schema } from "../models/index.js";

// routes
router.get("/", isAuthenticated, isAdminOrOwner, controller.listSchemas);
router.post("/", isAuthenticated, isAdminOrOwner, controller.createSchema);
router.put("/:schemaId", isAuthenticated, isAdminOrOwner, controller.updateSchema);
router.delete("/:schemaId", isAuthenticated, isAdminOrOwner, controller.deleteSchema);

export default router;
