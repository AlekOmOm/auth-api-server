export class OwnerPanelPage {
   constructor(page) {
      this.page = page;
   }

   async navigateToOwnerPanel() {
      await this.page.goto("/owner");
      await this.page.waitForSelector(".owner-panel", { timeout: 10000 });
   }

   async waitForPanelToLoad() {
      await this.page.waitForSelector(".owner-panel:not(:has(.loading))", {
         timeout: 10000,
      });
   }

   async getOwnerStats() {
      await this.waitForPanelToLoad();
      const stats = {};

      const totalClientsElement = await this.page
         .locator('.stat-card:has-text("Total Client Servers") .stat-value')
         .first();
      if (await totalClientsElement.isVisible()) {
         stats.totalClients = await totalClientsElement.textContent();
      }

      const totalUsersElement = await this.page
         .locator('.stat-card:has-text("Total Users") .stat-value')
         .first();
      if (await totalUsersElement.isVisible()) {
         stats.totalUsers = await totalUsersElement.textContent();
      }

      return stats;
   }

   async clickCreateNewClientServer() {
      await this.page.click('button:has-text("Create New Client Server")');
      await this.page.waitForSelector(".modal", { timeout: 5000 });
   }

   async fillClientServerForm(clientData) {
      await this.page.fill('input[name="app_name"]', clientData.app_name);

      const urlsTextarea = await this.page.locator(
         'textarea[name="authorized_urls"]'
      );
      await urlsTextarea.fill(clientData.authorized_urls.join("\n"));
   }

   async submitClientServerForm() {
      await this.page.click('.modal button[type="submit"]');
   }

   async closeModal() {
      await this.page.click('.modal button:has-text("Cancel")');
   }

   async waitForClientServerCreated() {
      await this.page.waitForSelector(
         '.success-message:has-text("successfully")',
         { timeout: 5000 }
      );
   }

   async getClientServerCards() {
      await this.waitForPanelToLoad();
      const cards = await this.page.locator(".client-server-card").all();
      const clientServers = [];

      for (const card of cards) {
         const appName = await card.locator("h3").textContent();
         const clientId = await card.locator(".client-id").textContent();
         const clientSecret = await card
            .locator(".client-secret")
            .textContent();

         clientServers.push({
            appName,
            clientId: clientId.replace("Client ID: ", ""),
            clientSecret: clientSecret.replace("Client Secret: ", ""),
         });
      }

      return clientServers;
   }

   async findClientServerByName(appName) {
      const cards = await this.getClientServerCards();
      return cards.find((card) => card.appName === appName);
   }

   async clickEditForClientServer(appName) {
      const card = await this.page.locator(
         `.client-server-card:has(h3:text("${appName}"))`
      );
      await card.locator('button:has-text("Edit")').click();
      await this.page.waitForSelector(".modal", { timeout: 5000 });
   }

   async clickDeleteForClientServer(appName) {
      const card = await this.page.locator(
         `.client-server-card:has(h3:text("${appName}"))`
      );
      await card.locator('button:has-text("Delete")').click();
   }

   async confirmDelete() {
      await this.page.on("dialog", (dialog) => dialog.accept());
   }

   async clickManageUsersForClientServer(appName) {
      const card = await this.page.locator(
         `.client-server-card:has(h3:text("${appName}"))`
      );
      await card.locator('button:has-text("Manage Users")').click();
      await this.page.waitForSelector('.modal:has-text("User Management")', {
         timeout: 5000,
      });
   }

   async fillUserForm(userData) {
      await this.page.fill('input[name="name"]', userData.name);
      await this.page.fill('input[name="email"]', userData.email);
      await this.page.fill('input[name="password"]', userData.password);

      if (userData.role) {
         await this.page.selectOption('select[name="role"]', userData.role);
      }
   }

   async submitUserForm() {
      await this.page.click('.modal button:has-text("Create User")');
   }

   async getClientUsers() {
      const userRows = await this.page.locator(".user-list-item").all();
      const users = [];

      for (const row of userRows) {
         const name = await row.locator(".user-name").textContent();
         const email = await row.locator(".user-email").textContent();
         const role = await row.locator(".user-role").textContent();

         users.push({ name, email, role });
      }

      return users;
   }

   async deleteUser(email) {
      const userRow = await this.page.locator(
         `.user-list-item:has(.user-email:text("${email}"))`
      );
      await userRow.locator('button:has-text("Delete")').click();
      await this.page.on("dialog", (dialog) => dialog.accept());
   }

   async getErrorMessage() {
      const errorElement = await this.page
         .locator(".error-message.inline-feedback")
         .first();
      if (await errorElement.isVisible()) {
         return await errorElement.textContent();
      }
      return null;
   }

   async getSuccessMessage() {
      const successElement = await this.page
         .locator(".success-message.inline-feedback")
         .first();
      if (await successElement.isVisible()) {
         return await successElement.textContent();
      }
      return null;
   }
}
