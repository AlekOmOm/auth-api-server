import { test, expect } from "@playwright/test";
import { AuthPage } from "../helpers/auth-page";
import { OwnerPanelPage } from "../helpers/owner-panel-page";
import {
   generateUniqueEmail,
   generateUniqueAppName,
   testClientServers,
} from "../helpers/test-data";

test.describe("User Management CRUD Operations", () => {
   let authPage;
   let ownerPanelPage;
   let ownerCredentials;
   let testClientServerName;

   test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      authPage = new AuthPage(page);
      ownerPanelPage = new OwnerPanelPage(page);

      ownerCredentials = {
         name: "User Management Owner",
         email: generateUniqueEmail("usermgmt_owner"),
         password: "OwnerPass123!",
         userType: "auth",
      };

      await authPage.navigateToRegister();
      await authPage.fillRegistrationForm(ownerCredentials);
      await authPage.submitRegistrationForm();
      await page.waitForURL("**/login?registered=true");

      await authPage.fillLoginForm(
         ownerCredentials.email,
         ownerCredentials.password
      );
      await authPage.submitLoginForm();
      await authPage.waitForSuccessfulLogin();

      testClientServerName = generateUniqueAppName("User Management Test App");
      await ownerPanelPage.navigateToOwnerPanel();
      await ownerPanelPage.waitForPanelToLoad();
      await ownerPanelPage.clickCreateNewClientServer();
      await ownerPanelPage.fillClientServerForm({
         app_name: testClientServerName,
         authorized_urls: testClientServers.default.authorized_urls,
      });
      await ownerPanelPage.submitClientServerForm();
      await ownerPanelPage.waitForClientServerCreated();

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

      await ownerPanelPage.navigateToOwnerPanel();
      await ownerPanelPage.waitForPanelToLoad();
   });

   test("should open user management modal", async ({ page }) => {
      await ownerPanelPage.clickManageUsersForClientServer(
         testClientServerName
      );

      const modalTitle = await page.locator(".modal h2").textContent();
      expect(modalTitle).toContain("User Management");
   });

   test("should create a new user for client server", async ({ page }) => {
      await ownerPanelPage.clickManageUsersForClientServer(
         testClientServerName
      );

      const newUserEmail = generateUniqueEmail("clientuser");
      const userData = {
         name: "New Client User",
         email: newUserEmail,
         password: "ClientPass123!",
         role: "user",
      };

      await ownerPanelPage.fillUserForm(userData);
      await ownerPanelPage.submitUserForm();

      await page.waitForTimeout(1000);

      const users = await ownerPanelPage.getClientUsers();
      const createdUser = users.find((u) => u.email === newUserEmail);

      expect(createdUser).toBeTruthy();
      expect(createdUser.name).toBe(userData.name);
      expect(createdUser.role).toBe(userData.role);
   });

   test("should create multiple users with different roles", async ({
      page,
   }) => {
      await ownerPanelPage.clickManageUsersForClientServer(
         testClientServerName
      );

      const adminEmail = generateUniqueEmail("admin");
      const userEmail = generateUniqueEmail("user");

      await ownerPanelPage.fillUserForm({
         name: "Admin User",
         email: adminEmail,
         password: "AdminPass123!",
         role: "admin",
      });
      await ownerPanelPage.submitUserForm();
      await page.waitForTimeout(500);

      await ownerPanelPage.fillUserForm({
         name: "Regular User",
         email: userEmail,
         password: "UserPass123!",
         role: "user",
      });
      await ownerPanelPage.submitUserForm();
      await page.waitForTimeout(1000);

      const users = await ownerPanelPage.getClientUsers();
      const adminUser = users.find((u) => u.email === adminEmail);
      const regularUser = users.find((u) => u.email === userEmail);

      expect(adminUser).toBeTruthy();
      expect(adminUser.role).toBe("admin");
      expect(regularUser).toBeTruthy();
      expect(regularUser.role).toBe("user");
   });

   test("should update user information", async ({ page }) => {
      await ownerPanelPage.clickManageUsersForClientServer(
         testClientServerName
      );

      const userEmail = generateUniqueEmail("updateuser");
      await ownerPanelPage.fillUserForm({
         name: "Original Name",
         email: userEmail,
         password: "OriginalPass123!",
         role: "user",
      });
      await ownerPanelPage.submitUserForm();
      await page.waitForTimeout(1000);

      const userRow = await page.locator(
         `.user-list-item:has(.user-email:text("${userEmail}"))`
      );
      await userRow.locator('button:has-text("Edit")').click();

      await ownerPanelPage.fillUserForm({
         name: "Updated Name",
         email: userEmail,
         password: "UpdatedPass123!",
         role: "admin",
      });

      await page.click('.modal button:has-text("Update User")');
      await page.waitForTimeout(1000);

      const users = await ownerPanelPage.getClientUsers();
      const updatedUser = users.find((u) => u.email === userEmail);

      expect(updatedUser.name).toBe("Updated Name");
      expect(updatedUser.role).toBe("admin");
   });

   test("should delete a user from client server", async ({ page }) => {
      await ownerPanelPage.clickManageUsersForClientServer(
         testClientServerName
      );

      const userToDeleteEmail = generateUniqueEmail("deleteuser");
      await ownerPanelPage.fillUserForm({
         name: "User To Delete",
         email: userToDeleteEmail,
         password: "DeletePass123!",
         role: "user",
      });
      await ownerPanelPage.submitUserForm();
      await page.waitForTimeout(1000);

      page.on("dialog", (dialog) => dialog.accept());
      await ownerPanelPage.deleteUser(userToDeleteEmail);
      await page.waitForTimeout(1000);

      const users = await ownerPanelPage.getClientUsers();
      const deletedUser = users.find((u) => u.email === userToDeleteEmail);

      expect(deletedUser).toBeFalsy();
   });

   test("should handle user creation errors", async ({ page }) => {
      await ownerPanelPage.clickManageUsersForClientServer(
         testClientServerName
      );

      await ownerPanelPage.fillUserForm({
         name: "",
         email: "invalid-email",
         password: "weak",
         role: "user",
      });
      await ownerPanelPage.submitUserForm();

      const errorMessage = await page
         .locator(".modal .error-message")
         .textContent();
      expect(errorMessage).toBeTruthy();
   });

   test("should prevent duplicate user emails", async ({ page }) => {
      await ownerPanelPage.clickManageUsersForClientServer(
         testClientServerName
      );

      const duplicateEmail = generateUniqueEmail("duplicate");
      const userData = {
         name: "First User",
         email: duplicateEmail,
         password: "FirstPass123!",
         role: "user",
      };

      await ownerPanelPage.fillUserForm(userData);
      await ownerPanelPage.submitUserForm();
      await page.waitForTimeout(1000);

      await ownerPanelPage.fillUserForm({
         name: "Duplicate User",
         email: duplicateEmail,
         password: "DuplicatePass123!",
         role: "user",
      });
      await ownerPanelPage.submitUserForm();

      const errorMessage = await page
         .locator(".modal .error-message")
         .textContent();
      expect(errorMessage).toContain("already exists");
   });
});
