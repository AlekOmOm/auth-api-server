import { test, expect } from "@playwright/test";

test("simple test", async ({ page }) => {
   await page.goto("/");
   const headerTitleLocator = page.locator('h1:has-text("Auth System")');
   await expect(headerTitleLocator).toBeVisible();
   await expect(headerTitleLocator).toHaveText(" Auth System ");
});
