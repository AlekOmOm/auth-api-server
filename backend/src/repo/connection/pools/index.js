import getPool from "./auth";
import getPoolForSchema from "./clientServers";
import getTable from "../TABLES";

const get = (schema) => {
   return schema === "auth_internal" ? getPool() : getPoolForSchema(schema);
};

export default get;
