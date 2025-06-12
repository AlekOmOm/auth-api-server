import getPool from "./src/repo/connection/pools/index.js";

async function seedAuthFrontendClient() {
   const pool = await getPool("auth_internal");

   try {
      console.log("Seeding auth system frontend client...");

      const query = `
         INSERT INTO auth_internal.client_servers (
            client_id,
            client_secret_hash,
            app_name,
            assigned_schema_name,
            identifier_url,
            entry_point_url,
            authorized_urls,
            user_id,
            client_mode,
            created_at,
            updated_at
         )
         VALUES (
            'auth-system-frontend',
            '$2b$10$dummy.hash.not.used.for.auth.system.frontend',
            'Auth System Frontend',
            'auth_internal',
            'http://localhost:3000/',
            'http://localhost:3000/',
            ARRAY['http://localhost:3000/', 'http://localhost:3000', 'http://localhost:3000/*'],
            NULL,
            'frontend-login-proxy',
            NOW(),
            NOW()
         )
         ON CONFLICT (client_id) DO UPDATE SET
            app_name = EXCLUDED.app_name,
            identifier_url = EXCLUDED.identifier_url,
            entry_point_url = EXCLUDED.entry_point_url,
            authorized_urls = EXCLUDED.authorized_urls,
            updated_at = NOW()
      `;

      await pool.query(query);
      console.log("✓ Auth system frontend client seeded successfully!");

      process.exit(0);
   } catch (error) {
      console.error("Error seeding auth frontend client:", error);
      process.exit(1);
   }
}

seedAuthFrontendClient();
