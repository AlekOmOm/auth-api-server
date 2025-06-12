# Test info

- Name: Auth System - Owner Panel Access Tests >> should test backend session endpoint directly
- Location: D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\owner-panel-access.spec.js:180:4

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
    at D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\owner-panel-access.spec.js:195:34
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
- navigation
```

# Test source

```ts
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
> 195 |       expect(loginResponse.ok()).toBeTruthy();
      |                                  ^ Error: expect(received).toBeTruthy()
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
  226 |       await page.goto(`${baseUrl}/owner`);
  227 |       await page.waitForTimeout(3000);
  228 |
  229 |       // If there's an error state, test the retry button
  230 |       const retryButton = page.locator('button:has-text("🔄 Retry Loading")');
  231 |       if (await retryButton.isVisible()) {
  232 |          console.log("Found retry button, testing retry functionality...");
  233 |          await retryButton.click();
  234 |          await page.waitForTimeout(3000);
  235 |       }
  236 |
  237 |       // Should eventually show the Owner Panel successfully
  238 |       await expect(page.locator("h1")).toContainText("🏢 Owner Panel");
  239 |
  240 |       console.log("✅ Retry functionality test completed successfully!");
  241 |    });
  242 |
  243 |    test("should verify console logs show correct debugging information", async ({
  244 |       page,
  245 |    }) => {
  246 |       console.log("🧪 Testing console debug logs...");
  247 |
  248 |       const consoleLogs = [];
  249 |       page.on("console", (msg) => {
  250 |          // Ensure we only capture logs of type 'log' and containing the target string
  251 |          if (msg.type() === "log" && msg.text().includes("[OWNER PANEL]")) {
  252 |             consoleLogs.push(msg.text());
  253 |          }
  254 |       });
  255 |
  256 |       // Login and access Owner Panel
  257 |       await page.goto(`${baseUrl}/login`);
  258 |       await page.fill('input[name="email"]', testUsers.owner.email);
  259 |       await page.fill('input[name="password"]', testUsers.owner.password);
  260 |       await page.click('button[type="submit"]');
  261 |
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
```