import { test, expect } from "@playwright/test";
import { AuthPage } from "../helpers/auth-page";
import { OwnerPanelPage } from "../helpers/owner-panel-page";
import {
   generateUniqueEmail,
   generateUniqueAppName,
   testClientServers,
} from "../helpers/test-data";

test.describe("Client Server CRUD Operations", () => {
   let authPage;
   let ownerPanelPage;
   let ownerCredentials;

   test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      authPage = new AuthPage(page);
      ownerCredentials = {
         name: "Test Owner",
         email: generateUniqueEmail("owner"),
         password: "OwnerPass123!",
         userType: "auth",
      };

      await authPage.navigateToRegister();
      await authPage.fillRegistrationForm(ownerCredentials);
      await authPage.submitRegistrationForm();

      await page.close();
      await context.close();
   });

   test.beforeEach(async ({ page }) => {
      authPage = new AuthPage(page);
      ownerPanelPage = new OwnerPanelPage(page);

      await authPage.navigateToLogin();
      await authPage.fillLoginForm(
         ownerCredentials.email,
         ownerCredentials.password
      );
      await authPage.submitLoginForm();
      await authPage.waitForSuccessfulLogin();
   });

   test("should display owner panel with stats", async ({ page }) => {
      await ownerPanelPage.navigateToOwnerPanel();
      await ownerPanelPage.waitForPanelToLoad();

      const panelHeader = await page.locator(".panel-header h2").textContent();
      expect(panelHeader).toContain("Owner Panel");

      const stats = await ownerPanelPage.getOwnerStats();
      expect(stats.totalClients).toBeDefined();
      expect(stats.totalUsers).toBeDefined();
   });

   test("should create a new client server", async ({ page }) => {
      await ownerPanelPage.navigateToOwnerPanel();
      await ownerPanelPage.waitForPanelToLoad();

      const uniqueAppName = generateUniqueAppName("Test App");
      const clientData = {
         app_name: uniqueAppName,
         authorized_urls: testClientServers.default.authorized_urls,
      };

      await ownerPanelPage.clickCreateNewClientServer();
      await ownerPanelPage.fillClientServerForm(clientData);
      await ownerPanelPage.submitClientServerForm();
      await ownerPanelPage.waitForClientServerCreated();

      const clientServers = await ownerPanelPage.getClientServerCards();
      const createdServer = clientServers.find(
         (cs) => cs.appName === uniqueAppName
      );

      expect(createdServer).toBeTruthy();
      expect(createdServer.clientId).toBeTruthy();
      expect(createdServer.clientSecret).toBeTruthy();
   });

   test("should edit an existing client server", async ({ page }) => {
      await ownerPanelPage.navigateToOwnerPanel();
      await ownerPanelPage.waitForPanelToLoad();

      const originalAppName = generateUniqueAppName("Original App");
      const updatedAppName = generateUniqueAppName("Updated App");

      await ownerPanelPage.clickCreateNewClientServer();
      await ownerPanelPage.fillClientServerForm({
         app_name: originalAppName,
         authorized_urls: testClientServers.default.authorized_urls,
      });
      await ownerPanelPage.submitClientServerForm();
      await ownerPanelPage.waitForClientServerCreated();

      await ownerPanelPage.clickEditForClientServer(originalAppName);
      await ownerPanelPage.fillClientServerForm({
         app_name: updatedAppName,
         authorized_urls: testClientServers.updated.authorized_urls,
      });
      await ownerPanelPage.submitClientServerForm();

      await page.waitForTimeout(1000);

      const clientServers = await ownerPanelPage.getClientServerCards();
      const updatedServer = clientServers.find(
         (cs) => cs.appName === updatedAppName
      );

      expect(updatedServer).toBeTruthy();
   });

   test("should delete a client server", async ({ page }) => {
      await ownerPanelPage.navigateToOwnerPanel();
      await ownerPanelPage.waitForPanelToLoad();

      const appNameToDelete = generateUniqueAppName("App To Delete");

      await ownerPanelPage.clickCreateNewClientServer();
      await ownerPanelPage.fillClientServerForm({
         app_name: appNameToDelete,
         authorized_urls: testClientServers.default.authorized_urls,
      });
      await ownerPanelPage.submitClientServerForm();
      await ownerPanelPage.waitForClientServerCreated();

      page.on("dialog", (dialog) => dialog.accept());

      await ownerPanelPage.clickDeleteForClientServer(appNameToDelete);

      await page.waitForTimeout(2000);

      const clientServers = await ownerPanelPage.getClientServerCards();
      const deletedServer = clientServers.find(
         (cs) => cs.appName === appNameToDelete
      );

      expect(deletedServer).toBeFalsy();
   });

   test("should show empty state when no client servers exist", async ({
      page,
   }) => {
      await ownerPanelPage.navigateToOwnerPanel();
      await ownerPanelPage.waitForPanelToLoad();

      const clientServers = await ownerPanelPage.getClientServerCards();

      if (clientServers.length === 0) {
         const emptyState = await page.locator(".empty-state").isVisible();
         expect(emptyState).toBeTruthy();

         const emptyStateText = await page
            .locator(".empty-state h3")
            .textContent();
         expect(emptyStateText).toContain("Get Started");
      }
   });

   test("should handle client server creation errors gracefully", async ({
      page,
   }) => {
      await ownerPanelPage.navigateToOwnerPanel();
      await ownerPanelPage.waitForPanelToLoad();

      await ownerPanelPage.clickCreateNewClientServer();
      await ownerPanelPage.fillClientServerForm({
         app_name: "",
         authorized_urls: [],
      });
      await ownerPanelPage.submitClientServerForm();

      const errorMessage = await ownerPanelPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
   });
});
