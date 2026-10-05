// Captures QA screenshots of the real routes: node scripts/capture-qa.mjs [baseURL]
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://127.0.0.1:4173";
const shots = [
  ["dashboard", "/dashboard"], ["clock", "/clock"], ["attendance", "/attendance"], ["requests", "/requests"], ["calendar", "/calendar"],
  ["profile", "/profile"], ["approvals", "/manager/approvals"], ["hr", "/hr"], ["admin", "/admin"], ["import-export", "/admin/import-export"], ["workplace-qr", "/workplace-qr"],
];
const sizes = { mobile: { width: 390, height: 844 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1366, height: 768 } };
const browser = await chromium.launch({ channel: "msedge" });
for (const [label, viewport] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport, locale: "fa-IR", geolocation: { latitude: 35.7219, longitude: 51.3347, accuracy: 20 }, permissions: ["geolocation"] });
  await ctx.addInitScript(() => localStorage.setItem("roco-role", "admin"));
  const page = await ctx.newPage();
  for (const [name, route] of shots) {
    await page.goto(base + route); await page.waitForTimeout(700);
    await page.screenshot({ path: `qa/phase1/${name}-${label}.png` });
  }
  await ctx.close();
}
await browser.close();
console.log("done");
