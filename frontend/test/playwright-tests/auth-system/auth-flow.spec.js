import { test, expect } from "@playwright/test";
import { AuthPage } from "../helpers/auth-page";
import { generateUniqueEmail } from "../helpers/test-data";

test.describe("Authentication Flow", () => {
   let authPage;

   test.beforeEach(async ({ page }) => {
      authPage = new AuthPage(page);
   });

   test("should register a new auth-system user successfully", async ({
      page,
   }) => {
      const uniqueEmail = generateUniqueEmail("authuser");
      const userData = {
         name: "Auth System User",
         email: uniqueEmail,
         password: "SecurePass123!",
         userType: "auth",
      };

      await authPage.navigateToRegister();
      await authPage.fillRegistrationForm(userData);
      await authPage.submitRegistrationForm();

      await page.waitForURL("**/login?registered=true&hardcoded=yes", {
         timeout: 5000,
      });

      const urlParams = new URL(page.url()).searchParams;
      expect(urlParams.get("registered")).toBe("true");
      expect(urlParams.get("hardcoded")).toBe("yes");
   });

   test("should login with valid credentials", async ({ page }) => {
      const uniqueEmail = generateUniqueEmail("logintest");
      const userData = {
         name: "Login Test User",
         email: uniqueEmail,
         password: "TestPass123!",
         userType: "auth",
      };

      await authPage.navigateToRegister();
      await authPage.fillRegistrationForm(userData);
      await authPage.submitRegistrationForm();
      await page.waitForURL("**/login?registered=true&hardcoded=yes");

      await authPage.fillLoginForm(userData.email, userData.password);
      await authPage.submitLoginForm();
      await authPage.waitForSuccessfulLogin();

      expect(page.url()).toContain("/home");
   });

   test("should show error for invalid login credentials", async ({ page }) => {
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(
         "nonexistent@example.com",
         "WrongPassword123!"
      );
      await authPage.submitLoginForm();

      const errorMessage = await authPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
      expect(page.url()).toContain("/login");
   });

   test("should logout successfully", async ({ page }) => {
      const uniqueEmail = generateUniqueEmail("logouttest");
      const userData = {
         name: "Logout Test User",
         email: uniqueEmail,
         password: "TestPass123!",
         userType: "auth",
      };

      await authPage.navigateToRegister();
      await authPage.fillRegistrationForm(userData);
      await authPage.submitRegistrationForm();
      await page.waitForURL("**/login?registered=true&hardcoded=yes");

      await authPage.fillLoginForm(userData.email, userData.password);
      await authPage.submitLoginForm();
      await authPage.waitForSuccessfulLogin();

      await authPage.logout();
      expect(page.url()).toContain("/login");
   });

   test("should prevent access to protected routes when not logged in", async ({
      page,
   }) => {
      await page.goto("/owner");
      await page.waitForURL("**/login");
      expect(page.url()).toContain("/login");
   });

   test("should validate registration form fields", async ({ page }) => {
      await authPage.navigateToRegister();

      await authPage.fillRegistrationForm({
         name: "",
         email: "invalid-email",
         password: "weak",
         userType: "auth",
      });
      await authPage.submitRegistrationForm();

      const errorMessage = await authPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
      expect(page.url()).toContain("/register");
   });
});
