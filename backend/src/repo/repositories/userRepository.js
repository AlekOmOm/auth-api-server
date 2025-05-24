// CRUD operations for users table (Postgres multi-tenant)

import * as queries from "../connection/queries.js";

// Note: Every function receives a `schema` arg so the caller decides which
// tenant DB it wants to operate on. This keeps the repo thin & generic.

const createUser = async (
   pool,
   schemaName,
   { id, name, role, email, password_hash }
) => {
   const client = await pool.connect();
   try {
      await client.query(`SET search_path TO ${schemaName}, public;`);
      const { rows } = await client.query(queries.createUser, [
         id,
         name,
         role,
         email,
         password_hash,
      ]);
      return rows[0];
   } finally {
      client.release();
   }
};

// Batch insert helper
const createUsers = async (pool, schemaName, users) => {
   const created = [];
   // It's more efficient to do this on a single client if possible,
   // but for simplicity and to ensure search_path is set for each createUser call in this structure:
   for (const u of users) {
      // Pass schemaName to createUser
      const res = await createUser(pool, schemaName, u);
      created.push(res);
   }
   return created;
};

const getUsers = async (pool, schemaName) => {
   const client = await pool.connect();
   try {
      await client.query(`SET search_path TO ${schemaName}, public;`);
      const { rows } = await client.query(queries.getUsers);
      return rows;
   } finally {
      client.release();
   }
};

const getUser = async (pool, schemaName, id) => {
   const client = await pool.connect();
   try {
      await client.query(`SET search_path TO ${schemaName}, public;`);
      const { rows } = await client.query(queries.getUserById, [id]);
      return rows[0];
   } finally {
      client.release();
   }
};

const updateUser = async (
   pool,
   schemaName,
   { id, name, role, email, password_hash }
) => {
   const client = await pool.connect();
   try {
      await client.query(`SET search_path TO ${schemaName}, public;`);
      const { rows } = await client.query(queries.updateUser, [
         name,
         role,
         email,
         password_hash,
         id,
      ]);
      return rows[0];
   } finally {
      client.release();
   }
};

const deleteUser = async (pool, schemaName, id) => {
   const client = await pool.connect();
   try {
      await client.query(`SET search_path TO ${schemaName}, public;`);
      await client.query(queries.deleteUser, [id]);
   } finally {
      client.release();
   }
};

export { createUser, createUsers, getUsers, getUser, updateUser, deleteUser };
