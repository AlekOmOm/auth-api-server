# Test info

- Name: Auth System - Complete Registration & Authentication Tests >> should login existing owner
- Location: D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\login-owner.spec.js:110:4

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "http://localhost:3000/owner"
Received: "http://localhost:3000/login"
    at D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\login-owner.spec.js:125:19
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
   46 |       await expect(successMessageLocator).toBeVisible({ timeout: 5000 });
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
> 125 |       expect(url).toBe(`${baseUrl}/owner`);
      |                   ^ Error: expect(received).toBe(expected) // Object.is equality
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
  174 |       await expect(page).toHaveURL(`${baseUrl}/owner`, { timeout: 7000 });
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
```