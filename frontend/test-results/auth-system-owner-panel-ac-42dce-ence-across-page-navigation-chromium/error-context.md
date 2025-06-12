# Test info

- Name: Auth System - Owner Panel Access Tests >> should handle session persistence across page navigation
- Location: D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\owner-panel-access.spec.js:111:4

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toContainText(expected)

Locator: locator('h1')
Expected string: "Home"
Received: <element(s) not found>
Call log:
  - expect.toContainText with timeout 5000ms
  - waiting for locator('h1')

    at D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\owner-panel-access.spec.js:125:40
```

# Page snapshot

```yaml
- heading "Auth System" [level=2]
- heading "___" [level=2]
- textbox "email"
- textbox "password"
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
   59 |       await expect(page).toHaveURL(`${baseUrl}/home`);
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
> 125 |       await expect(page.locator("h1")).toContainText("Home");
      |                                        ^ Error: Timed out 5000ms waiting for expect(locator).toContainText(expected)
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
  160 |       await page.waitForTimeout(5000); // Give more time for component to load
  161 |
  162 |       // Should show authentication error or be redirected to login
  163 |       const currentUrl = page.url();
  164 |       if (currentUrl.includes("/owner")) {
  165 |          // If on owner page, should show error
  166 |          await expect(page.locator(".error")).toBeVisible();
  167 |          await expect(page.locator(".error p")).toContainText(
  168 |             "Authentication required to access owner panel"
  169 |          );
  170 |       } else {
  171 |          // If redirected to login, that's also valid
  172 |          await expect(
  173 |             page.getByRole("heading", { name: "Auth System" })
  174 |          ).toBeVisible();
  175 |       }
  176 |
  177 |       console.log("✅ Access denial test completed successfully!");
  178 |    });
  179 |
  180 |    test("should test backend session endpoint directly", async ({
  181 |       request,
  182 |    }) => {
  183 |       console.log("🧪 Testing backend session endpoint...");
  184 |
  185 |       // First login to get session
  186 |       const loginResponse = await request.post(`${backendUrl}/auth/login`, {
  187 |          data: {
  188 |             credentials: {
  189 |                email: testUsers.owner.email,
  190 |                password: testUsers.owner.password,
  191 |             },
  192 |          },
  193 |       });
  194 |
  195 |       expect(loginResponse.ok()).toBeTruthy();
  196 |       const loginData = await loginResponse.json();
  197 |       console.log("Login response:", JSON.stringify(loginData, null, 2));
  198 |
  199 |       // Test session endpoint
  200 |       const sessionResponse = await request.get(`${backendUrl}/auth/session`);
  201 |       expect(sessionResponse.ok()).toBeTruthy();
  202 |
  203 |       const sessionData = await sessionResponse.json();
  204 |       console.log("Session response:", JSON.stringify(sessionData, null, 2));
  205 |
  206 |       // Verify session data structure
  207 |       expect(sessionData.data).toBeDefined();
  208 |       expect(sessionData.data.role).toBeDefined();
  209 |       expect(sessionData.data.email).toBe(testUsers.owner.email);
  210 |       expect(["admin", "owner"]).toContain(sessionData.data.role);
  211 |
  212 |       console.log("✅ Backend session endpoint test completed successfully!");
  213 |    });
  214 |
  215 |    test("should test Owner Panel retry functionality", async ({ page }) => {
  216 |       console.log("🧪 Testing Owner Panel retry functionality...");
  217 |
  218 |       // Login first
  219 |       await page.goto(`${baseUrl}/login`);
  220 |       await page.fill('input[name="email"]', testUsers.owner.email);
  221 |       await page.fill('input[name="password"]', testUsers.owner.password);
  222 |       await page.click('button[type="submit"]');
  223 |       await page.waitForTimeout(2000);
  224 |
  225 |       // Go to Owner Panel
```