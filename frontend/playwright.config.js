import { defineConfig } from "@playwright/test";

export default defineConfig({
   testDir: "./test/playwright-tests", // Restrict test discovery to this directory
   reporter: [["json", { outputFile: "test-results/playwright-report.json" }]], // Configure JSON reporter
   projects: [
      {
         name: "chromium",
         use: { browserName: "chromium" },
      },
      // You can add other browsers here if needed, e.g.:
      // {
      //   name: 'firefox',
      //   use: { browserName: 'firefox' },
      // },
      // {
      //   name: 'webkit',
      //   use: { browserName: 'webkit' },
      // },
   ],
   // If your app is started by a command before tests, configure webServer here.
   // webServer: {
   //   command: 'npm run dev', // Or your start command
   //   url: 'http://localhost:3000', // URL to wait for
   //   reuseExistingServer: !process.env.CI,
   //   timeout: 120 * 1000,
   // },
});
