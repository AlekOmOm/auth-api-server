import dotenv from "dotenv";
import paths from "./paths.js";

dotenv.config({ path: paths.ENV_PATH });

const postgres = {
   host: process.env.POSTGRES_HOST,
   port: Number(process.env.POSTGRES_PORT),
   user: process.env.POSTGRES_USER,
   password: process.env.POSTGRES_PASSWORD,
   database: process.env.POSTGRES_DB,
};

const schemas = {
   auth: "auth_internal",
   template: "client_template",
};

const config = {
   // other than postgres
   postgres,
   schemas,
};

export default config;
