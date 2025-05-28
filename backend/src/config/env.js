// auth-system_NodeJS\backend\src\config\env.js

/**
 * loads and provisions env variables from '../.env' (auth-system_NodeJS/.env)
 *
 * @description
 * - config for backend
 * - postgres
 * - schemas
 */
import dotenv from "dotenv";
import paths from "./paths.js";

dotenv.config({ path: paths.ENV_PATH });

const ENV = {
   NODE_ENV: process.env.NODE_ENV,
   IN_DOCKER: false,
};

ENV.IN_DOCKER = ENV.NODE_ENV === "production";

const FRONTEND = {
   PORT: process.env.DEV_FRONTEND_PORT,
   HOST: process.env.DEV_FRONTEND_HOST,
};

const BACKEND = {
   PORT: process.env.DEV_BACKEND_PORT,
   HOST: process.env.DEV_BACKEND_HOST,
   CONFIG: {
      RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
      RATE_LIMIT_LIMIT: process.env.RATE_LIMIT_LIMIT,
      ALLOWED_CLIENT_ORIGINS: process.env.ALLOWED_CLIENT_ORIGINS,
      SESSION_SECRET: process.env.SECRET_KEY,
   },
};

const POSTGRES = {
   HOST: process.env.POSTGRES_HOST,
   PORT: Number(process.env.POSTGRES_PORT),
   USER: process.env.POSTGRES_USER,
   PASSWORD: process.env.POSTGRES_PASSWORD,
   DATABASE: process.env.POSTGRES_DB,
};

const SCHEMAS = {
   AUTH_NAME: "auth_internal",
   TEMPLATE_NAME: "client_template",
   SEED_SCHEMA: process.env.SEED_SCHEMA,
};

const config = {
   FRONTEND,
   BACKEND,
   POSTGRES,
   SCHEMAS,
};

export default config;
