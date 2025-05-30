// enum of table names
const TABLES = {
   client_server: "client_servers",
   user: "users",
   session: "sessions",
};

const get = (tableName) => {
   if (!TABLES[tableName]) {
      throw new Error(`Table ${tableName} not found`);
   }
   return TABLES[tableName];
};

export default { get };
