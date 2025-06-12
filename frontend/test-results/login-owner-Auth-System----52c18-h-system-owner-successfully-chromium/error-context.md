# Test info

- Name: Auth System - Complete Registration & Authentication Tests >> should register auth system owner successfully
- Location: D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\login-owner.spec.js:31:4

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toContainText(expected)

Locator: locator('body')
- Expected string  - 1
+ Received string  + 6

- Registration successful
+
+   Auth System  ___ Account Type:  Client App User For using client applications (Trading Simulator, etc.)  Auth System Owner For managing client applications and users     Registration failed register already have an account? login    login register
+   
+
+
+
Call log:
  - expect.toContainText with timeout 5000ms
  - waiting for locator('body')
    9 × locator resolved to <body>…</body>
      - unexpected value "
  Auth System  ___ Account Type:  Client App User For using client applications (Trading Simulator, etc.)  Auth System Owner For managing client applications and users     Registration failed register already have an account? login    login register
  


"

    at D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\login-owner.spec.js:50:42
```

# Page snapshot

```yaml
- heading "Auth System" [level=2]
- heading "___" [level=2]
- group "Account Type:":
  - text: "Account Type:"
  - radio "Client App User For using client applications (Trading Simulator, etc.)"
  - strong: Client App User
  - text: For using client applications (Trading Simulator, etc.)
  - radio "Auth System Owner For managing client applications and users" [checked]
  - strong: Auth System Owner
  - text: For managing client applications and users
- textbox "name": PlaywrightOwner
- textbox "email": playwrightowner@example.com
- textbox "password (must be strong)": TestPassword123!
- paragraph: Registration failed
- button "register"
- navigation:
  - paragraph: already have an account?
  - link "login":
    - /url: /login
- navigation:
  - link "login":
    - /url: /login
  - link "register":
    - /url: /register
```

# Test source

```ts
   1 | // playwright test for login of owner
   2 |
   3 | // if owner is not logged in, login as owner
   4 | // if no registered owner, register owner
   5 |
   6 | import { test, expect } from "@playwright/test";
   7 |
   8 | test.describe("Auth System - Complete Registration & Authentication Tests", () => {
   9 |    const baseUrl = "http://localhost:3000";
   10 |    const backendUrl = "http://localhost:3001";
   11 |
   12 |    test.beforeEach(async ({ page }) => {
   13 |       await page.goto(baseUrl);
   14 |    });
   15 |
   16 |    test("should display auth system homepage", async ({ page }) => {
   17 |       await page.waitForSelector("#app > *", { timeout: 10000 }); // Wait for Svelte app to mount
   18 |       await expect(
   19 |          page.getByRole("heading", { name: "Auth System" })
   20 |       ).toBeVisible();
   21 |    });
   22 |
   23 |    test("should navigate to registration page", async ({ page }) => {
   24 |       await page.click('a[href="/register"]');
   25 |       await expect(page).toHaveURL(`${baseUrl}/register`);
   26 |       await expect(
   27 |          page.getByRole("heading", { name: "___", level: 2 })
   28 |       ).toBeVisible();
   29 |    });
   30 |
   31 |    test("should register auth system owner successfully", async ({ page }) => {
   32 |       // Navigate to registration
   33 |       await page.goto(`${baseUrl}/register`);
   34 |
   35 |       // Select Auth System Owner account type
   36 |       await page.click('input[value="auth"]');
   37 |
   38 |       // Fill out registration form with valid data
   39 |       await page.fill('input[name="name"]', "PlaywrightOwner");
   40 |       await page.fill('input[name="email"]', "playwrightowner@example.com");
   41 |       await page.fill('input[name="password"]', "TestPassword123!");
   42 |
   43 |       // Submit registration
   44 |       await page.click('button[type="submit"]');
   45 |
   46 |       // Wait for response and check for success message
   47 |       await page.waitForTimeout(3000);
   48 |
   49 |       // Should show success message
>  50 |       await expect(page.locator("body")).toContainText(
      |                                          ^ Error: Timed out 5000ms waiting for expect(locator).toContainText(expected)
   51 |          "Registration successful"
   52 |       );
   53 |    });
   54 |
   55 |    test("should login with newly created auth system owner", async ({
   56 |       page,
   57 |    }) => {
   58 |       // Navigate to login page
   59 |       await page.goto(`${baseUrl}/login`);
   60 |
   61 |       // Fill login form with auth system owner credentials
   62 |       await page.fill('input[name="email"]', "testowner@example.com");
   63 |       await page.fill('input[name="password"]', "TestPassword123!");
   64 |
   65 |       // Submit login
   66 |       await page.click('button[type="submit"]');
   67 |
   68 |       // Should redirect to home page
   69 |       await page.waitForTimeout(3000);
   70 |
   71 |       // Check for successful login indicators
   72 |       await expect(page).toHaveURL(`${baseUrl}/home`);
   73 |       await expect(page.locator("h1")).toContainText("Home");
   74 |       await expect(page.locator("button")).toContainText("logout");
   75 |    });
   76 |
   77 |    test("should register client app user successfully", async ({ page }) => {
   78 |       // Navigate to registration
   79 |       await page.goto(`${baseUrl}/register`);
   80 |
   81 |       // Client App User is selected by default, so no need to click
   82 |
   83 |       // Fill out registration form
   84 |       await page.fill('input[name="name"]', "PlaywrightUser");
   85 |       await page.fill('input[name="email"]', "playwrightuser@example.com");
   86 |       await page.fill('input[name="password"]', "TestPassword123!");
   87 |
   88 |       // Submit registration
   89 |       await page.click('button[type="submit"]');
   90 |
   91 |       // Should show success message
   92 |       await page.waitForTimeout(3000);
   93 |       await expect(page.locator("body")).toContainText(
   94 |          "Registration successful"
   95 |       );
   96 |    });
   97 |
   98 |    test("should login existing owner", async ({ page }) => {
   99 |       // Navigate to login page
  100 |       await page.goto(`${baseUrl}/login`);
  101 |
  102 |       // Fill login form with existing owner credentials
  103 |       await page.fill('input[name="email"]', "owner@example.com");
  104 |       await page.fill('input[name="password"]', "password123");
  105 |
  106 |       // Submit login
  107 |       await page.click('button[type="submit"]');
  108 |
  109 |       // Should redirect to owner panel
  110 |       await page.waitForTimeout(3000);
  111 |
  112 |       const url = page.url();
  113 |       expect(url).toBe(`${baseUrl}/owner`);
  114 |    });
  115 |
  116 |    test("should show validation errors for invalid registration", async ({
  117 |       page,
  118 |    }) => {
  119 |       await page.goto(`${baseUrl}/register`);
  120 |
  121 |       // Try to submit form with invalid data
  122 |       await page.fill('input[name="name"]', "123"); // Numbers not allowed
  123 |       await page.fill('input[name="email"]', "invalid-email");
  124 |       await page.fill('input[name="password"]', "123"); // Too short
  125 |
  126 |       await page.click('button[type="submit"]');
  127 |
  128 |       // Should show validation errors
  129 |       await page.waitForTimeout(2000);
  130 |       const bodyText = await page.textContent("body");
  131 |       expect(
  132 |          bodyText.includes("failed") || bodyText.includes("error")
  133 |       ).toBeTruthy();
  134 |    });
  135 |
  136 |    test("should show error for invalid login", async ({ page }) => {
  137 |       await page.goto(`${baseUrl}/login`);
  138 |
  139 |       // Try invalid credentials
  140 |       await page.fill('input[name="email"]', "nonexistent@example.com");
  141 |       await page.fill('input[name="password"]', "wrongpassword");
  142 |       await page.click('button[type="submit"]');
  143 |
  144 |       await page.waitForTimeout(2000);
  145 |       const bodyText = await page.textContent("body");
  146 |       expect(
  147 |          bodyText.includes("failed") ||
  148 |             bodyText.includes("error") ||
  149 |             bodyText.includes("invalid")
  150 |       ).toBeTruthy();
```