import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig(base, {
  testMatch: "accessibility-workflows.spec.ts",
  use: { channel: undefined },
  projects: [{ name: "firefox-desktop", use: { browserName: "firefox", viewport: { width: 1366, height: 900 } } }],
});
