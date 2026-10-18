import { defineConfig, devices } from "@playwright/test";

// Pruebas de extremo a extremo del flujo completo. Requieren la base con seed:
//   npm run db:reset && npm run test:e2e
export default defineConfig({
  testDir: "./e2e",
  timeout: 8 * 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-MX",
    timezoneId: "America/Tijuana",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
