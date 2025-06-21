console.log(
   "[SERVER_JS_LOAD_CONFIRMATION_V2] Backend starting at: " +
      new Date().toISOString()
); // NEW DISTINCT LOG

import express from "express";
const app = express();
import config from "./src/config/env.js";

// --- environment variables ---
const BACKEND = config.BACKEND;

const PORT = BACKEND.PORT || 3001;
const FRONTEND_PORT = BACKEND.FRONTEND_PORT || 3000;
const SESSION_SECRET = BACKEND.SESSION_SECRET;
const RATE_LIMIT_WINDOW = BACKEND.RATE_LIMIT_WINDOW || 15;
const RATE_LIMIT_LIMIT = BACKEND.RATE_LIMIT_LIMIT || 3000;
const ALLOWED_CLIENT_ORIGINS =
   config.ALLOWED_CLIENT_ORIGINS ||
   "http://localhost:5173,http://localhost:5174,http://localhost:4173";

// --- middleware ---
/*
 * - express
 * - dotenv
 * - json
 * - cors
 * - session
 * - rate limit
 */

app.use(express.json());

/*
 * cors
 * - set origin to allow multiple frontends (Auth-server frontend + client applications)
 * - set credentials to true
 */
import cors from "cors";

// Define allowed origins for CORS
const allowedOrigins = [
   `http://localhost:${FRONTEND_PORT}`, // Auth-server frontend (default: 3000)
   "http://localhost:3000", // Auth-server frontend (fallback)
   ...ALLOWED_CLIENT_ORIGINS.split(",").map((origin) => origin.trim()), // Client applications from env
];

app.use(
   cors({
      origin: function (origin, callback) {
         // Allow requests with no origin (like mobile apps or curl requests)
         if (!origin) return callback(null, true);

         if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
         } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error("Not allowed by CORS"));
         }
      },
      credentials: true,
   })
);

/*
 * session
 * - set secret to session secret
 * - set resave to false
 * - set saveUninitialized to false
 * - configure for cross-domain client applications
 */
import session from "express-session";

// Determine if we're in production
const isProduction = process.env.NODE_ENV === "production";

app.use(
   session({
      secret: "" + SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
         sameSite: "lax",
         secure: false, // http only (true in production)
         maxAge: 1000 * 60 * 60 * 24, // 1 day
         httpOnly: true, // Prevent XSS attacks
         domain: undefined, // Allow cookies to work across different ports on localhost
      },
      name: "auth-system.sid", // Custom session name to avoid conflicts
   })
);

/*
 * rate limit
 * - set window to rate limit window
 * - set limit to rate limit limit
 */
import { rateLimit } from "express-rate-limit";
const generalLimiter = rateLimit({
   windowMs: RATE_LIMIT_WINDOW * 60 * 1000, // 15 minutes
   limit: RATE_LIMIT_LIMIT, // 300 requests per window
   standardHeaders: "draft-8", // RateLimit headers
   legacyHeaders: false, // X-RateLimit headers
});
app.use(generalLimiter);

// --- custom middleware ---

/** --------- routes ---------
 * @name: routes
 * @description: routes for the api
 * @routes:
 *  - auth routes (user)
 *    - login / register / logout
 *  - account routes (logged-in user)
 *    - get account
 *    - update account
 *    - delete account
 *  - user routes (admin)
 *    - get user
 *    - get users
 *    - create user
 *    - update user
 *    - delete user
 *
 * @endpoints role: user
 *  - POST /api/auth/login
 *  - POST /api/auth/register
 *  - POST /api/auth/logout
 *
 * @endpoints role: logged-in user
 *  - GET /api/account/
 *  - POST /api/account/
 *  - PUT /api/account/
 *  - DELETE /api/account/
 *
 * @endpoints role: admin
 *  - GET /api/users/user
 *  - GET /api/users/users
 *  - POST /api/users/user
 *  - PUT /api/users/user
 *  - DELETE /api/users/user
 */

// --- routes ---

// Health check endpoint
app.get("/api/health", (req, res) => {
   res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

/** * Schema detection middleware - detects client schema from URL/token */
import { detectSchema } from "./src/middleware/detection.js";
app.use(detectSchema);
/** * clientServer - for host-application to connect to auth-system */
import clientServerRoute from "./src/routes/clientServer.js";
app.use("/api/clientServer", clientServerRoute);

import authRoute from "./src/routes/auth.js";
app.use("/api/auth", authRoute);

import userRoute from "./src/routes/user.js";
app.use("/api/users", userRoute);

/** * owner - for client server owners to manage their applications and users */
import ownerRoute from "./src/routes/owner.js";
app.use("/api/owner", ownerRoute);

/** * schema - for managing schemas/tenants */
import schemaRoute from "./src/routes/schema.js";
app.use("/api/schema", schemaRoute);

// --- Global Error Handler ---
// This MUST be the last piece of middleware added.
import { errorHandler } from "./src/middleware/errorHandler.js";
app.use(errorHandler);

app.listen(PORT, () => {
   // For production logging
   console.info(`Server running on port ${PORT}`);
});
