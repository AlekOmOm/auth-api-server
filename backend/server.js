import express from "express";
const app = express();
import config from "./src/utils/config.js";

// --- environment variables ---
const PORT = process.env.BACKEND_PORT || 3001;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET;
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || 15;
const RATE_LIMIT_LIMIT = process.env.RATE_LIMIT_LIMIT || 300;
const ALLOWED_CLIENT_ORIGINS =
   process.env.ALLOWED_CLIENT_ORIGINS ||
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
 */
import session from "express-session";
app.use(
   session({
      secret: "" + SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
         sameSite: "lax", // allow same origin different subdomains (fx. trade.devalek.dev and devalek.dev)
         secure: false, // https only (true in production)
         maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
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

/** * Schema detection middleware - detects client schema from URL/token */
import { detectSchema } from "./src/middleware/schemaDetection.js";
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

app.listen(PORT, () => {
   // For production logging
   console.info(`Server running on port ${PORT}`);
});
