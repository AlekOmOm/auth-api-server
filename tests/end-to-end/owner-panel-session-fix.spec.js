import { test, expect } from "@playwright/test";

test.describe("Owner Panel Session Fix", () => {
   const ownerCredentials = {
      email: "owner3@mail.com",
      password: "whm3vzn9jue!zcr7CQR",
   };

   test.beforeEach(async ({ page }) => {
      // Clear any existing sessions
      await page.context().clearCookies();
   });

   test("should login and load Owner Panel without infinite loading", async ({
      page,
   }) => {
      // Navigate to login with return_url for owner panel
      await page.goto("http://localhost:3000/login?return_url=/owner");

      // Verify we're on the login page
      await expect(page).toHaveURL(/.*login/);

      // Fill in login credentials
      await page.fill(
         'input[name="email"], input[type="email"]',
         ownerCredentials.email
      );
      await page.fill(
         'input[name="password"], input[type="password"]',
         ownerCredentials.password
      );

      // Submit login form
      await page.click(
         'button[type="submit"], button:has-text("Login"), input[type="submit"]'
      );

      // Wait for redirect to owner panel
      await page.waitForURL(/.*\/owner/, { timeout: 10000 });

      // Verify we're on the owner panel
      await expect(page).toHaveURL(/.*\/owner/);

      // Wait for the page to load (should not be stuck in "Loading..." state)
      // Look for any content that indicates the page has loaded
      await page.waitForTimeout(3000); // Give it time to load

      // Check that we're not stuck in loading state
      const loadingText = page.locator("text=Loading...");
      const hasLoading = await loadingText.count();

      if (hasLoading > 0) {
         // If there's loading text, it should disappear within a reasonable time
         await expect(loadingText).toBeHidden({ timeout: 10000 });
      }

      // Verify the page has actual content (not just loading)
      // Look for common owner panel elements
      const hasContent = await page.locator("body").textContent();
      expect(hasContent).not.toBe("Loading...");
      expect(hasContent.length).toBeGreaterThan(50); // Should have substantial content

      console.log(
         "✅ Owner Panel loaded successfully without infinite loading"
      );
   });

   test("should maintain session on page refresh", async ({ page }) => {
      // First login
      await page.goto("http://localhost:3000/login?return_url=/owner");
      await page.fill(
         'input[name="email"], input[type="email"]',
         ownerCredentials.email
      );
      await page.fill(
         'input[name="password"], input[type="password"]',
         ownerCredentials.password
      );
      await page.click(
         'button[type="submit"], button:has-text("Login"), input[type="submit"]'
      );

      // Wait for owner panel to load
      await page.waitForURL(/.*\/owner/, { timeout: 10000 });

      // Refresh the page
      await page.reload();

      // Should still be on owner panel (not redirected to login)
      await expect(page).toHaveURL(/.*\/owner/);

      // Should not be stuck in loading
      await page.waitForTimeout(3000);
      const loadingText = page.locator("text=Loading...");
      const hasLoading = await loadingText.count();

      if (hasLoading > 0) {
         await expect(loadingText).toBeHidden({ timeout: 10000 });
      }

      console.log("✅ Session persisted after page refresh");
   });

   test("should logout successfully", async ({ page }) => {
      // First login
      await page.goto("http://localhost:3000/login?return_url=/owner");
      await page.fill(
         'input[name="email"], input[type="email"]',
         ownerCredentials.email
      );
      await page.fill(
         'input[name="password"], input[type="password"]',
         ownerCredentials.password
      );
      await page.click(
         'button[type="submit"], button:has-text("Login"), input[type="submit"]'
      );

      // Wait for owner panel to load
      await page.waitForURL(/.*\/owner/, { timeout: 10000 });

      // Find and click logout button
      const logoutButton = page.locator(
         'button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]'
      );
      await logoutButton.click();

      // Should redirect to login page
      await page.waitForURL(/.*login/, { timeout: 10000 });
      await expect(page).toHaveURL(/.*login/);

      console.log("✅ Logout successful");
   });

   test("should handle direct navigation to owner panel", async ({ page }) => {
      // First login normally
      await page.goto("http://localhost:3000/login");
      await page.fill(
         'input[name="email"], input[type="email"]',
         ownerCredentials.email
      );
      await page.fill(
         'input[name="password"], input[type="password"]',
         ownerCredentials.password
      );
      await page.click(
         'button[type="submit"], button:has-text("Login"), input[type="submit"]'
      );

      // Wait for initial redirect (might go to home first)
      await page.waitForTimeout(2000);

      // Now navigate directly to owner panel
      await page.goto("http://localhost:3000/owner");

      // Should load owner panel without issues
      await expect(page).toHaveURL(/.*\/owner/);

      // Should not be stuck in loading
      await page.waitForTimeout(3000);
      const loadingText = page.locator("text=Loading...");
      const hasLoading = await loadingText.count();

      if (hasLoading > 0) {
         await expect(loadingText).toBeHidden({ timeout: 10000 });
      }

      console.log("✅ Direct navigation to owner panel works");
   });
});
