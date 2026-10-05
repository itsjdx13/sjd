import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

const headers = ["کد پرسنلی", "نام", "واحد"];
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("roco-role", "admin"); });
  await page.goto("/admin/import-export");
});

test("XLSX import selects one sheet and requires review and confirmation", async ({ page }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("اول").addRows([headers, ["RG-9001", "کارمند اول", "محصول"]]);
  workbook.addWorksheet("دوم").addRows([headers, ["RG-9002", "کارمند دوم", "مالی"], ["RG-9003", "واحد نامعتبر", "نامشخص"]]);
  workbook.addWorksheet("مخفی", { state: "hidden" }).addRows([headers, ["RG-9004", "مخفی", "محصول"]]);
  await page.locator("input[type=file]").setInputFiles({ name: "employees.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(await workbook.xlsx.writeBuffer()) });
  await page.getByRole("combobox", { name: /برگه Excel/ }).selectOption("1");
  await expect(page.getByRole("combobox", { name: /برگه Excel/ }).locator("option")).toHaveCount(2);
  await page.getByRole("button", { name: "اعتبارسنجی داده‌ها", exact: true }).click();
  await expect(page.getByText("۱ ردیف دارای خطا", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("roco-employees-v1"))).toBeNull();
  await page.getByRole("button", { name: "ادامه با ۱ ردیف", exact: true }).click();
  await page.getByRole("button", { name: "ثبت ۱ کارمند", exact: true }).click();
  await expect(page.getByRole("heading", { name: "ورود اطلاعات کامل شد" })).toBeVisible();
  const codes = await page.evaluate(() => JSON.parse(localStorage.getItem("roco-employees-v1")!).map((e: { code: string }) => e.code));
  expect(codes).toContain("RG-9002");
  for (const code of ["RG-9001", "RG-9003", "RG-9004"]) expect(codes).not.toContain(code);
});

test("XLSX export contains selected employees, typed hours and a reusable download", async ({ page }) => {
  await page.getByRole("button", { name: "کارکنان انتخاب‌شده", exact: true }).click();
  await page.getByRole("checkbox", { name: /سارا احمدی RG-1042/ }).check();
  await page.getByRole("checkbox", { name: /علی مرادی RG-1048/ }).check();
  await page.getByRole("checkbox", { name: "محصول", exact: true }).check();
  await page.getByRole("combobox", { name: /قالب فایل/ }).selectOption("xlsx");
  await page.screenshot({ path: "qa/phase1/xlsx-export-desktop.png", fullPage: true });
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "ساخت و دانلود فایل", exact: true }).click();
  const downloaded = await pending;
  expect(downloaded.suggestedFilename()).toMatch(/\.xlsx$/);
  const bytes = await readFile((await downloaded.path())!);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes);
  const sheet = workbook.worksheets[0];
  expect(sheet.rowCount).toBeGreaterThan(1);
  expect(sheet.getCell("A1").value).toBe("کد پرسنلی");
  sheet.eachRow((row, index) => { if (index > 1) { expect(row.getCell(1).value).toBe("RG-1042"); expect(typeof row.getCell(8).value).toBe("number"); } });
  expect(sheet.views[0].rightToLeft).toBe(true); expect(sheet.views[0].ySplit).toBe(1);
  await page.reload();
  const repeat = page.waitForEvent("download");
  await page.getByRole("button", { name: /دانلود دوباره.*xlsx/ }).click();
  expect(await readFile((await (await repeat).path())!)).toEqual(bytes);
});

test("damaged, formula and oversized-sheet workbooks are rejected without import", async ({ page }) => {
  const upload = async (buffer: Buffer) => page.locator("input[type=file]").setInputFiles({ name: "bad.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer });
  await upload(Buffer.from("not a workbook")); await expect(page.getByRole("alert")).toContainText("معتبر نیست");
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("کارکنان");
  sheet.addRows([headers, ["RG-9001", { formula: '"نام"', result: "نام" }, "محصول"]]);
  await upload(Buffer.from(await workbook.xlsx.writeBuffer())); await expect(page.getByRole("alert")).toContainText("فرمول");
  sheet.getCell("A5002").value = "too many rows";
  await upload(Buffer.from(await workbook.xlsx.writeBuffer())); await expect(page.getByRole("alert")).toContainText("۵۰۰۰");
  expect(await page.evaluate(() => localStorage.getItem("roco-employees-v1"))).toBeNull();
});

test("Excel sheet selector fits mobile and remains accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const workbook = new ExcelJS.Workbook(); workbook.addWorksheet("کارکنان").addRows([headers, ["RG-9001", "کارمند نمونه", "محصول"]]);
  await page.locator("input[type=file]").setInputFiles({ name: "employees.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(await workbook.xlsx.writeBuffer()) });
  await expect(page.getByRole("combobox", { name: /برگه Excel/ })).toBeVisible();
  for (const select of await page.locator(".map-row select").all()) expect((await select.boundingBox())!.width).toBeGreaterThan(200);
  const action = page.getByRole("button", { name: "اعتبارسنجی داده‌ها", exact: true });
  expect((await action.boundingBox())!.width).toBeGreaterThan(140);
  await action.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "qa/phase1/xlsx-import-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.filter(v => v.impact === "serious" || v.impact === "critical").map(v => v.id)).toEqual([]);
});
