# Test info

- Name: Auth System - Complete Registration & Authentication Tests >> should access owner panel after owner login
- Location: D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\login-owner.spec.js:213:4

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toHaveURL(expected)

Locator: locator(':root')
Expected string: "http://localhost:3000/owner"
Received string: "http://localhost:3000/login"
Call log:
  - expect.toHaveURL with timeout 5000ms
  - waiting for locator(':root')
    9 × locator resolved to <html lang="en">…</html>
      - unexpected value "http://localhost:3000/login"

    at D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\login-owner.spec.js:223:26
```

# Page snapshot

```yaml
- heading "Auth System" [level=2]
- heading "___" [level=2]
- textbox "email": owner@example.com
- textbox "password": password123
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
  151 |    });
  152 |
  153 |    test("should logout successfully", async ({ page }) => {
  154 |       // First login
  155 |       await page.goto(`${baseUrl}/login`);
  156 |       await page.fill('input[name="email"]', "testowner@example.com");
  157 |       await page.fill('input[name="password"]', "TestPassword123!");
  158 |       await page.click('button[type="submit"]');
  159 |
  160 |       await page.waitForTimeout(2000);
  161 |
  162 |       // Then logout
  163 |       await page.click('button:has-text("logout")');
  164 |
  165 |       await page.waitForTimeout(2000);
  166 |
  167 |       // Should redirect to login or home page without authentication
  168 |       const bodyText = await page.textContent("body");
  169 |       expect(
  170 |          bodyText.includes("login") || bodyText.includes("register")
  171 |       ).toBeTruthy();
  172 |    });
  173 |
  174 |    test("should test backend registration API directly", async ({
  175 |       request,
  176 |    }) => {
  177 |       // Test registration endpoint directly with valid data
  178 |       const response = await request.post(`${backendUrl}/api/auth/register`, {
  179 |          data: {
  180 |             name: "DirectTestUser",
  181 |             email: "directtest@example.com",
  182 |             password: "TestPassword123!",
  183 |             role: "user",
  184 |          },
  185 |       });
  186 |
  187 |       const responseData = await response.text();
  188 |       console.log("Registration API Response Status:", response.status());
  189 |       console.log("Registration API Response:", responseData);
  190 |
  191 |       // Should be success (201) or user already exists (400)
  192 |       expect([201, 400].includes(response.status())).toBeTruthy();
  193 |    });
  194 |
  195 |    test("should test backend login API directly", async ({ request }) => {
  196 |       // Test login endpoint directly
  197 |       const response = await request.post(`${backendUrl}/api/auth/login`, {
  198 |          data: {
  199 |             credentials: {
  200 |                email: "owner@example.com",
  201 |                password: "password123",
  202 |             },
  203 |          },
  204 |       });
  205 |
  206 |       const responseData = await response.text();
  207 |       console.log("Login API Response Status:", response.status());
  208 |       console.log("Login API Response:", responseData);
  209 |
  210 |       expect([200, 401].includes(response.status())).toBeTruthy();
  211 |    });
  212 |
  213 |    test("should access owner panel after owner login", async ({ page }) => {
  214 |       // Login as existing owner
  215 |       await page.goto(`${baseUrl}/login`);
  216 |       await page.fill('input[name="email"]', "owner@example.com");
  217 |       await page.fill('input[name="password"]', "password123");
  218 |       await page.click('button[type="submit"]');
  219 |
  220 |       await page.waitForTimeout(3000);
  221 |
  222 |       // Should be redirected to owner panel
> 223 |       await expect(page).toHaveURL(`${baseUrl}/owner`);
      |                          ^ Error: Timed out 5000ms waiting for expect(locator).toHaveURL(expected)
  224 |
  225 |       // Should see owner panel content
  226 |       const bodyText = await page.textContent("body");
  227 |       expect(
  228 |          bodyText.includes("Owner") ||
  229 |             bodyText.includes("manage") ||
  230 |             bodyText.includes("client")
  231 |       ).toBeTruthy();
  232 |    });
  233 |
  234 |    test("should handle concurrent registrations", async ({ browser }) => {
  235 |       // Test multiple concurrent registrations
  236 |       const context1 = await browser.newContext();
  237 |       const context2 = await browser.newContext();
  238 |
  239 |       const page1 = await context1.newPage();
  240 |       const page2 = await context2.newPage();
  241 |
  242 |       // Register two different users concurrently
  243 |       const registration1 = (async () => {
  244 |          await page1.goto(`${baseUrl}/register`);
  245 |          await page1.fill('input[name="name"]', "ConcurrentUser1");
  246 |          await page1.fill('input[name="email"]', "concurrent1@example.com");
  247 |          await page1.fill('input[name="password"]', "TestPassword123!");
  248 |          await page1.click('button[type="submit"]');
  249 |          await page1.waitForTimeout(3000);
  250 |          return page1.textContent("body");
  251 |       })();
  252 |
  253 |       const registration2 = (async () => {
  254 |          await page2.goto(`${baseUrl}/register`);
  255 |          await page2.fill('input[name="name"]', "ConcurrentUser2");
  256 |          await page2.fill('input[name="email"]', "concurrent2@example.com");
  257 |          await page2.fill('input[name="password"]', "TestPassword123!");
  258 |          await page2.click('button[type="submit"]');
  259 |          await page2.waitForTimeout(3000);
  260 |          return page2.textContent("body");
  261 |       })();
  262 |
  263 |       const [result1, result2] = await Promise.all([
  264 |          registration1,
  265 |          registration2,
  266 |       ]);
  267 |
  268 |       // Both should succeed
  269 |       expect(result1.includes("Registration successful")).toBeTruthy();
  270 |       expect(result2.includes("Registration successful")).toBeTruthy();
  271 |
  272 |       await context1.close();
  273 |       await context2.close();
  274 |    });
  275 | });
  276 |
```