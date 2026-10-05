import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem("roco-role", "admin")); });
async function prepareImport(page: Page) {
  await page.goto("/admin/import-export");
  await page.locator("input[type=file]").setInputFiles({ name: "employees.csv", mimeType: "text/csv", buffer: Buffer.from("code,name,department\nRG-9101,کارمند جدید,محصول") });
  await page.getByRole("button", { name: "اعتبارسنجی داده‌ها", exact: true }).click();
  await page.getByRole("button", { name: "ادامه با ۱ ردیف", exact: true }).click();
}
async function blockWrites(page: Page, key: string) {
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, value) { if (k === key) throw new DOMException("Full", "QuotaExceededError"); return original.call(this, k, value); };
  }, key);
}

test("import write failure keeps prior data, shows no success and allows retry", async ({ page }) => {
  await prepareImport(page);
  await page.evaluate(async () => {
    const { employeeStore } = await import("/src/features/store.ts");
    localStorage.setItem("roco-employees-v1", JSON.stringify(employeeStore.get()));
  });
  const original = await page.evaluate(() => localStorage.getItem("roco-employees-v1"));
  await blockWrites(page, "roco-employees-v1");
  await page.getByRole("button", { name: "ثبت ۱ کارمند", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("ذخیره کارکنان ممکن نشد");
  await expect(page.getByRole("heading", { name: "ورود اطلاعات کامل شد" })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("roco-employees-v1"))).toBe(original);
  // Reload restores the normal storage API; a fresh reviewed import can be committed.
  await page.reload(); await prepareImport(page);
  await page.getByRole("button", { name: "ثبت ۱ کارمند", exact: true }).click();
  await expect(page.getByRole("heading", { name: "ورود اطلاعات کامل شد" })).toBeVisible();
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("roco-employees-v1")!).filter((e: { code: string }) => e.code === "RG-9101").length)).toBe(1);
});

test("corrupt saved employees cannot be replaced by an import or a sample export", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roco-employees-v1", "broken-employees"));
  await prepareImport(page); await page.getByRole("button", { name: "ثبت ۱ کارمند", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("ذخیره کارکنان ممکن نشد");
  await page.getByRole("button", { name: "ساخت و دانلود فایل", exact: true }).click();
  await expect(page.locator(".export-panel").getByRole("alert")).toContainText("خروجی ساخته نشد");
  expect(await page.evaluate(() => localStorage.getItem("roco-employees-v1"))).toBe("broken-employees");
});

test("employee change between preview and commit requires another review", async ({ page }) => {
  await prepareImport(page);
  await page.evaluate(async () => {
    const { employeeStore } = await import("/src/features/store.ts");
    const latest = employeeStore.getPersisted();
    localStorage.setItem("roco-employees-v1", JSON.stringify([...latest, { code: "RG-9101", name: "از تب دیگر", department: "محصول", status: "active", shift: "صبح" }]));
  });
  await page.getByRole("button", { name: "ثبت ۱ کارمند", exact: true }).click();
  await expect(page.getByRole("heading", { name: "پیش‌نمایش و اعتبارسنجی", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("فهرست کارکنان تغییر کرده است");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("roco-employees-v1")!).filter((e: { code: string }) => e.code === "RG-9101").length)).toBe(1);
});

test("history quota failure still downloads but never invents a saved history entry", async ({ page }) => {
  await page.goto("/admin/import-export");
  // Create a prior valid export, then deny only history writes.
  const first = page.waitForEvent("download"); await page.getByRole("button", { name: "ساخت و دانلود فایل", exact: true }).click(); await first;
  const prior = await page.evaluate(() => localStorage.getItem("roco-exports-v1"));
  await blockWrites(page, "roco-exports-v1");
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "ساخت و دانلود فایل", exact: true }).click();
  const file = await pending; expect(await readFile((await file.path())!, "utf8")).toContain("کد پرسنلی");
  await expect(page.getByRole("alert")).toContainText("در تاریخچه ذخیره نشد");
  await expect(page.locator(".download-history")).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("roco-exports-v1"))).toBe(prior);
  await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole("button", { name: "خروجی", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "qa/phase1/export-storage-warning-mobile.png", fullPage: true });
});

test("invalid export-history schema is preserved and cannot crash the page", async ({ page }) => {
  const raw = JSON.stringify([{ id: "damaged", content: "x", name: "bad.csv", format: "csv", createdAt: "not-a-date", rows: 1 }]);
  await page.addInitScript(raw => localStorage.setItem("roco-exports-v1", raw), raw);
  await page.goto("/admin/import-export");
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "ساخت و دانلود فایل", exact: true }).click(); await pending;
  await expect(page.getByRole("alert")).toContainText("در تاریخچه ذخیره نشد");
  expect(await page.evaluate(() => localStorage.getItem("roco-exports-v1"))).toBe(raw);
  await expect(page.locator(".download-history")).toHaveCount(0);
});
