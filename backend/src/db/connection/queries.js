// ----- DML QUERIES FOR POSTGRES (multi-tenant) -----

// Client Servers
export const createClientServer = `
  INSERT INTO client_servers (client_id, client_secret_hash, app_name, assigned_schema_name, allowed_return_urls, user_id, client_mode)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING *;
`;

export const getClientServer = `
  SELECT * FROM client_servers WHERE client_id = $1;
`;

export const getClientServerByClientSecretHash = `
  SELECT * FROM client_servers WHERE client_secret_hash = $1;
`;

export const updateClientServer = `
  UPDATE client_servers SET client_secret_hash = $2, app_name = $3, assigned_schema_name = $4, allowed_return_urls = $5, client_mode = $6
  WHERE client_id = $1 RETURNING *;
`;

export const deleteClientServer = `
  DELETE FROM client_servers WHERE client_id = $1;
`;

// User-specific client server queries
export const getClientServersByUserId = `
  SELECT * FROM client_servers WHERE user_id = $1 ORDER BY created_at DESC;
`;

export const getClientServerByUserIdAndClientId = `
  SELECT * FROM client_servers WHERE user_id = $1 AND client_id = $2;
`;

export const deleteClientServerByUserIdAndClientId = `
  DELETE FROM client_servers WHERE user_id = $1 AND client_id = $2 RETURNING *;
`;

// Users
export const createUser = `
  INSERT INTO users (id, name, role, email, password_hash) VALUES ($1, $2, $3, $4, $5)
  RETURNING *;
`;
export const createUsers = (users) => {
   return users.map((user) => createUser(user)).join(";");
};

export const getUsers = `SELECT * FROM users;`;
export const getUserById = `SELECT * FROM users WHERE id = $1::uuid;`;
export const getUserByEmail = `SELECT * FROM users WHERE email = $1;`;
export const updateUser = `
  UPDATE users SET name = $1, role = $2, email = $3, password_hash = $4, updated_at = NOW()
  WHERE id = $5::uuid RETURNING *;
`;
export const deleteUser = `DELETE FROM users WHERE id = $1::uuid;`;

// Sessions
export const createSession = `
  INSERT INTO sessions (id, user_id, session_id, ip_address, user_agent, expires_at)
  VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
  RETURNING *;
`;
export const getSessions = `SELECT * FROM sessions;`;
export const getSession = `SELECT * FROM sessions WHERE session_id = $1::uuid;`;
export const getSessionByUserId = `SELECT * FROM sessions WHERE user_id = $1::uuid;`;
export const deleteSessionByUserId = `DELETE FROM sessions WHERE user_id = $1::uuid;`;
export const deleteSessionBySessionId = `DELETE FROM sessions WHERE session_id = $1::uuid;`;

export const getSessionBySessionId = `
  SELECT * FROM sessions WHERE session_id = $1 AND (expires_at IS NULL OR expires_at > NOW());
`;

export const deleteSession = `
  DELETE FROM sessions WHERE session_id = $1;
`;

export const deleteExpiredSessions = `
  DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at <= NOW();
`;
