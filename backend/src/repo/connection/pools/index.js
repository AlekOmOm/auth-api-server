import getPool from "./auth.js";
import getPoolForSchema from "./clientServers.js";

const get = (schema) => {
   // console.log(
   //    `[Pool Debug] Requested schema: "${schema}" (type: ${typeof schema})`
   // );
   const useAuthPool = schema === "auth_internal";
   // console.log(`[Pool Debug] Using auth pool: ${useAuthPool}`);
   return useAuthPool ? getPool() : getPoolForSchema(schema);
};

export default get;
