import { defineConfig, devices } from "@playwright/test";

// Smoke matrix: Firefox, WebKit (Safari engine), Android Chrome and iOS Safari emulation, Edge desktop.
// Run with: npx playwright test -c playwright.cross-browser.config.ts
const port = Number(process.env.MOBILE_RUNTIME_TEST_PORT ?? 4174);
export default defineConfig({
  testDir: "./tests",
  testMatch: "cross-browser.spec.ts",
  timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [
    { name: "firefox-desktop", use: { ...devices["Desktop Firefox"], viewport: { width: 1366, height: 768 } } },
    { name: "webkit-desktop", use: { ...devices["Desktop Safari"], viewport: { width: 1366, height: 768 } } },
    { name: "android-chrome", use: { ...devices["Pixel 7"], channel: "msedge" } },
    { name: "ios-safari", use: { ...devices["iPhone 14"] } },
    { name: "edge-desktop", use: { channel: "msedge", viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: { command: `npm run dev -- --port ${port}`, url: `http://127.0.0.1:${port}/`, reuseExistingServer: true },
});
