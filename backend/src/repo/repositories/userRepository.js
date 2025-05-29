// CRUD operations for users table (Postgres multi-tenant)

import { User } from "../../models/models.js";
import * as queries from "../connection/queries/queries.js";
import getPool from "../connection/pools/auth.js";


const createUser = async (user) => {
   const pool = await getPool();
   try {
      const { rows } = await pool.query(queries.createUser, [
         user.id,
         user.name,
         user.role,
         user.email,
         user.password_hash,
      ]);
      return rows[0];
   } finally {
      client.release();
   }
};

// Batch insert helper
const createUsers = async (users) => {
   const created = [];
   for (const u of users) {
      const res = await createUser(u);
      created.push(res);
   }
   return created;
};

const getUsers = async () => {
   const pool = await getPool();
   try {
      const { rows } = await pool.query(queries.getUsers);
      return rows;
   } finally {
      client.release();
   }
};

const getUser = async (id) => {
   const pool = await getPool();
   try {
      const { rows } = await pool.query(queries.getUserById, [id]);
      return rows[0];
   } finally {
      client.release();
   }
};

const getUserByEmail = async (email) => {
   const pool = await getPool();
   try {
      const { rows } = await pool.query(queries.getUserByEmail, [email]);
      return rows[0];
   } finally {
      client.release();
   }
};

const getUserByEmailAndPassword = async (email, password) => {
   const pool = await getPool();
   try {
      const { rows } = await pool.query(queries.getUserByEmailAndPassword, [
         email,
         password,
      ]);
      return rows[0];
   } finally {
      client.release();
   }
};
const updateUser = async ({ id, name, role, email, password_hash }) => {
   const pool = await getPool();
   try {
      const { rows } = await pool.query(queries.updateUser, [
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

const deleteUser = async (id) => {
   const pool = await getPool();
   try {
      await pool.query(queries.deleteUser, [id]);
   } finally {
      client.release();
   }
};

export {
   createUser,
   createUsers,
   getUsers,
   getUser,
   getUserByEmail,
   updateUser,
   deleteUser,
};
