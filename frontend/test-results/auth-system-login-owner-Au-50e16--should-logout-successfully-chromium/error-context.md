# Test info

- Name: Auth System - Complete Registration & Authentication Tests >> should logout successfully
- Location: D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\login-owner.spec.js:165:4

# Error details

```
Error: Timed out 7000ms waiting for expect(locator).toHaveURL(expected)

Locator: locator(':root')
Expected string: "http://localhost:3000/owner"
Received string: "http://localhost:3000/login"
Call log:
  - expect.toHaveURL with timeout 7000ms
  - waiting for locator(':root')
    11 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://localhost:3000/login"

    at D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\login-owner.spec.js:174:26
```

# Page snapshot

```yaml
- heading "Auth System" [level=2]
- heading "___" [level=2]
- textbox "email": testowner@example.com
- textbox "password": TestPassword123!
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
  147 |
  148 |    test("should show error for invalid login", async ({ page }) => {
  149 |       await page.goto(`${baseUrl}/login`);
  150 |
  151 |       // Try invalid credentials
  152 |       await page.fill('input[name="email"]', "nonexistent@example.com");
  153 |       await page.fill('input[name="password"]', "wrongpassword");
  154 |       await page.click('button[type="submit"]');
  155 |
  156 |       await page.waitForTimeout(2000);
  157 |       const bodyText = await page.textContent("body");
  158 |       expect(
  159 |          bodyText.includes("failed") ||
  160 |             bodyText.includes("error") ||
  161 |             bodyText.includes("invalid")
  162 |       ).toBeTruthy();
  163 |    });
  164 |
  165 |    test("should logout successfully", async ({ page }) => {
  166 |       // First login
  167 |       await page.goto(`${baseUrl}/login`);
  168 |       await page.fill('input[name="email"]', "testowner@example.com"); // Assuming this is an owner
  169 |       await page.fill('input[name="password"]', "TestPassword123!");
  170 |       await page.click('button[type="submit"]');
  171 |
  172 |       // Wait for navigation to owner panel (assuming "testowner@example.com" is an owner)
  173 |       // Increased timeout slightly for potentially slower CI environments or initial load after fixes
> 174 |       await expect(page).toHaveURL(`${baseUrl}/owner`, { timeout: 7000 });
      |                          ^ Error: Timed out 7000ms waiting for expect(locator).toHaveURL(expected)
  175 |
  176 |       // Wait for the logout button to be visible and then click
  177 |       const logoutButton = page.locator('button#logout:has-text("logout")');
  178 |       await expect(logoutButton).toBeVisible({ timeout: 5000 });
  179 |       await logoutButton.click();
  180 |
  181 |       // Wait for logout to process and redirect (e.g., back to login page)
  182 |       // The original test checked body text for "login" or "register" which implies /login or / or /register.
  183 |       // Let's explicitly wait for a URL that indicates logged-out state.
  184 |       // Common practice is redirect to /login.
  185 |       await expect(page).toHaveURL(new RegExp(`${baseUrl}/(login)?$`), {
  186 |          timeout: 5000,
  187 |       }); // Matches / or /login
  188 |
  189 |       // Original check for page content
  190 |       const bodyText = await page.textContent("body");
  191 |       expect(
  192 |          bodyText.includes("login") || bodyText.includes("register")
  193 |       ).toBeTruthy();
  194 |    });
  195 |
  196 |    test("should test backend registration API directly", async ({
  197 |       request,
  198 |    }) => {
  199 |       // Test registration endpoint directly with valid data
  200 |       const response = await request.post(`${backendUrl}/api/auth/register`, {
  201 |          data: {
  202 |             name: "DirectTestUser",
  203 |             email: "directtest@example.com",
  204 |             password: "TestPassword123!",
  205 |             role: "user",
  206 |          },
  207 |       });
  208 |
  209 |       const responseData = await response.text();
  210 |       console.log("Registration API Response Status:", response.status());
  211 |       console.log("Registration API Response:", responseData);
  212 |
  213 |       // Should be success (201) or user already exists (400)
  214 |       expect([201, 400].includes(response.status())).toBeTruthy();
  215 |    });
  216 |
  217 |    test("should test backend login API directly", async ({ request }) => {
  218 |       // Test login endpoint directly
  219 |       const response = await request.post(`${backendUrl}/api/auth/login`, {
  220 |          data: {
  221 |             credentials: {
  222 |                email: "guitestowner@example.com",
  223 |                password: "GUITestPassword123!",
  224 |             },
  225 |          },
  226 |       });
  227 |
  228 |       const responseData = await response.text();
  229 |       console.log("Login API Response Status:", response.status());
  230 |       console.log("Login API Response:", responseData);
  231 |
  232 |       expect([200, 401].includes(response.status())).toBeTruthy();
  233 |    });
  234 |
  235 |    test("should access owner panel after owner login", async ({ page }) => {
  236 |       // Login as existing owner
  237 |       await page.goto(`${baseUrl}/login`);
  238 |       await page.fill('input[name="email"]', "guitestowner@example.com");
  239 |       await page.fill('input[name="password"]', "GUITestPassword123!");
  240 |       await page.click('button[type="submit"]');
  241 |
  242 |       await page.waitForTimeout(3000);
  243 |
  244 |       // Should be redirected to owner panel
  245 |       await expect(page).toHaveURL(`${baseUrl}/owner`);
  246 |
  247 |       // Should see owner panel content
  248 |       const bodyText = await page.textContent("body");
  249 |       expect(
  250 |          bodyText.includes("Owner") ||
  251 |             bodyText.includes("manage") ||
  252 |             bodyText.includes("client")
  253 |       ).toBeTruthy();
  254 |    });
  255 |
  256 |    test("should handle concurrent registrations", async ({ browser }) => {
  257 |       // Test multiple concurrent registrations
  258 |       const context1 = await browser.newContext();
  259 |       const context2 = await browser.newContext();
  260 |
  261 |       const page1 = await context1.newPage();
  262 |       const page2 = await context2.newPage();
  263 |
  264 |       // Register two different users concurrently
  265 |       const registration1 = (async () => {
  266 |          await page1.goto(`${baseUrl}/register`);
  267 |          await page1.fill('input[name="name"]', "ConcurrentUser1");
  268 |          await page1.fill('input[name="email"]', "concurrent1@example.com");
  269 |          await page1.fill('input[name="password"]', "TestPassword123!");
  270 |          await page1.click('button[type="submit"]');
  271 |          await page1.waitForTimeout(3000);
  272 |          return page1.textContent("body");
  273 |       })();
  274 |
```