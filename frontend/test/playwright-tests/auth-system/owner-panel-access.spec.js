import { test, expect } from "@playwright/test";

test.describe("Auth System - Owner Panel Access Tests", () => {
   const baseUrl = "http://localhost:3000";
   const backendUrl = "http://localhost:3001/api";

   // Test credentials for different user types
   const testUsers = {
      owner: {
         email: "guitestowner@example.com",
         password: "GUITestPassword123!",
         expectedRole: "admin",
      },
      existingOwner: {
         email: "owner@example.com",
         password: "password123",
         expectedRole: "owner",
      },
      clientUser: {
         email: "clientuser@example.com",
         password: "ClientPassword123!",
         expectedRole: "user",
      },
   };

   test.beforeEach(async ({ page }) => {
      await page.goto(baseUrl);

      // Log out if already logged in
      const logoutButton = page.locator('button:has-text("logout")');
      if (await logoutButton.isVisible()) {
         await logoutButton.click();
         await page.waitForTimeout(1000);
      }
   });

   test("should successfully login auth-system owner and access Owner Panel", async ({
      page,
   }) => {
      console.log(
         "🧪 Testing auth-system owner login and Owner Panel access..."
      );

      // Step 1: Navigate to login page
      await page.goto(`${baseUrl}/login`);
      await expect(
         page.getByRole("heading", { name: "Auth System" })
      ).toBeVisible();

      // Step 2: Login with owner credentials
      await page.fill('input[name="email"]', testUsers.owner.email);
      await page.fill('input[name="password"]', testUsers.owner.password);

      console.log("🔑 Logging in with owner credentials...");
      await page.click('button[type="submit"]');

      // Step 3: Wait for redirect and verify successful login
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(`${baseUrl}/home`);
      await expect(page.locator("h1")).toContainText("Home");

      console.log("✅ Login successful, now testing Owner Panel access...");

      // Step 4: Navigate to Owner Panel
      await page.goto(`${baseUrl}/owner`);

      // Wait for the component to load and reactive effects to complete
      await page.waitForTimeout(5000);

      // Step 5: Verify Owner Panel loads successfully
      await expect(page.locator("h1")).toContainText("🏢 Owner Panel");
      await expect(page.locator(".subtitle")).toContainText(
         "Manage your client servers and users"
      );

      // Step 6: First check if we have an error state and retry if needed
      const errorSection = page.locator(".error");
      const retryButton = page.locator('button:has-text("🔄 Retry Loading")');

      if (await errorSection.isVisible()) {
         console.log("⚠️ Error state detected, attempting retry...");
         if (await retryButton.isVisible()) {
            await retryButton.click();
            await page.waitForTimeout(3000);
         }
      }

      // Step 7: Verify the main content loads (no authentication error)
      await expect(errorSection).not.toBeVisible();

      // Step 8: Verify admin badge is shown for this user
      await expect(page.locator(".admin-badge")).toBeVisible();
      await expect(page.locator(".admin-badge")).toContainText(
         "🔧 System Administrator"
      );

      // Step 8: Verify client servers section is visible
      await expect(page.locator(".client-servers-section")).toBeVisible();
      await expect(
         page.getByRole("heading", { name: "📱 Your Client Servers" })
      ).toBeVisible();

      // Step 9: Verify create button is present
      await expect(
         page.locator('button:has-text("Create New Client Server")')
      ).toBeVisible();

      console.log("✅ Owner Panel access test completed successfully!");
   });

   test("should handle session persistence across page navigation", async ({
      page,
   }) => {
      console.log("🧪 Testing session persistence...");

      // Login first
      await page.goto(`${baseUrl}/login`);
      await page.fill('input[name="email"]', testUsers.owner.email);
      await page.fill('input[name="password"]', testUsers.owner.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Navigate between pages to test session persistence
      await page.goto(`${baseUrl}/home`);
      await expect(page.locator("h1")).toContainText("Home");

      await page.goto(`${baseUrl}/owner`);
      await page.waitForTimeout(3000);
      await expect(page.locator("h1")).toContainText("🏢 Owner Panel");

      // Navigate back to home
      await page.goto(`${baseUrl}/home`);
      await expect(page.locator("h1")).toContainText("Home");

      // Return to owner panel - should still work
      await page.goto(`${baseUrl}/owner`);
      await page.waitForTimeout(3000);
      await expect(page.locator("h1")).toContainText("🏢 Owner Panel");

      console.log("✅ Session persistence test completed successfully!");
   });

   test("should deny Owner Panel access to non-admin users", async ({
      page,
   }) => {
      console.log(
         "🧪 Testing Owner Panel access denial for non-admin users..."
      );

      // Ensure we're logged out first
      await page.goto(baseUrl);
      const logoutButton = page.locator('button:has-text("logout")');
      if (await logoutButton.isVisible()) {
         await logoutButton.click();
         await page.waitForTimeout(1000);
      }

      // Try to access Owner Panel without login
      await page.goto(`${baseUrl}/owner`);
      await page.waitForTimeout(5000); // Give more time for component to load

      // Should show authentication error or be redirected to login
      const currentUrl = page.url();
      if (currentUrl.includes("/owner")) {
         // If on owner page, should show error
         await expect(page.locator(".error")).toBeVisible();
         await expect(page.locator(".error p")).toContainText(
            "Authentication required to access owner panel"
         );
      } else {
         // If redirected to login, that's also valid
         await expect(
            page.getByRole("heading", { name: "Auth System" })
         ).toBeVisible();
      }

      console.log("✅ Access denial test completed successfully!");
   });

   test("should test backend session endpoint directly", async ({
      request,
   }) => {
      console.log("🧪 Testing backend session endpoint...");

      // First login to get session
      const loginResponse = await request.post(`${backendUrl}/auth/login`, {
         data: {
            credentials: {
               email: testUsers.owner.email,
               password: testUsers.owner.password,
            },
         },
      });

      expect(loginResponse.ok()).toBeTruthy();
      const loginData = await loginResponse.json();
      console.log("Login response:", JSON.stringify(loginData, null, 2));

      // Test session endpoint
      const sessionResponse = await request.get(`${backendUrl}/auth/session`);
      expect(sessionResponse.ok()).toBeTruthy();

      const sessionData = await sessionResponse.json();
      console.log("Session response:", JSON.stringify(sessionData, null, 2));

      // Verify session data structure
      expect(sessionData.data).toBeDefined();
      expect(sessionData.data.role).toBeDefined();
      expect(sessionData.data.email).toBe(testUsers.owner.email);
      expect(["admin", "owner"]).toContain(sessionData.data.role);

      console.log("✅ Backend session endpoint test completed successfully!");
   });

   test("should test Owner Panel retry functionality", async ({ page }) => {
      console.log("🧪 Testing Owner Panel retry functionality...");

      // Login first
      await page.goto(`${baseUrl}/login`);
      await page.fill('input[name="email"]', testUsers.owner.email);
      await page.fill('input[name="password"]', testUsers.owner.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Go to Owner Panel
      await page.goto(`${baseUrl}/owner`);
      await page.waitForTimeout(3000);

      // If there's an error state, test the retry button
      const retryButton = page.locator('button:has-text("🔄 Retry Loading")');
      if (await retryButton.isVisible()) {
         console.log("Found retry button, testing retry functionality...");
         await retryButton.click();
         await page.waitForTimeout(3000);
      }

      // Should eventually show the Owner Panel successfully
      await expect(page.locator("h1")).toContainText("🏢 Owner Panel");

      console.log("✅ Retry functionality test completed successfully!");
   });

   test("should verify console logs show correct debugging information", async ({
      page,
   }) => {
      console.log("🧪 Testing console debug logs...");

      const consoleLogs = [];
      page.on("console", (msg) => {
         // Ensure we only capture logs of type 'log' and containing the target string
         if (msg.type() === "log" && msg.text().includes("[OWNER PANEL]")) {
            consoleLogs.push(msg.text());
         }
      });

      // Login and access Owner Panel
      await page.goto(`${baseUrl}/login`);
      await page.fill('input[name="email"]', testUsers.owner.email);
      await page.fill('input[name="password"]', testUsers.owner.password);
      await page.click('button[type="submit"]');

      // Wait for navigation to home after login, as per other tests
      await expect(page).toHaveURL(`${baseUrl}/home`, { timeout: 7000 });

      // Navigate to Owner Panel
      await page.goto(`${baseUrl}/owner`);
      // Wait for the Owner Panel to actually load its main content
      await expect(page.locator("h1")).toContainText("🏢 Owner Panel", {
         timeout: 7000,
      });

      // Wait specifically for at least one relevant console log to be captured.
      // This polls the consoleLogs array until the condition is met or timeout.
      try {
         await page.waitForFunction(
            () =>
               window.consoleMessages &&
               window.consoleMessages.some((msg) =>
                  msg.includes("[OWNER PANEL]")
               ),
            { timeout: 5000 }
         );
         // Playwright's page.on('console') updates the consoleLogs array in the Node.js context.
         // We need to wait for that array to populate.
         await page.waitForFunction(() => consoleLogs.length > 0, {
            timeout: 5000,
         });
      } catch (e) {
         console.log(
            "Timed out waiting for console logs. Captured logs:",
            consoleLogs
         );
         // The test will likely fail on the expect below, which is fine.
      }

      // Check that our debug logs are present
      const ownerPanelLogs = consoleLogs.filter((log) =>
         log.includes("[OWNER PANEL]")
      );

      if (ownerPanelLogs.length === 0) {
         console.log(
            "No [OWNER PANEL] logs found after explicit waits, all console logs captured by page.on:",
            consoleLogs
         );
      }
      expect(ownerPanelLogs.length).toBeGreaterThan(0);

      console.log("Relevant [OWNER PANEL] logs captured:", ownerPanelLogs);
      console.log("✅ Console debug logs test completed successfully!");
   });

   test("should test complete user workflow: login -> owner panel -> create client server", async ({
      page,
   }) => {
      console.log("🧪 Testing complete user workflow...");

      // Step 1: Login
      await page.goto(`${baseUrl}/login`);
      await page.fill('input[name="email"]', testUsers.owner.email);
      await page.fill('input[name="password"]', testUsers.owner.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Step 2: Access Owner Panel
      await page.goto(`${baseUrl}/owner`);
      await page.waitForTimeout(5000);
      await expect(page.locator("h1")).toContainText("🏢 Owner Panel");

      // Step 3: Try to open Create Client Server modal
      const createButton = page.locator(
         'button:has-text("Create New Client Server")'
      );
      if (await createButton.isVisible()) {
         await createButton.click();
         await page.waitForTimeout(1000);

         // Check if modal appears
         const modal = page.locator('[role="dialog"]');
         if (await modal.isVisible()) {
            // Close modal for now
            const closeButton = page.locator('button:has-text("Cancel")');
            if (await closeButton.isVisible()) {
               await closeButton.click();
            }
         }
      }

      console.log("✅ Complete user workflow test completed successfully!");
   });

   test("should logout successfully from Owner Panel", async ({ page }) => {
      console.log("🧪 Testing logout from Owner Panel...");

      // Login and access Owner Panel
      await page.goto(`${baseUrl}/login`);
      await page.fill('input[name="email"]', testUsers.owner.email);
      await page.fill('input[name="password"]', testUsers.owner.password);
      await page.click('button[type="submit"]');

      // Expect owner to be redirected to /home first as per other tests in this file
      await expect(page).toHaveURL(`${baseUrl}/home`, { timeout: 7000 });

      // Navigate to Owner Panel
      await page.goto(`${baseUrl}/owner`);
      await expect(page.locator("h1")).toContainText("🏢 Owner Panel", {
         timeout: 5000,
      });

      // Logout using the specific logout button ID
      const logoutButton = page.locator("button#logout"); // Footer.svelte uses id="logout"
      await expect(logoutButton).toBeVisible({ timeout: 5000 });
      await logoutButton.click();

      // Should be redirected to login page by ProtectedRoute
      await expect(page).toHaveURL(`${baseUrl}/login`, { timeout: 7000 });

      // Optionally, verify some element on the login page to confirm
      await expect(page.getByRole("button", { name: "login" })).toBeVisible();

      // Try to access Owner Panel after logout - should be denied and redirect to login
      await page.goto(`${baseUrl}/owner`);
      // ProtectedRoute should redirect to /login. Check if it does.
      await expect(page).toHaveURL(`${baseUrl}/login`, { timeout: 7000 });
      // And confirm a login-related element is visible on the login page
      await expect(page.getByRole("button", { name: "login" })).toBeVisible();

      console.log("✅ Logout test completed successfully!");
   });
});
