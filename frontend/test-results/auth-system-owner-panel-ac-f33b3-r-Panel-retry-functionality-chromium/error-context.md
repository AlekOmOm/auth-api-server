# Test info

- Name: Auth System - Owner Panel Access Tests >> should test Owner Panel retry functionality
- Location: D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\owner-panel-access.spec.js:215:4

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toContainText(expected)

Locator: locator('h1')
Expected string: "🏢 Owner Panel"
Received: <element(s) not found>
Call log:
  - expect.toContainText with timeout 5000ms
  - waiting for locator('h1')

    at D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\owner-panel-access.spec.js:238:40
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
> 238 |       await expect(page.locator("h1")).toContainText("🏢 Owner Panel");
      |                                        ^ Error: Timed out 5000ms waiting for expect(locator).toContainText(expected)
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
```