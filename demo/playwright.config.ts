import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:4173",
    headless: true,
  },
  webServer: {
    command: "npm run preview -- --port 4173",
    port: 4173,
    reuseExistingServer: true,
    timeout: 10000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: {
          executablePath: "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome",
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      },
    },
  ],
})
