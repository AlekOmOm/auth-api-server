# Test info

- Name: simple test
- Location: D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\simple.test.js:3:1

# Error details

```
Error: Timed out 7000ms waiting for expect(locator).toBeVisible()

Locator: locator('h1:has-text("Auth System")')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 7000ms
  - waiting for locator('h1:has-text("Auth System")')

    at D:\devdrive\0._GitHub\03._Uni\.electives\NodeJS\auth-system\frontend\test\playwright-tests\simple.test.js:10:35
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
   1 | import { test, expect } from "@playwright/test";
   2 |
   3 | test("simple test", async ({ page }) => {
   4 |    await page.goto("http://localhost:3000/");
   5 |    try {
   6 |       // Wait for the Svelte app to mount something into the #app div
   7 |       await page.waitForSelector("#app > *", { timeout: 10000 });
   8 |       // Now check for the header
   9 |       const headerElement = page.locator('h1:has-text("Auth System")');
> 10 |       await expect(headerElement).toBeVisible({ timeout: 7000 }); // Assert visibility after confirming existence
     |                                   ^ Error: Timed out 7000ms waiting for expect(locator).toBeVisible()
  11 |    } catch (e) {
  12 |       console.error(
  13 |          "Test failed: Could not find <h1>Auth System</h1> after waiting for app mount. Page content:"
  14 |       );
  15 |       console.error(await page.content());
  16 |       throw e;
  17 |    }
  18 | });
  19 |
```