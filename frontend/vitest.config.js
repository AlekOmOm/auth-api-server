import { defineConfig } from "vitest/config";

export default defineConfig({
   test: {
      globals: false,
      environment: "jsdom",
      setupFiles: ["./src/__tests__/setup/testSetup.js"],
      testTimeout: 15000,
      include: [
         "src/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      ],
      exclude: [
         "**/node_modules/**",
         "**/dist/**",
         "**/cypress/**",
         "**/.{idea,git,cache,output,temp}/**",
         "**/setup/**",
         "**/test/playwright-tests/**",
         "**/*.spec.js",
         "**/backend/**",
      ],
   },
});
