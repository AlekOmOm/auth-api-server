export class AuthPage {
   constructor(page) {
      this.page = page;
   }

   async navigateToRegister() {
      await this.page.goto("/register");
      await this.page.waitForURL("**/register");
   }

   async navigateToLogin() {
      await this.page.goto("/login");
   }

   async fillRegistrationForm(userData) {
      await this.page.fill('input[name="name"]', userData.name);
      await this.page.fill('input[name="email"]', userData.email);
      await this.page.fill('input[name="password"]', userData.password);

      if (userData.userType === "auth") {
         await this.page.click('input[type="radio"][value="auth"]');
      } else {
         await this.page.click('input[type="radio"][value="client"]');
      }
   }

   async submitRegistrationForm() {
      await this.page.click('button[type="submit"]');
   }

   async fillLoginForm(email, password) {
      await this.page.fill('input[name="email"]', email);
      await this.page.fill('input[name="password"]', password);
   }

   async submitLoginForm() {
      await this.page.click('button[type="submit"]');
   }

   async waitForSuccessfulLogin() {
      await this.page.waitForURL("**/home", { timeout: 10000 });
   }

   async getErrorMessage() {
      try {
         await this.page.waitForSelector(".error-message", { timeout: 5000 });
         const errorElement = await this.page.locator(".error-message").first();
         if (await errorElement.isVisible()) {
            return await errorElement.textContent();
         }
      } catch (error) {
         return null;
      }
      return null;
   }

   async logout() {
      await this.page.click('button:has-text("Logout")');
      await this.page.waitForURL("**/login");
   }
}
