# Test info

- Name: Auth System - Owner Panel Access Tests >> should successfully login auth-system owner and access Owner Panel
- Location: D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\owner-panel-access.spec.js:37:4

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toHaveURL(expected)

Locator: locator(':root')
Expected string: "http://localhost:3000/home"
Received string: "http://localhost:3000/login"
Call log:
  - expect.toHaveURL with timeout 5000ms
  - waiting for locator(':root')
    9 × locator resolved to <html lang="en">…</html>
      - unexpected value "http://localhost:3000/login"

    at D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\owner-panel-access.spec.js:59:26
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
   1 | import { test, expect } from "@playwright/test";
   2 |
   3 | test.describe("Auth System - Owner Panel Access Tests", () => {
   4 |    const baseUrl = "http://localhost:3000";
   5 |    const backendUrl = "http://localhost:3001/api";
   6 |
   7 |    // Test credentials for different user types
   8 |    const testUsers = {
   9 |       owner: {
   10 |          email: "guitestowner@example.com",
   11 |          password: "GUITestPassword123!",
   12 |          expectedRole: "admin",
   13 |       },
   14 |       existingOwner: {
   15 |          email: "owner@example.com",
   16 |          password: "password123",
   17 |          expectedRole: "owner",
   18 |       },
   19 |       clientUser: {
   20 |          email: "clientuser@example.com",
   21 |          password: "ClientPassword123!",
   22 |          expectedRole: "user",
   23 |       },
   24 |    };
   25 |
   26 |    test.beforeEach(async ({ page }) => {
   27 |       await page.goto(baseUrl);
   28 |
   29 |       // Log out if already logged in
   30 |       const logoutButton = page.locator('button:has-text("logout")');
   31 |       if (await logoutButton.isVisible()) {
   32 |          await logoutButton.click();
   33 |          await page.waitForTimeout(1000);
   34 |       }
   35 |    });
   36 |
   37 |    test("should successfully login auth-system owner and access Owner Panel", async ({
   38 |       page,
   39 |    }) => {
   40 |       console.log(
   41 |          "🧪 Testing auth-system owner login and Owner Panel access..."
   42 |       );
   43 |
   44 |       // Step 1: Navigate to login page
   45 |       await page.goto(`${baseUrl}/login`);
   46 |       await expect(
   47 |          page.getByRole("heading", { name: "Auth System" })
   48 |       ).toBeVisible();
   49 |
   50 |       // Step 2: Login with owner credentials
   51 |       await page.fill('input[name="email"]', testUsers.owner.email);
   52 |       await page.fill('input[name="password"]', testUsers.owner.password);
   53 |
   54 |       console.log("🔑 Logging in with owner credentials...");
   55 |       await page.click('button[type="submit"]');
   56 |
   57 |       // Step 3: Wait for redirect and verify successful login
   58 |       await page.waitForTimeout(3000);
>  59 |       await expect(page).toHaveURL(`${baseUrl}/home`);
      |                          ^ Error: Timed out 5000ms waiting for expect(locator).toHaveURL(expected)
   60 |       await expect(page.locator("h1")).toContainText("Home");
   61 |
   62 |       console.log("✅ Login successful, now testing Owner Panel access...");
   63 |
   64 |       // Step 4: Navigate to Owner Panel
   65 |       await page.goto(`${baseUrl}/owner`);
   66 |
   67 |       // Wait for the component to load and reactive effects to complete
   68 |       await page.waitForTimeout(5000);
   69 |
   70 |       // Step 5: Verify Owner Panel loads successfully
   71 |       await expect(page.locator("h1")).toContainText("🏢 Owner Panel");
   72 |       await expect(page.locator(".subtitle")).toContainText(
   73 |          "Manage your client servers and users"
   74 |       );
   75 |
   76 |       // Step 6: First check if we have an error state and retry if needed
   77 |       const errorSection = page.locator(".error");
   78 |       const retryButton = page.locator('button:has-text("🔄 Retry Loading")');
   79 |
   80 |       if (await errorSection.isVisible()) {
   81 |          console.log("⚠️ Error state detected, attempting retry...");
   82 |          if (await retryButton.isVisible()) {
   83 |             await retryButton.click();
   84 |             await page.waitForTimeout(3000);
   85 |          }
   86 |       }
   87 |
   88 |       // Step 7: Verify the main content loads (no authentication error)
   89 |       await expect(errorSection).not.toBeVisible();
   90 |
   91 |       // Step 8: Verify admin badge is shown for this user
   92 |       await expect(page.locator(".admin-badge")).toBeVisible();
   93 |       await expect(page.locator(".admin-badge")).toContainText(
   94 |          "🔧 System Administrator"
   95 |       );
   96 |
   97 |       // Step 8: Verify client servers section is visible
   98 |       await expect(page.locator(".client-servers-section")).toBeVisible();
   99 |       await expect(
  100 |          page.getByRole("heading", { name: "📱 Your Client Servers" })
  101 |       ).toBeVisible();
  102 |
  103 |       // Step 9: Verify create button is present
  104 |       await expect(
  105 |          page.locator('button:has-text("Create New Client Server")')
  106 |       ).toBeVisible();
  107 |
  108 |       console.log("✅ Owner Panel access test completed successfully!");
  109 |    });
  110 |
  111 |    test("should handle session persistence across page navigation", async ({
  112 |       page,
  113 |    }) => {
  114 |       console.log("🧪 Testing session persistence...");
  115 |
  116 |       // Login first
  117 |       await page.goto(`${baseUrl}/login`);
  118 |       await page.fill('input[name="email"]', testUsers.owner.email);
  119 |       await page.fill('input[name="password"]', testUsers.owner.password);
  120 |       await page.click('button[type="submit"]');
  121 |       await page.waitForTimeout(2000);
  122 |
  123 |       // Navigate between pages to test session persistence
  124 |       await page.goto(`${baseUrl}/home`);
  125 |       await expect(page.locator("h1")).toContainText("Home");
  126 |
  127 |       await page.goto(`${baseUrl}/owner`);
  128 |       await page.waitForTimeout(3000);
  129 |       await expect(page.locator("h1")).toContainText("🏢 Owner Panel");
  130 |
  131 |       // Navigate back to home
  132 |       await page.goto(`${baseUrl}/home`);
  133 |       await expect(page.locator("h1")).toContainText("Home");
  134 |
  135 |       // Return to owner panel - should still work
  136 |       await page.goto(`${baseUrl}/owner`);
  137 |       await page.waitForTimeout(3000);
  138 |       await expect(page.locator("h1")).toContainText("🏢 Owner Panel");
  139 |
  140 |       console.log("✅ Session persistence test completed successfully!");
  141 |    });
  142 |
  143 |    test("should deny Owner Panel access to non-admin users", async ({
  144 |       page,
  145 |    }) => {
  146 |       console.log(
  147 |          "🧪 Testing Owner Panel access denial for non-admin users..."
  148 |       );
  149 |
  150 |       // Ensure we're logged out first
  151 |       await page.goto(baseUrl);
  152 |       const logoutButton = page.locator('button:has-text("logout")');
  153 |       if (await logoutButton.isVisible()) {
  154 |          await logoutButton.click();
  155 |          await page.waitForTimeout(1000);
  156 |       }
  157 |
  158 |       // Try to access Owner Panel without login
  159 |       await page.goto(`${baseUrl}/owner`);
```