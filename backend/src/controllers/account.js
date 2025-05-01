// --- services ---
// import {
//   getAccount,
//   updateAccount,
//   deleteAccount,
// } from "../services/accountService.js"; // Old import removed
import * as accountService from "../services/accountService.js"; // New namespace import

// --- utils ---

// --- Account controller ---
/*
   - get account
   - update account
   - delete account
*/

// Renamed controller function to avoid conflict with service import
// Added async, try/catch, next(error), await service call
const getAccount = async (req, res, next) => {
  try {
    // Assuming service needs req (e.g., for user ID from session) or specific params
    const result = await accountService.getAccount(req, res, next); // Adjust params as needed by service
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Renamed controller function to avoid conflict with service import
// Added async, try/catch, next(error), await service call
const updateAccount = async (req, res, next) => {
  try {
    // Assuming service needs req (e.g., for user ID and body)
    const result = await accountService.updateAccount(req, res, next); // Adjust params as needed by service
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Renamed controller function to avoid conflict with service import
// Added async, try/catch, next(error), await service call
const deleteAccount = async (req, res, next) => {
  try {
    // Assuming service needs req (e.g., for user ID)
    const result = await accountService.deleteAccount(req, res, next); // Adjust params as needed by service
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// --- export ---
// Export the controller functions
export { getAccount, updateAccount, deleteAccount };
