import { test, expect } from "@playwright/test";
import { AuthPage } from "../helpers/auth-page";
import { OwnerPanelPage } from "../helpers/owner-panel-page";
import {
   generateUniqueEmail,
   generateUniqueAppName,
} from "../helpers/test-data";

test.describe("End-to-End User Journey", () => {
   test("complete owner journey: register, login, create client server, manage users", async ({
      page,
   }) => {
      const authPage = new AuthPage(page);
      const ownerPanelPage = new OwnerPanelPage(page);

      const ownerEmail = generateUniqueEmail("e2e_owner");
      const ownerData = {
         name: "E2E Test Owner",
         email: ownerEmail,
         password: "E2EOwnerPass123!",
         userType: "auth",
      };

      console.log("Step 1: Register as owner");
      await authPage.navigateToRegister();
      await authPage.fillRegistrationForm(ownerData);
      await authPage.submitRegistrationForm();
      await page.waitForURL("**/login?registered=true");
      expect(page.url()).toContain("registered=true");

      console.log("Step 2: Login with owner credentials");
      await authPage.fillLoginForm(ownerData.email, ownerData.password);
      await authPage.submitLoginForm();
      await authPage.waitForSuccessfulLogin();
      expect(page.url()).toContain("/home");

      console.log("Step 3: Navigate to owner panel");
      await ownerPanelPage.navigateToOwnerPanel();
      await ownerPanelPage.waitForPanelToLoad();

      const panelHeader = await page.locator(".panel-header h2").textContent();
      expect(panelHeader).toContain("Owner Panel");

      const ownerBadge = await page.locator(".owner-badge").isVisible();
      expect(ownerBadge).toBeTruthy();

      console.log("Step 4: Create a new client server");
      const clientAppName = generateUniqueAppName("E2E Client App");
      await ownerPanelPage.clickCreateNewClientServer();
      await ownerPanelPage.fillClientServerForm({
         app_name: clientAppName,
         authorized_urls: ["http://localhost:5000", "https://e2eapp.com"],
      });
      await ownerPanelPage.submitClientServerForm();
      await ownerPanelPage.waitForClientServerCreated();

      const successMessage = await ownerPanelPage.getSuccessMessage();
      expect(successMessage).toContain("successful");

      console.log("Step 5: Verify client server was created");
      const clientServers = await ownerPanelPage.getClientServerCards();
      const createdServer = clientServers.find(
         (cs) => cs.appName === clientAppName
      );
      expect(createdServer).toBeTruthy();
      expect(createdServer.clientId).toMatch(/^[a-zA-Z0-9-]+$/);
      expect(createdServer.clientSecret).toMatch(/^[a-zA-Z0-9]+$/);

      console.log("Step 6: Add users to the client server");
      await ownerPanelPage.clickManageUsersForClientServer(clientAppName);

      const adminUserEmail = generateUniqueEmail("e2e_admin");
      await ownerPanelPage.fillUserForm({
         name: "E2E Admin User",
         email: adminUserEmail,
         password: "AdminPass123!",
         role: "admin",
      });
      await ownerPanelPage.submitUserForm();
      await page.waitForTimeout(1000);

      const regularUserEmail = generateUniqueEmail("e2e_user");
      await ownerPanelPage.fillUserForm({
         name: "E2E Regular User",
         email: regularUserEmail,
         password: "UserPass123!",
         role: "user",
      });
      await ownerPanelPage.submitUserForm();
      await page.waitForTimeout(1000);

      console.log("Step 7: Verify users were created");
      const users = await ownerPanelPage.getClientUsers();
      expect(users.length).toBeGreaterThanOrEqual(2);

      const adminUser = users.find((u) => u.email === adminUserEmail);
      expect(adminUser).toBeTruthy();
      expect(adminUser.role).toBe("admin");

      const regularUser = users.find((u) => u.email === regularUserEmail);
      expect(regularUser).toBeTruthy();
      expect(regularUser.role).toBe("user");

      console.log("Step 8: Close user management modal");
      await ownerPanelPage.closeModal();

      console.log("Step 9: Update client server");
      const updatedAppName = clientAppName + " - Updated";
      await ownerPanelPage.clickEditForClientServer(clientAppName);
      await ownerPanelPage.fillClientServerForm({
         app_name: updatedAppName,
         authorized_urls: [
            "http://localhost:5000",
            "https://e2eapp.com",
            "https://updated.e2eapp.com",
         ],
      });
      await ownerPanelPage.submitClientServerForm();
      await page.waitForTimeout(1000);

      const updatedServers = await ownerPanelPage.getClientServerCards();
      const updatedServer = updatedServers.find(
         (cs) => cs.appName === updatedAppName
      );
      expect(updatedServer).toBeTruthy();

      console.log("Step 10: Verify owner stats updated");
      const stats = await ownerPanelPage.getOwnerStats();
      expect(parseInt(stats.totalClients)).toBeGreaterThan(0);
      expect(parseInt(stats.totalUsers)).toBeGreaterThan(0);

      console.log("Step 11: Logout");
      await authPage.logout();
      expect(page.url()).toContain("/login");

      console.log("Step 12: Verify protected route requires authentication");
      await page.goto("/owner");
      await page.waitForURL("**/login");
      expect(page.url()).toContain("/login");
   });

   test("regular user cannot access owner panel", async ({ page }) => {
      const authPage = new AuthPage(page);

      const regularUserEmail = generateUniqueEmail("regular_user");
      const userData = {
         name: "Regular User",
         email: regularUserEmail,
         password: "RegularPass123!",
         userType: "client",
      };

      await authPage.navigateToRegister();
      await authPage.fillRegistrationForm(userData);
      await authPage.submitRegistrationForm();
      await page.waitForURL("**/login?registered=true");

      await authPage.fillLoginForm(userData.email, userData.password);
      await authPage.submitLoginForm();
      await authPage.waitForSuccessfulLogin();

      await page.goto("/owner");
      await page.waitForTimeout(2000);

      const errorElement = await page.locator(".error").isVisible();
      if (errorElement) {
         const errorText = await page.locator(".error p").textContent();
         expect(errorText).toContain("privileges required");
      } else {
         expect(page.url()).toContain("/home");
      }
   });
});
