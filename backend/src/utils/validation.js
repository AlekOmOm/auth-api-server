// utils/validation.js (Conceptual example with express-validator)
import { body, validationResult } from "express-validator";
import * as rules from "./validationRules.js";

/*
 * register
 * - validate register details
 * - trim whitespace
 * - not empty
 * - max length 50
 * - escape
 * - is email
 * - normalize email
 * - password min length
 *
 * tldr:
 * - body
 * - validationResult
 * - if errors, return 400
 * - next
 */
const register = [
   body("name")
      .trim()
      .notEmpty()
      .withMessage(rules.ERROR_MESSAGES.USER.FIELD_REQUIRED("Name"))
      .isLength({ max: rules.NAME_RULES.MAX_LENGTH }) // set max length
      .withMessage(rules.ERROR_MESSAGES.NAME.MAX_LENGTH_ERROR)
      .escape(), // <-- Sanitize by escaping HTML chars
   body("email")
      .trim()
      .notEmpty()
      .withMessage(rules.ERROR_MESSAGES.USER.FIELD_REQUIRED("Email"))
      .isEmail()
      .withMessage(rules.ERROR_MESSAGES.EMAIL.INVALID_EMAIL) // Use the corrected message key
      .normalizeEmail(), // <-- Sanitizer specific to emails
   body("password")
      .trim()
      .notEmpty()
      .withMessage(rules.ERROR_MESSAGES.USER.FIELD_REQUIRED("Password"))
      .isLength({
         min: rules.PASSWORD_RULES.MIN_LENGTH,
         max: rules.PASSWORD_RULES.MAX_LENGTH,
      })
      .withMessage(rules.ERROR_MESSAGES.PASSWORD.WEAK_PASSWORD)
      .isStrongPassword({
         minLength: rules.PASSWORD_RULES.MIN_LENGTH,
         minLowercase: 1,
         minUppercase: 1,
         minNumbers: 1,
         minSymbols: 1,
      })
      .withMessage(rules.ERROR_MESSAGES.PASSWORD.WEAK_PASSWORD),
   // Add validation for userType
   body("userType")
      .optional()
      .isIn(["auth", "client"])
      .withMessage("User type must be either 'auth' or 'client'"),

   (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
      }
      next();
   },
];

/*
 * login
 * - validate login details
 * - is email
 * - password min length
 */
const login = [
   body("credentials.email")
      .isEmail()
      .withMessage(rules.ERROR_MESSAGES.USER.INVALID_EMAIL),
   body("credentials.password")
      .isLength({ min: rules.MIN_PASSWORD_LENGTH })
      .withMessage(rules.ERROR_MESSAGES.USER.INVALID_PASSWORD),
   // Allow returnUrl to pass through without validation
   body("returnUrl").optional(),

   (req, res, next) => {
      console.log(
         "[LOGIN_VALIDATION]",
         JSON.stringify({
            body: req.body,
            path: req.path,
         })
      );
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         console.error(
            "[LOGIN_VALIDATION_ERROR]",
            JSON.stringify({
               body: req.body,
               errors: errors.array(),
            })
         );
         return res.status(400).json({ errors: errors.array() });
      }
      next();
   },
];

/*
 * logout
 * - validate logout details
 * - is email
 * - password min length
 */
const logout = [
   body("email").isEmail().withMessage(rules.ERROR_MESSAGES.USER.INVALID_EMAIL),
   body("password")
      .isLength({ min: rules.MIN_PASSWORD_LENGTH })
      .withMessage(rules.ERROR_MESSAGES.USER.INVALID_PASSWORD),
];

// --- export ---
export default {
   register,
   login,
   logout,
};
