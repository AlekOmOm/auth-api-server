# Test info

- Name: Auth System - Owner Panel Access Tests >> should logout successfully from Owner Panel
- Location: D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\owner-panel-access.spec.js:352:4

# Error details

```
Error: Timed out 7000ms waiting for expect(locator).toHaveURL(expected)

Locator: locator(':root')
Expected string: "http://localhost:3000/home"
Received string: "http://localhost:3000/login"
Call log:
  - expect.toHaveURL with timeout 7000ms
  - waiting for locator(':root')
    11 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://localhost:3000/login"

    at D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\owner-panel-access.spec.js:362:26
```

# Page snapshot

```yaml
- heading "Auth System" [level=2]
- heading "___" [level=2]
- textbox "email": guitestowner@example.com
- textbox "password": GUITestPassword123!
- paragraph: Login failed.
- button "login"
- navigation:
  - paragraph: don't have an account?
  - link "register":
    - /url: /register
- navigation:
  - link "login":
    - /url: /login
  - link "register":
    - /url: /register
```

# Test source

```ts
  262 |       // Wait for navigation to home after login, as per other tests
  263 |       await expect(page).toHaveURL(`${baseUrl}/home`, { timeout: 7000 });
  264 |
  265 |       // Navigate to Owner Panel
  266 |       await page.goto(`${baseUrl}/owner`);
  267 |       // Wait for the Owner Panel to actually load its main content
  268 |       await expect(page.locator("h1")).toContainText("🏢 Owner Panel", {
  269 |          timeout: 7000,
  270 |       });
  271 |
  272 |       // Wait specifically for at least one relevant console log to be captured.
  273 |       // This polls the consoleLogs array until the condition is met or timeout.
  274 |       try {
  275 |          await page.waitForFunction(
  276 |             () =>
  277 |                window.consoleMessages &&
  278 |                window.consoleMessages.some((msg) =>
  279 |                   msg.includes("[OWNER PANEL]")
  280 |                ),
  281 |             { timeout: 5000 }
  282 |          );
  283 |          // Playwright's page.on('console') updates the consoleLogs array in the Node.js context.
  284 |          // We need to wait for that array to populate.
  285 |          await page.waitForFunction(() => consoleLogs.length > 0, {
  286 |             timeout: 5000,
  287 |          });
  288 |       } catch (e) {
  289 |          console.log(
  290 |             "Timed out waiting for console logs. Captured logs:",
  291 |             consoleLogs
  292 |          );
  293 |          // The test will likely fail on the expect below, which is fine.
  294 |       }
  295 |
  296 |       // Check that our debug logs are present
  297 |       const ownerPanelLogs = consoleLogs.filter((log) =>
  298 |          log.includes("[OWNER PANEL]")
  299 |       );
  300 |
  301 |       if (ownerPanelLogs.length === 0) {
  302 |          console.log(
  303 |             "No [OWNER PANEL] logs found after explicit waits, all console logs captured by page.on:",
  304 |             consoleLogs
  305 |          );
  306 |       }
  307 |       expect(ownerPanelLogs.length).toBeGreaterThan(0);
  308 |
  309 |       console.log("Relevant [OWNER PANEL] logs captured:", ownerPanelLogs);
  310 |       console.log("✅ Console debug logs test completed successfully!");
  311 |    });
  312 |
  313 |    test("should test complete user workflow: login -> owner panel -> create client server", async ({
  314 |       page,
  315 |    }) => {
  316 |       console.log("🧪 Testing complete user workflow...");
  317 |
  318 |       // Step 1: Login
  319 |       await page.goto(`${baseUrl}/login`);
  320 |       await page.fill('input[name="email"]', testUsers.owner.email);
  321 |       await page.fill('input[name="password"]', testUsers.owner.password);
  322 |       await page.click('button[type="submit"]');
  323 |       await page.waitForTimeout(2000);
  324 |
  325 |       // Step 2: Access Owner Panel
  326 |       await page.goto(`${baseUrl}/owner`);
  327 |       await page.waitForTimeout(5000);
  328 |       await expect(page.locator("h1")).toContainText("🏢 Owner Panel");
  329 |
  330 |       // Step 3: Try to open Create Client Server modal
  331 |       const createButton = page.locator(
  332 |          'button:has-text("Create New Client Server")'
  333 |       );
  334 |       if (await createButton.isVisible()) {
  335 |          await createButton.click();
  336 |          await page.waitForTimeout(1000);
  337 |
  338 |          // Check if modal appears
  339 |          const modal = page.locator('[role="dialog"]');
  340 |          if (await modal.isVisible()) {
  341 |             // Close modal for now
  342 |             const closeButton = page.locator('button:has-text("Cancel")');
  343 |             if (await closeButton.isVisible()) {
  344 |                await closeButton.click();
  345 |             }
  346 |          }
  347 |       }
  348 |
  349 |       console.log("✅ Complete user workflow test completed successfully!");
  350 |    });
  351 |
  352 |    test("should logout successfully from Owner Panel", async ({ page }) => {
  353 |       console.log("🧪 Testing logout from Owner Panel...");
  354 |
  355 |       // Login and access Owner Panel
  356 |       await page.goto(`${baseUrl}/login`);
  357 |       await page.fill('input[name="email"]', testUsers.owner.email);
  358 |       await page.fill('input[name="password"]', testUsers.owner.password);
  359 |       await page.click('button[type="submit"]');
  360 |
  361 |       // Expect owner to be redirected to /home first as per other tests in this file
> 362 |       await expect(page).toHaveURL(`${baseUrl}/home`, { timeout: 7000 });
      |                          ^ Error: Timed out 7000ms waiting for expect(locator).toHaveURL(expected)
  363 |
  364 |       // Navigate to Owner Panel
  365 |       await page.goto(`${baseUrl}/owner`);
  366 |       await expect(page.locator("h1")).toContainText("🏢 Owner Panel", {
  367 |          timeout: 5000,
  368 |       });
  369 |
  370 |       // Logout using the specific logout button ID
  371 |       const logoutButton = page.locator("button#logout"); // Footer.svelte uses id="logout"
  372 |       await expect(logoutButton).toBeVisible({ timeout: 5000 });
  373 |       await logoutButton.click();
  374 |
  375 |       // Should be redirected to login page by ProtectedRoute
  376 |       await expect(page).toHaveURL(`${baseUrl}/login`, { timeout: 7000 });
  377 |
  378 |       // Optionally, verify some element on the login page to confirm
  379 |       await expect(page.getByRole("button", { name: "login" })).toBeVisible();
  380 |
  381 |       // Try to access Owner Panel after logout - should be denied and redirect to login
  382 |       await page.goto(`${baseUrl}/owner`);
  383 |       // ProtectedRoute should redirect to /login. Check if it does.
  384 |       await expect(page).toHaveURL(`${baseUrl}/login`, { timeout: 7000 });
  385 |       // And confirm a login-related element is visible on the login page
  386 |       await expect(page.getByRole("button", { name: "login" })).toBeVisible();
  387 |
  388 |       console.log("✅ Logout test completed successfully!");
  389 |    });
  390 | });
  391 |
```