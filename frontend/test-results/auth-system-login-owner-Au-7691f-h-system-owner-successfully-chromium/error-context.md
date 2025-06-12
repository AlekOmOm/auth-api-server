# Test info

- Name: Auth System - Complete Registration & Authentication Tests >> should register auth system owner successfully
- Location: D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\login-owner.spec.js:28:4

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: locator('div.success-message')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for locator('div.success-message')

    at D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\login-owner.spec.js:46:43
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
- textbox "email": playwrightowner_1749642030210@example.com
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
   17 |       await expect(
   18 |          page.getByRole("heading", { name: "Auth System" })
   19 |       ).toContainText("Auth System");
   20 |    });
   21 |
   22 |    test("should navigate to registration page", async ({ page }) => {
   23 |       await page.click('a[href="/register"]');
   24 |       await expect(page).toHaveURL(`${baseUrl}/register`);
   25 |       await expect(page.getByRole("heading", { name: "___" })).toBeVisible();
   26 |    });
   27 |
   28 |    test("should register auth system owner successfully", async ({ page }) => {
   29 |       // Navigate to registration
   30 |       await page.goto(`${baseUrl}/register`);
   31 |
   32 |       // Select Auth System Owner account type
   33 |       await page.click('input[value="auth"]');
   34 |
   35 |       const ownerEmail = `playwrightowner_${Date.now()}@example.com`;
   36 |       // Fill out registration form with valid data
   37 |       await page.fill('input[name="name"]', "PlaywrightOwner");
   38 |       await page.fill('input[name="email"]', ownerEmail);
   39 |       await page.fill('input[name="password"]', "TestPassword123!");
   40 |
   41 |       // Submit registration
   42 |       await page.click('button[type="submit"]');
   43 |
   44 |       // Wait for the success message to appear
   45 |       const successMessageLocator = page.locator("div.success-message");
>  46 |       await expect(successMessageLocator).toBeVisible({ timeout: 5000 });
      |                                           ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
   47 |       await expect(successMessageLocator).toContainText(
   48 |          "Registration successful! Please log in."
   49 |       );
   50 |
   51 |       // Wait for navigation to login page (occurs after 2s in Register.svelte)
   52 |       await expect(page).toHaveURL(
   53 |          new RegExp(`${baseUrl}/login(\?return_url=.*)?`),
   54 |          { timeout: 5000 }
   55 |       );
   56 |    });
   57 |
   58 |    test("should login with newly created auth system owner", async ({
   59 |       page,
   60 |    }) => {
   61 |       // Navigate to login page
   62 |       await page.goto(`${baseUrl}/login`);
   63 |
   64 |       // Fill login form with auth system owner credentials
   65 |       await page.fill('input[name="email"]', "playwrightowner@example.com");
   66 |       await page.fill('input[name="password"]', "TestPassword123!");
   67 |
   68 |       // Submit login
   69 |       await page.click('button[type="submit"]');
   70 |
   71 |       // Should redirect to home page
   72 |       await page.waitForTimeout(3000);
   73 |
   74 |       // Check for successful login indicators
   75 |       await expect(page).toHaveURL(`${baseUrl}/home`);
   76 |       await expect(page.locator("h1")).toContainText("Home");
   77 |       await expect(page.locator("button")).toContainText("logout");
   78 |    });
   79 |
   80 |    test("should register client app user successfully", async ({ page }) => {
   81 |       // Navigate to registration
   82 |       await page.goto(`${baseUrl}/register`);
   83 |
   84 |       // Client App User is selected by default, so no need to click
   85 |
   86 |       const clientUserEmail = `playwrightuser_${Date.now()}@example.com`;
   87 |       // Fill out registration form
   88 |       await page.fill('input[name="name"]', "PlaywrightUser");
   89 |       await page.fill('input[name="email"]', clientUserEmail);
   90 |       await page.fill('input[name="password"]', "TestPassword123!");
   91 |
   92 |       // Submit registration
   93 |       await page.click('button[type="submit"]');
   94 |
   95 |       // Wait for the success message to appear
   96 |       const successMessageLocator = page.locator("div.success-message");
   97 |       await expect(successMessageLocator).toBeVisible({ timeout: 5000 });
   98 |       await expect(successMessageLocator).toContainText(
   99 |          "Registration successful! Please log in."
  100 |       );
  101 |
  102 |       // Wait for navigation to login page (occurs after 2s in Register.svelte)
  103 |       // The return_url might be present if the registration was initiated from a client app redirect context
  104 |       await expect(page).toHaveURL(
  105 |          new RegExp(`${baseUrl}/login(\?return_url=.*)?`),
  106 |          { timeout: 5000 }
  107 |       );
  108 |    });
  109 |
  110 |    test("should login existing owner", async ({ page }) => {
  111 |       // Navigate to login page
  112 |       await page.goto(`${baseUrl}/login`);
  113 |
  114 |       // Fill login form with existing owner credentials
  115 |       await page.fill('input[name="email"]', "guitestowner@example.com");
  116 |       await page.fill('input[name="password"]', "GUITestPassword123!");
  117 |
  118 |       // Submit login
  119 |       await page.click('button[type="submit"]');
  120 |
  121 |       // Should redirect to owner panel
  122 |       await page.waitForTimeout(3000);
  123 |
  124 |       const url = page.url();
  125 |       expect(url).toBe(`${baseUrl}/owner`);
  126 |    });
  127 |
  128 |    test("should show validation errors for invalid registration", async ({
  129 |       page,
  130 |    }) => {
  131 |       await page.goto(`${baseUrl}/register`);
  132 |
  133 |       // Try to submit form with invalid data
  134 |       await page.fill('input[name="name"]', "123"); // Numbers not allowed
  135 |       await page.fill('input[name="email"]', "invalid-email");
  136 |       await page.fill('input[name="password"]', "123"); // Too short
  137 |
  138 |       await page.click('button[type="submit"]');
  139 |
  140 |       // Should show validation errors
  141 |       await page.waitForTimeout(2000);
  142 |       const bodyText = await page.textContent("body");
  143 |       expect(
  144 |          bodyText.includes("failed") || bodyText.includes("error")
  145 |       ).toBeTruthy();
  146 |    });
```