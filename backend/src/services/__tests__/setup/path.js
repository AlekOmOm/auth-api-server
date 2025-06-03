import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const servicePath = path.resolve(__dirname, "../../services");

const serviceFiles = {
   auth: path.resolve(servicePath, "auth.js"),  
   user: path.resolve(servicePath, "user.js"),
   clientServer: path.resolve(servicePath, "clientServer.js"),
   session: path.resolve(servicePath, "session.js"),
};

export default serviceFiles;
