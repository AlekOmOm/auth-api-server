/**
 * User Queries
 *
 */

export const createUser = `
   INSERT INTO users (id, name, role, email, password_hash)
   VALUES ($1, $2, $3, $4, $5)
   RETURNING *;
`;

export const createUsers = (users) => {
   return users.map((user) => createUser(user)).join(";");
};

export const getUser = `
   SELECT * FROM users WHERE id = $1;
`;

export const getUsers = `
   SELECT * FROM users;
`;

export const getUserByEmail = `
   SELECT * FROM users WHERE email = $1;
`;
export const updateUser = `
  UPDATE users SET name = $1, role = $2, email = $3, password_hash = $4, updated_at = NOW()
  WHERE id = $5::uuid RETURNING *;
`;
export const deleteUser = `
   DELETE FROM users WHERE id = $1::uuid;
`;

export const deleteUsers = `
   DELETE FROM users;
`;
