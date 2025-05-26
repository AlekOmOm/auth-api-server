# Test info

- Name: Owner Panel Session Fix >> should logout successfully
- Location: D:\devdrive\0._GitHub\01._Uni\.electives\NodeJS\auth-system\tests\end-to-end\owner-panel-session-fix.spec.js:104:8

# Error details

```
Error: locator.click: Test timeout of 15000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]')

    at D:\devdrive\0._GitHub\01._Uni\.electives\NodeJS\auth-system\tests\end-to-end\owner-panel-session-fix.spec.js:126:26
```

# Page snapshot

```yaml
- heading "Auth System" [level=2]
- banner:
  - heading "🏢 Owner Panel" [level=1]
  - paragraph: Manage your client servers and users
  - text: 👑 Client Server Owner
- heading "📊 Dashboard Overview" [level=2]
- text: 🏢
- heading "2" [level=3]
- paragraph: Client Servers
- text: 📈 +11.329423770629887% 👥
- heading "0" [level=3]
- paragraph: Total Users
- text: 📈 +24.1296536879216% 🔐
- heading "0" [level=3]
- paragraph: Active Sessions
- text: 📈 +0.18831195538655487% 📅
- heading "0" [level=3]
- paragraph: Monthly Logins
- text: "📈 +14.238341021012813% 💚 System Health: Excellent"
- heading "📱 Your Client Servers" [level=2]
- button "➕ Create New Client Server"
- heading "Owner3 Test Application" [level=3]
- text: "Frontend Login Proxy Client ID:"
- code: client_8ac8226c68fe4283a68580091d9c12bb
- text: "Schema: client_owner3_test_application_1748285089270 Created: 5/26/2025 Return URLs: http://localhost:4000 http://localhost:5000"
- button "👥 Manage Users"
- button "✏️ Edit"
- button "🗑️ Delete"
- heading "Test App for Owner3" [level=3]
- text: "development Client ID:"
- code: test-client-001
- text: "Schema: test_schema Created: 5/26/2025 Return URLs: http://localhost:3000 http://localhost:5173"
- button "👥 Manage Users"
- button "✏️ Edit"
- button "🗑️ Delete"
- navigation
```

# Test source

```ts
   26 |          ownerCredentials.email
   27 |       );
   28 |       await page.fill(
   29 |          'input[name="password"], input[type="password"]',
   30 |          ownerCredentials.password
   31 |       );
   32 |
   33 |       // Submit login form
   34 |       await page.click(
   35 |          'button[type="submit"], button:has-text("Login"), input[type="submit"]'
   36 |       );
   37 |
   38 |       // Wait for redirect to owner panel
   39 |       await page.waitForURL(/.*\/owner/, { timeout: 10000 });
   40 |
   41 |       // Verify we're on the owner panel
   42 |       await expect(page).toHaveURL(/.*\/owner/);
   43 |
   44 |       // Wait for the page to load (should not be stuck in "Loading..." state)
   45 |       // Look for any content that indicates the page has loaded
   46 |       await page.waitForTimeout(3000); // Give it time to load
   47 |
   48 |       // Check that we're not stuck in loading state
   49 |       const loadingText = page.locator("text=Loading...");
   50 |       const hasLoading = await loadingText.count();
   51 |
   52 |       if (hasLoading > 0) {
   53 |          // If there's loading text, it should disappear within a reasonable time
   54 |          await expect(loadingText).toBeHidden({ timeout: 10000 });
   55 |       }
   56 |
   57 |       // Verify the page has actual content (not just loading)
   58 |       // Look for common owner panel elements
   59 |       const hasContent = await page.locator("body").textContent();
   60 |       expect(hasContent).not.toBe("Loading...");
   61 |       expect(hasContent.length).toBeGreaterThan(50); // Should have substantial content
   62 |
   63 |       console.log(
   64 |          "✅ Owner Panel loaded successfully without infinite loading"
   65 |       );
   66 |    });
   67 |
   68 |    test("should maintain session on page refresh", async ({ page }) => {
   69 |       // First login
   70 |       await page.goto("http://localhost:3000/login?return_url=/owner");
   71 |       await page.fill(
   72 |          'input[name="email"], input[type="email"]',
   73 |          ownerCredentials.email
   74 |       );
   75 |       await page.fill(
   76 |          'input[name="password"], input[type="password"]',
   77 |          ownerCredentials.password
   78 |       );
   79 |       await page.click(
   80 |          'button[type="submit"], button:has-text("Login"), input[type="submit"]'
   81 |       );
   82 |
   83 |       // Wait for owner panel to load
   84 |       await page.waitForURL(/.*\/owner/, { timeout: 10000 });
   85 |
   86 |       // Refresh the page
   87 |       await page.reload();
   88 |
   89 |       // Should still be on owner panel (not redirected to login)
   90 |       await expect(page).toHaveURL(/.*\/owner/);
   91 |
   92 |       // Should not be stuck in loading
   93 |       await page.waitForTimeout(3000);
   94 |       const loadingText = page.locator("text=Loading...");
   95 |       const hasLoading = await loadingText.count();
   96 |
   97 |       if (hasLoading > 0) {
   98 |          await expect(loadingText).toBeHidden({ timeout: 10000 });
   99 |       }
  100 |
  101 |       console.log("✅ Session persisted after page refresh");
  102 |    });
  103 |
  104 |    test("should logout successfully", async ({ page }) => {
  105 |       // First login
  106 |       await page.goto("http://localhost:3000/login?return_url=/owner");
  107 |       await page.fill(
  108 |          'input[name="email"], input[type="email"]',
  109 |          ownerCredentials.email
  110 |       );
  111 |       await page.fill(
  112 |          'input[name="password"], input[type="password"]',
  113 |          ownerCredentials.password
  114 |       );
  115 |       await page.click(
  116 |          'button[type="submit"], button:has-text("Login"), input[type="submit"]'
  117 |       );
  118 |
  119 |       // Wait for owner panel to load
  120 |       await page.waitForURL(/.*\/owner/, { timeout: 10000 });
  121 |
  122 |       // Find and click logout button
  123 |       const logoutButton = page.locator(
  124 |          'button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]'
  125 |       );
> 126 |       await logoutButton.click();
      |                          ^ Error: locator.click: Test timeout of 15000ms exceeded.
  127 |
  128 |       // Should redirect to login page
  129 |       await page.waitForURL(/.*login/, { timeout: 10000 });
  130 |       await expect(page).toHaveURL(/.*login/);
  131 |
  132 |       console.log("✅ Logout successful");
  133 |    });
  134 |
  135 |    test("should handle direct navigation to owner panel", async ({ page }) => {
  136 |       // First login normally
  137 |       await page.goto("http://localhost:3000/login");
  138 |       await page.fill(
  139 |          'input[name="email"], input[type="email"]',
  140 |          ownerCredentials.email
  141 |       );
  142 |       await page.fill(
  143 |          'input[name="password"], input[type="password"]',
  144 |          ownerCredentials.password
  145 |       );
  146 |       await page.click(
  147 |          'button[type="submit"], button:has-text("Login"), input[type="submit"]'
  148 |       );
  149 |
  150 |       // Wait for initial redirect (might go to home first)
  151 |       await page.waitForTimeout(2000);
  152 |
  153 |       // Now navigate directly to owner panel
  154 |       await page.goto("http://localhost:3000/owner");
  155 |
  156 |       // Should load owner panel without issues
  157 |       await expect(page).toHaveURL(/.*\/owner/);
  158 |
  159 |       // Should not be stuck in loading
  160 |       await page.waitForTimeout(3000);
  161 |       const loadingText = page.locator("text=Loading...");
  162 |       const hasLoading = await loadingText.count();
  163 |
  164 |       if (hasLoading > 0) {
  165 |          await expect(loadingText).toBeHidden({ timeout: 10000 });
  166 |       }
  167 |
  168 |       console.log("✅ Direct navigation to owner panel works");
  169 |    });
  170 | });
  171 |
```