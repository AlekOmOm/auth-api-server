/**
 * User Queries
 *
 */

export const create = `
   INSERT INTO users (id, name, role, email, password_hash)
   VALUES ($1, $2, $3, $4, $5)
   RETURNING *;
`;

export const createUsers = (users) => {
   return users.map((user) => create(user)).join(";");
};

export const get = `
   SELECT * FROM users WHERE id = $1;
`;

export const getAll = `
   SELECT * FROM users;
`;

export const getByEmail = `
   SELECT * FROM users WHERE email = $1;
`;

export const update = `
  UPDATE users SET name = $1, role = $2, email = $3, password_hash = $4, updated_at = NOW()
  WHERE id = $5::uuid RETURNING *;
`;

export const deleteByID = `
   DELETE FROM users WHERE id = $1::uuid;
`;

export const deleteAll = `
   DELETE FROM users;
`;

export const USER = {
   create,
   createUsers,
   get,
   getAll,
   getByEmail,
   update,
   deleteByID,
   deleteAll,
};
