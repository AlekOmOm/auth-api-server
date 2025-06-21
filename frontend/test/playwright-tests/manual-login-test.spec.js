import { test, expect } from "@playwright/test";

test.describe("Manual Login Test", () => {
   test("direct login test with existing user", async ({ page }) => {
      // Enable console logging before navigation
      page.on("console", (msg) => console.log("Browser console:", msg.text()));
      page.on("pageerror", (error) =>
         console.log("Page error:", error.message)
      );
      page.on("requestfailed", (request) =>
         console.log("Request failed:", request.url())
      );

      // Go directly to login page
      await page.goto("http://localhost:3000/login");

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Fill in test credentials from backend test
      await page.fill('input[name="email"]', "owner@example.com");
      await page.fill('input[name="password"]', "Password123");

      // Take a screenshot before submitting
      await page.screenshot({ path: "before-login.png" });

      // Submit the form
      await page.click('button[type="submit"]');

      // Wait a bit to see what happens
      await page.waitForTimeout(2000);

      // Take a screenshot after submitting
      await page.screenshot({ path: "after-login.png" });

      // Check current URL
      console.log("Current URL after login:", page.url());

      // Check for error messages
      const errorElement = await page.locator(".error-message").first();
      if (await errorElement.isVisible()) {
         console.log("Error message found:", await errorElement.textContent());
      }

      // Wait for navigation with a longer timeout
      try {
         await page.waitForURL("**/owner", { timeout: 5000 });
         console.log("Redirected to owner page as expected for owner role");
      } catch (e) {
         try {
            await page.waitForURL("**/home", { timeout: 5000 });
            console.log("Redirected to home page");
         } catch (e2) {
            console.log("No redirect happened, still on:", page.url());
         }
      }

      // Check we're on the expected page
      expect(page.url()).toMatch(/\/(home|owner)/);
   });

   test("direct login test with non-owner user", async ({ page }) => {
      // Go directly to login page
      await page.goto("http://localhost:3000/login");

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Fill in test credentials from backend test
      await page.fill('input[name="email"]', "testuser@example.com");
      await page.fill('input[name="password"]', "Password123");

      // Enable console logging
      page.on("console", (msg) => console.log("Browser console:", msg.text()));

      // Submit the form
      await page.click('button[type="submit"]');

      // Wait for navigation with a longer timeout
      await page.waitForURL("**/home", { timeout: 10000 });

      // Check we're on the home page
      expect(page.url()).toContain("/home");
   });
});
