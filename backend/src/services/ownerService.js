/**
 * Owner Service
 *
 * Business logic for client server owners to manage their applications,
 * users, and view analytics.
 */

import * as clientServersRepo from "../repo/repositories/clientServersRepository.js";
import * as userRepo from "../repo/repositories/userRepository.js";
import {
   getUserRole,
   isSystemAdmin,
   isClientOwner,
} from "../middleware/schemaDetection.js";
import getPool from "../repo/connection/pools/auth.js";
import getPoolForSchema from "../repo/connection/pools/clientServers.js";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

/**
 * Verify that user owns the specified client server
 * @param {Object} req - Express request object
 * @param {string} clientId - Client server ID
 * @returns {Object} Client server data if owned
 * @throws {Error} If not owned or not found
 */
async function verifyClientOwnership(req, clientId) {
   const userRole = getUserRole(req);
   const userId = req.session?.userId;

   if (!userId) {
      throw new Error("Authentication required");
   }

   // System admins can access any client server
   if (isSystemAdmin(req)) {
      const authPool = await getPool();
      const { rows } = await authPool.query(
         "SELECT * FROM client_servers WHERE client_id = $1",
         [clientId]
      );

      if (rows.length === 0) {
         throw new Error("Client server not found");
      }

      return rows[0];
   }

   // Client owners can only access their own client servers
   if (isClientOwner(req)) {
      const authPool = await getPool();
      const { rows } = await authPool.query(
         "SELECT * FROM client_servers WHERE client_id = $1 AND user_id = $2",
         [clientId, userId]
      );

      if (rows.length === 0) {
         throw new Error("Client server not found or access denied");
      }

      return rows[0];
   }

   throw new Error("Owner or admin privileges required");
}

/**
 * Get owner statistics and analytics
 * @param {Object} req - Express request object
 * @returns {Object} Statistics data
 */
export async function getOwnerStatistics(req) {
   try {
      const userRole = getUserRole(req);
      const userId = req.session?.userId;
      const authPool = await getPool();

      let clientServersQuery;
      let queryParams;

      // System admins see all statistics
      if (isSystemAdmin(req)) {
         clientServersQuery = "SELECT * FROM client_servers";
         queryParams = [];
      } else if (isClientOwner(req)) {
         // Client owners see only their statistics
         clientServersQuery = "SELECT * FROM client_servers WHERE user_id = $1";
         queryParams = [userId];
      } else {
         throw new Error("Owner or admin privileges required");
      }

      // Get client servers
      const { rows: clientServers } = await authPool.query(
         clientServersQuery,
         queryParams
      );

      const stats = {
         totalClientServers: clientServers.length,
         totalUsers: 0,
         activeSessions: 0,
         monthlyLogins: 0,
         clientServerGrowth: 0,
         userGrowth: 0,
         sessionGrowth: 0,
         loginGrowth: 0,
         topClientServer: null,
         lastLogin: null,
         systemHealth: "Excellent",
      };

      if (clientServers.length === 0) {
         return stats;
      }

      // Calculate aggregate statistics across all client schemas
      let totalUsers = 0;
      let topClient = { name: "", users: 0 };
      let lastLoginTime = null;

      for (const clientServer of clientServers) {
         try {
            const clientPool = await getPoolForSchema(
               clientServer.assigned_schema_name
            );

            // Count users in this schema
            const { rows: userCount } = await clientPool.query(
               "SELECT COUNT(*) as count FROM users"
            );
            const schemaUsers = parseInt(userCount[0]?.count || 0);
            totalUsers += schemaUsers;

            // Track top client server
            if (schemaUsers > topClient.users) {
               topClient = {
                  name: clientServer.app_name,
                  users: schemaUsers,
               };
            }

            // Get latest login from this schema (if sessions table exists)
            try {
               const { rows: latestLogin } = await clientPool.query(
                  "SELECT created_at FROM sessions ORDER BY created_at DESC LIMIT 1"
               );

               if (latestLogin.length > 0) {
                  const loginTime = new Date(latestLogin[0].created_at);
                  if (!lastLoginTime || loginTime > lastLoginTime) {
                     lastLoginTime = loginTime;
                  }
               }
            } catch (sessionError) {
               // Sessions table might not exist in this schema, skip
               console.log(
                  `Sessions table not found in ${clientServer.assigned_schema_name}`
               );
            }

            // Count active sessions (if sessions table exists)
            try {
               const { rows: sessionCount } = await clientPool.query(
                  "SELECT COUNT(*) as count FROM sessions WHERE expires_at > NOW()"
               );
               stats.activeSessions += parseInt(sessionCount[0]?.count || 0);
            } catch (sessionError) {
               // Sessions table might not exist, skip
            }
         } catch (schemaError) {
            console.error(
               `Error accessing schema ${clientServer.assigned_schema_name}:`,
               schemaError
            );
            // Continue with other schemas
         }
      }

      stats.totalUsers = totalUsers;
      stats.topClientServer = topClient.users > 0 ? topClient : null;
      stats.lastLogin = lastLoginTime ? lastLoginTime.toISOString() : null;

      // Calculate growth percentages (mock data for now)
      // In a real implementation, you'd compare with previous period data
      stats.clientServerGrowth = Math.random() * 20 - 5; // -5% to +15%
      stats.userGrowth = Math.random() * 25; // 0% to +25%
      stats.sessionGrowth = Math.random() * 10 - 2; // -2% to +8%
      stats.loginGrowth = Math.random() * 30; // 0% to +30%

      // Estimate monthly logins (mock calculation)
      stats.monthlyLogins = Math.floor(totalUsers * (2 + Math.random() * 3)); // 2-5x user count

      return stats;
   } catch (error) {
      console.error("Error getting owner statistics:", error);
      throw error;
   }
}

/**
 * Get all users in a specific client server schema
 * @param {Object} req - Express request object
 * @param {string} clientId - Client server ID
 * @returns {Array} Array of users
 */
export async function getClientUsers(req, clientId) {
   try {
      const clientServer = await verifyClientOwnership(req, clientId);
      const clientPool = await getPoolForSchema(
         clientServer.assigned_schema_name
      );

      const { rows: users } = await clientPool.query(
         "SELECT user_id, name, email, role, created_at FROM users ORDER BY created_at DESC"
      );

      return users;
   } catch (error) {
      console.error("Error getting client users:", error);
      throw error;
   }
}

/**
 * Get a specific user in a client server schema
 * @param {Object} req - Express request object
 * @param {string} clientId - Client server ID
 * @param {string} userId - User ID
 * @returns {Object} User data
 */
export async function getClientUser(req, clientId, userId) {
   try {
      const clientServer = await verifyClientOwnership(req, clientId);
      const clientPool = await getPoolForSchema(
         clientServer.assigned_schema_name
      );

      const { rows: users } = await clientPool.query(
         "SELECT user_id, name, email, role, created_at FROM users WHERE user_id = $1",
         [userId]
      );

      if (users.length === 0) {
         throw new Error("User not found");
      }

      return users[0];
   } catch (error) {
      console.error("Error getting client user:", error);
      throw error;
   }
}

/**
 * Create a new user in a specific client server schema
 * @param {Object} req - Express request object
 * @param {string} clientId - Client server ID
 * @param {Object} userData - User data
 * @returns {Object} Created user data
 */
export async function createClientUser(req, clientId, userData) {
   try {
      const { name, email, password, role = "user" } = userData;

      // Validate required fields
      if (!name || !email || !password) {
         throw new Error("Name, email, and password are required");
      }

      // Validate role
      if (!["user", "admin"].includes(role)) {
         throw new Error('Role must be either "user" or "admin"');
      }

      const clientServer = await verifyClientOwnership(req, clientId);
      const clientPool = await getPoolForSchema(
         clientServer.assigned_schema_name
      );

      // Check if email already exists in this schema
      const { rows: existingUsers } = await clientPool.query(
         "SELECT user_id FROM users WHERE email = $1",
         [email]
      );

      if (existingUsers.length > 0) {
         throw new Error("Email already exists in this client server");
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      const userId = uuidv4();

      // Create user
      const { rows: newUsers } = await clientPool.query(
         "INSERT INTO users (user_id, name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING user_id, name, email, role, created_at",
         [userId, name, email, passwordHash, role]
      );

      return newUsers[0];
   } catch (error) {
      console.error("Error creating client user:", error);
      throw error;
   }
}

/**
 * Update a user in a specific client server schema
 * @param {Object} req - Express request object
 * @param {string} clientId - Client server ID
 * @param {string} userId - User ID
 * @param {Object} updateData - Update data
 * @returns {Object} Updated user data
 */
export async function updateClientUser(req, clientId, userId, updateData) {
   try {
      const { name, email, password, role } = updateData;

      const clientServer = await verifyClientOwnership(req, clientId);
      const clientPool = await getPoolForSchema(
         clientServer.assigned_schema_name
      );

      // Check if user exists
      const { rows: existingUsers } = await clientPool.query(
         "SELECT user_id, email FROM users WHERE user_id = $1",
         [userId]
      );

      if (existingUsers.length === 0) {
         throw new Error("User not found");
      }

      const existingUser = existingUsers[0];

      // Check if email is being changed and if it conflicts
      if (email && email !== existingUser.email) {
         const { rows: emailConflict } = await clientPool.query(
            "SELECT user_id FROM users WHERE email = $1 AND user_id != $2",
            [email, userId]
         );

         if (emailConflict.length > 0) {
            throw new Error("Email already exists in this client server");
         }
      }

      // Validate role if provided
      if (role && !["user", "admin"].includes(role)) {
         throw new Error('Role must be either "user" or "admin"');
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (name) {
         updateFields.push(`name = $${paramIndex++}`);
         updateValues.push(name);
      }

      if (email) {
         updateFields.push(`email = $${paramIndex++}`);
         updateValues.push(email);
      }

      if (password) {
         const passwordHash = await bcrypt.hash(password, 12);
         updateFields.push(`password_hash = $${paramIndex++}`);
         updateValues.push(passwordHash);
      }

      if (role) {
         updateFields.push(`role = $${paramIndex++}`);
         updateValues.push(role);
      }

      if (updateFields.length === 0) {
         throw new Error("No valid fields to update");
      }

      // Add user_id for WHERE clause
      updateValues.push(userId);

      const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(", ")} 
      WHERE user_id = $${paramIndex} 
      RETURNING user_id, name, email, role, created_at
    `;

      const { rows: updatedUsers } = await clientPool.query(
         updateQuery,
         updateValues
      );

      return updatedUsers[0];
   } catch (error) {
      console.error("Error updating client user:", error);
      throw error;
   }
}

/**
 * Delete a user from a specific client server schema
 * @param {Object} req - Express request object
 * @param {string} clientId - Client server ID
 * @param {string} userId - User ID
 */
export async function deleteClientUser(req, clientId, userId) {
   try {
      const clientServer = await verifyClientOwnership(req, clientId);
      const clientPool = await getPoolForSchema(
         clientServer.assigned_schema_name
      );

      // Check if user exists
      const { rows: existingUsers } = await clientPool.query(
         "SELECT user_id FROM users WHERE user_id = $1",
         [userId]
      );

      if (existingUsers.length === 0) {
         throw new Error("User not found");
      }

      // Delete user sessions first (if sessions table exists)
      try {
         await clientPool.query("DELETE FROM sessions WHERE user_id = $1", [
            userId,
         ]);
      } catch (sessionError) {
         // Sessions table might not exist, continue
         console.log(
            `Sessions table not found in ${clientServer.assigned_schema_name}`
         );
      }

      // Delete user
      await clientPool.query("DELETE FROM users WHERE user_id = $1", [userId]);
   } catch (error) {
      console.error("Error deleting client user:", error);
      throw error;
   }
}

/**
 * Get analytics for a specific client server
 * @param {Object} req - Express request object
 * @param {string} clientId - Client server ID
 * @returns {Object} Analytics data
 */
export async function getClientAnalytics(req, clientId) {
   try {
      const clientServer = await verifyClientOwnership(req, clientId);
      const clientPool = await getPoolForSchema(
         clientServer.assigned_schema_name
      );

      const analytics = {
         clientServer: {
            client_id: clientServer.client_id,
            app_name: clientServer.app_name,
            schema_name: clientServer.assigned_schema_name,
            created_at: clientServer.created_at,
         },
         users: {
            total: 0,
            byRole: {
               admin: 0,
               user: 0,
            },
            recentRegistrations: [],
         },
         sessions: {
            active: 0,
            total: 0,
         },
      };

      // Get user statistics
      const { rows: userStats } = await clientPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count
      FROM users
    `);

      if (userStats.length > 0) {
         analytics.users.total = parseInt(userStats[0].total);
         analytics.users.byRole.admin = parseInt(userStats[0].admin_count);
         analytics.users.byRole.user = parseInt(userStats[0].user_count);
      }

      // Get recent registrations
      const { rows: recentUsers } = await clientPool.query(`
      SELECT name, email, role, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
      analytics.users.recentRegistrations = recentUsers;

      // Get session statistics (if sessions table exists)
      try {
         const { rows: sessionStats } = await clientPool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active
        FROM sessions
      `);

         if (sessionStats.length > 0) {
            analytics.sessions.total = parseInt(sessionStats[0].total);
            analytics.sessions.active = parseInt(sessionStats[0].active);
         }
      } catch (sessionError) {
         // Sessions table might not exist
         console.log(
            `Sessions table not found in ${clientServer.assigned_schema_name}`
         );
      }

      return analytics;
   } catch (error) {
      console.error("Error getting client analytics:", error);
      throw error;
   }
}
