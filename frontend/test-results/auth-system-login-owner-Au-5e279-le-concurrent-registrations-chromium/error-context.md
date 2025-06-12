# Test info

- Name: Auth System - Complete Registration & Authentication Tests >> should handle concurrent registrations
- Location: D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\login-owner.spec.js:256:4

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
    at D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\auth-system\login-owner.spec.js:291:59
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
  275 |       const registration2 = (async () => {
  276 |          await page2.goto(`${baseUrl}/register`);
  277 |          await page2.fill('input[name="name"]', "ConcurrentUser2");
  278 |          await page2.fill('input[name="email"]', "concurrent2@example.com");
  279 |          await page2.fill('input[name="password"]', "TestPassword123!");
  280 |          await page2.click('button[type="submit"]');
  281 |          await page2.waitForTimeout(3000);
  282 |          return page2.textContent("body");
  283 |       })();
  284 |
  285 |       const [result1, result2] = await Promise.all([
  286 |          registration1,
  287 |          registration2,
  288 |       ]);
  289 |
  290 |       // Both should succeed
> 291 |       expect(result1.includes("Registration successful")).toBeTruthy();
      |                                                           ^ Error: expect(received).toBeTruthy()
  292 |       expect(result2.includes("Registration successful")).toBeTruthy();
  293 |
  294 |       await context1.close();
  295 |       await context2.close();
  296 |    });
  297 | });
  298 |
```