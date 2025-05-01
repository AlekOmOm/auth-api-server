import { Router } from "express";

const router = Router();

// --- middleware ---
import { isAuthenticated } from "../middleware/auth.js";

// --- controller ---
import {
  getAccount,
  updateAccount,
  deleteAccount,
} from "../controllers/account.js";

// --- routes ---
/*
   - get account
   - update account
   - delete account
*/

router.use(isAuthenticated);

/**
 * @name: get account
 * @description: get the account of the logged in user
 * @route: GET /api/account/
 * @access: logged-in user
 */
router.get("/", getAccount);

/**
 * @name: update account
 * @description: update the account of the logged in user
 * @route: PUT /api/account/
 * @access: logged-in user
 */
router.put("/", updateAccount);

/**
 * @name: delete account
 * @description: delete the account of the logged in user
 * @route: DELETE /api/account/
 * @access: logged-in user
 */
router.delete("/", deleteAccount);

// --- export ---
export default router;
