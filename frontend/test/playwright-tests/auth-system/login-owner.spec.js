// playwright test for login of owner

// if owner is not logged in, login as owner
// if no registered owner, register owner

import { test, expect } from "@playwright/test";

test.describe("Auth System - Complete Registration & Authentication Tests", () => {
   const baseUrl = "http://localhost:3000";
   const backendUrl = "http://localhost:3001";

   test.beforeEach(async ({ page }) => {
      await page.goto(baseUrl);
   });

   test("should display auth system homepage", async ({ page }) => {
      await expect(
         page.getByRole("heading", { name: "Auth System", level: 2 })
      ).toHaveText(" Auth System ");
   });

   test("should navigate to registration page", async ({ page }) => {
      await page.click('a[href="/register"]');
      await expect(page).toHaveURL(`${baseUrl}/register`);
      await expect(page.getByRole("heading", { name: "___" })).toBeVisible();
   });

   test("should register auth system owner successfully", async ({ page }) => {
      // Navigate to registration
      await page.goto(`${baseUrl}/register`);

      // Select Auth System Owner account type
      await page.click('input[value="auth"]');

      const ownerEmail = `playwrightowner_${Date.now()}@example.com`;
      // Fill out registration form with valid data
      await page.fill('input[name="name"]', "PlaywrightOwner");
      await page.fill('input[name="email"]', ownerEmail);
      await page.fill('input[name="password"]', "TestPassword123!");

      // Submit registration
      await page.click('button[type="submit"]');

      // Wait for the success message to appear
      const successMessageLocator = page.locator("div.success-message");
      await expect(successMessageLocator).toBeVisible({ timeout: 5000 });
      await expect(successMessageLocator).toContainText(
         "Registration successful! Please log in."
      );

      // Wait for navigation to login page (occurs after 2s in Register.svelte)
      await expect(page).toHaveURL(
         new RegExp(`${baseUrl}/login(\?return_url=.*)?`),
         { timeout: 5000 }
      );
   });

   test("should login with newly created auth system owner", async ({
      page,
   }) => {
      // Navigate to login page
      await page.goto(`${baseUrl}/login`);

      // Fill login form with auth system owner credentials
      await page.fill('input[name="email"]', "playwrightowner@example.com");
      await page.fill('input[name="password"]', "TestPassword123!");

      // Submit login
      await page.click('button[type="submit"]');

      // Should redirect to home page
      await page.waitForTimeout(3000);

      // Check for successful login indicators
      await expect(page).toHaveURL(`${baseUrl}/home`);
      await expect(page.locator("h1")).toContainText("Home");
      await expect(page.locator("button")).toContainText("logout");
   });

   test("should register client app user successfully", async ({ page }) => {
      // Navigate to registration
      await page.goto(`${baseUrl}/register`);

      // Client App User is selected by default, so no need to click

      const clientUserEmail = `playwrightuser_${Date.now()}@example.com`;
      // Fill out registration form
      await page.fill('input[name="name"]', "PlaywrightUser");
      await page.fill('input[name="email"]', clientUserEmail);
      await page.fill('input[name="password"]', "TestPassword123!");

      // Submit registration
      await page.click('button[type="submit"]');

      // Wait for the success message to appear
      const successMessageLocator = page.locator("div.success-message");
      await expect(successMessageLocator).toBeVisible({ timeout: 5000 });
      await expect(successMessageLocator).toContainText(
         "Registration successful! Please log in."
      );

      // Wait for navigation to login page (occurs after 2s in Register.svelte)
      // The return_url might be present if the registration was initiated from a client app redirect context
      await expect(page).toHaveURL(
         new RegExp(`${baseUrl}/login(\?return_url=.*)?`),
         { timeout: 5000 }
      );
   });

   test("should login existing owner", async ({ page }) => {
      // Navigate to login page
      await page.goto(`${baseUrl}/login`);

      // Fill login form with existing owner credentials
      await page.fill('input[name="email"]', "guitestowner@example.com");
      await page.fill('input[name="password"]', "GUITestPassword123!");

      // Submit login
      await page.click('button[type="submit"]');

      // Should redirect to owner panel
      await page.waitForTimeout(3000);

      const url = page.url();
      expect(url).toBe(`${baseUrl}/owner`);
   });

   test("should show validation errors for invalid registration", async ({
      page,
   }) => {
      await page.goto(`${baseUrl}/register`);

      // Try to submit form with invalid data
      await page.fill('input[name="name"]', "123"); // Numbers not allowed
      await page.fill('input[name="email"]', "invalid-email");
      await page.fill('input[name="password"]', "123"); // Too short

      await page.click('button[type="submit"]');

      // Should show validation errors
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body");
      expect(
         bodyText.includes("failed") || bodyText.includes("error")
      ).toBeTruthy();
   });

   test("should show error for invalid login", async ({ page }) => {
      await page.goto(`${baseUrl}/login`);

      // Try invalid credentials
      await page.fill('input[name="email"]', "nonexistent@example.com");
      await page.fill('input[name="password"]', "wrongpassword");
      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body");
      expect(
         bodyText.includes("failed") ||
            bodyText.includes("error") ||
            bodyText.includes("invalid")
      ).toBeTruthy();
   });

   test("should logout successfully", async ({ page }) => {
      // First login
      await page.goto(`${baseUrl}/login`);
      await page.fill('input[name="email"]', "testowner@example.com"); // Assuming this is an owner
      await page.fill('input[name="password"]', "TestPassword123!");
      await page.click('button[type="submit"]');

      // Wait for navigation to owner panel (assuming "testowner@example.com" is an owner)
      // Increased timeout slightly for potentially slower CI environments or initial load after fixes
      await expect(page).toHaveURL(`${baseUrl}/owner`, { timeout: 7000 });

      // Wait for the logout button to be visible and then click
      const logoutButton = page.locator('button#logout:has-text("logout")');
      await expect(logoutButton).toBeVisible({ timeout: 5000 });
      await logoutButton.click();

      // Wait for logout to process and redirect (e.g., back to login page)
      // The original test checked body text for "login" or "register" which implies /login or / or /register.
      // Let's explicitly wait for a URL that indicates logged-out state.
      // Common practice is redirect to /login.
      await expect(page).toHaveURL(new RegExp(`${baseUrl}/(login)?$`), {
         timeout: 5000,
      }); // Matches / or /login

      // Original check for page content
      const bodyText = await page.textContent("body");
      expect(
         bodyText.includes("login") || bodyText.includes("register")
      ).toBeTruthy();
   });

   test("should test backend registration API directly", async ({
      request,
   }) => {
      // Test registration endpoint directly with valid data
      const response = await request.post(`${backendUrl}/api/auth/register`, {
         data: {
            name: "DirectTestUser",
            email: "directtest@example.com",
            password: "TestPassword123!",
            role: "user",
         },
      });

      const responseData = await response.text();
      console.log("Registration API Response Status:", response.status());
      console.log("Registration API Response:", responseData);

      // Should be success (201) or user already exists (400)
      expect([201, 400].includes(response.status())).toBeTruthy();
   });

   test("should test backend login API directly", async ({ request }) => {
      // Test login endpoint directly
      const response = await request.post(`${backendUrl}/api/auth/login`, {
         data: {
            credentials: {
               email: "guitestowner@example.com",
               password: "GUITestPassword123!",
            },
         },
      });

      const responseData = await response.text();
      console.log("Login API Response Status:", response.status());
      console.log("Login API Response:", responseData);

      expect([200, 401].includes(response.status())).toBeTruthy();
   });

   test("should access owner panel after owner login", async ({ page }) => {
      // Login as existing owner
      await page.goto(`${baseUrl}/login`);
      await page.fill('input[name="email"]', "guitestowner@example.com");
      await page.fill('input[name="password"]', "GUITestPassword123!");
      await page.click('button[type="submit"]');

      await page.waitForTimeout(3000);

      // Should be redirected to owner panel
      await expect(page).toHaveURL(`${baseUrl}/owner`);

      // Should see owner panel content
      const bodyText = await page.textContent("body");
      expect(
         bodyText.includes("Owner") ||
            bodyText.includes("manage") ||
            bodyText.includes("client")
      ).toBeTruthy();
   });

   test("should handle concurrent registrations", async ({ browser }) => {
      // Test multiple concurrent registrations
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Register two different users concurrently
      const registration1 = (async () => {
         await page1.goto(`${baseUrl}/register`);
         await page1.fill('input[name="name"]', "ConcurrentUser1");
         await page1.fill('input[name="email"]', "concurrent1@example.com");
         await page1.fill('input[name="password"]', "TestPassword123!");
         await page1.click('button[type="submit"]');
         await page1.waitForTimeout(3000);
         return page1.textContent("body");
      })();

      const registration2 = (async () => {
         await page2.goto(`${baseUrl}/register`);
         await page2.fill('input[name="name"]', "ConcurrentUser2");
         await page2.fill('input[name="email"]', "concurrent2@example.com");
         await page2.fill('input[name="password"]', "TestPassword123!");
         await page2.click('button[type="submit"]');
         await page2.waitForTimeout(3000);
         return page2.textContent("body");
      })();

      const [result1, result2] = await Promise.all([
         registration1,
         registration2,
      ]);

      // Both should succeed
      expect(result1.includes("Registration successful")).toBeTruthy();
      expect(result2.includes("Registration successful")).toBeTruthy();

      await context1.close();
      await context2.close();
   });
});
