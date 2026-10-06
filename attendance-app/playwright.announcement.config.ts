import { defineConfig } from "@playwright/test";
import base from "./playwright.accessibility.config";
export default defineConfig(base, { testMatch: "announcement-preview.spec.ts" });
