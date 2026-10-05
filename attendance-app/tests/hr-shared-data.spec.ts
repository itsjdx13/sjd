import { expect, test } from "@playwright/test";

const KEY = "roco-employees-v1";
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { if (!localStorage.getItem("roco-session-v1")) localStorage.setItem("roco-role", "hr"); }); });
const openFiles = async (page: import("@playwright/test").Page) => { await page.goto("/hr"); await page.getByRole("button", { name: "پرونده کارکنان", exact: true }).click(); };
const mutate = (page: import("@playwright/test").Page, fn: (list: Record<string, unknown>[]) => Record<string, unknown>[]) =>
  page.evaluate(async ([key, src]) => {
    const { employeeStore } = await import("/src/features/store.ts");
    const list = JSON.parse(localStorage.getItem(key) ?? JSON.stringify(employeeStore.get()));
    localStorage.setItem(key, JSON.stringify(new Function("list", `return (${src})(list)`)(list)));
  }, [KEY, fn.toString()] as const);

test("HR file directory and balances use the shared employee list, including new and renamed people", async ({ page }) => {
  await page.goto("/hr");
  await mutate(page, list => [...list.map(e => e.code === "RG-1042" ? { ...e, name: "سارا احمدی‌نژاد", department: "مالی" } : e), { code: "RG-9001", name: "کارمند تازه", department: "عملیات", status: "active", shift: "صبح" }]);
  await page.reload();
  await page.getByRole("button", { name: "پرونده کارکنان", exact: true }).click();
  const directory = page.locator(".employee-directory");
  await expect(directory.getByText("سارا احمدی‌نژاد")).toBeVisible();
  await expect(directory.getByText("کارمند تازه")).toBeVisible();
  await expect(directory.getByText("RG-9001")).toBeVisible();
  // Unrecorded profile fields say so instead of showing invented values.
  await directory.getByRole("button", { name: /کارمند تازه/ }).click();
  await expect(page.locator(".employee-file")).toContainText("ثبت نشده");
  await page.getByRole("button", { name: "مرخصی و مانده", exact: true }).click();
  const balances = page.locator(".leave-balances");
  await expect(balances.getByText("کارمند تازه")).toBeVisible();
  await expect(balances.locator(".balance-row", { hasText: "سارا احمدی‌نژاد" })).toContainText("۱۲٫۵ روز");
  await expect(balances.locator(".balance-row", { hasText: "کارمند تازه" })).toContainText("ثبت نشده");
  await expect(balances).toContainText("نمونه");
  // Display formatting only: the stored balance stays a number.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("roco-hr-v1") ?? "null")?.profiles?.["RG-1042"]?.balanceBase);
  if (stored !== undefined) expect(stored).toBe(12.5);
  expect(await page.evaluate(async () => { const { hrStore, leaveBalanceOf } = await import("/src/features/hr.ts"); return leaveBalanceOf(hrStore.get(), "RG-1042"); })).toBe(12.5);
});

test("HR statuses follow the shared status and the overview counts real active employees", async ({ page }) => {
  await page.goto("/hr");
  await mutate(page, list => list.map(e => e.code === "RG-1048" ? { ...e, status: "inactive" } : e));
  await page.reload();
  const active = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).filter((e: { status: string }) => e.status === "active").length, KEY);
  const persian = String(active).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
  await expect(page.locator(".hr-kpis button").first()).toContainText(persian);
  await expect(page.getByText("بخشی از آمار نمونه نمایشی است")).toBeVisible();
  await page.getByRole("button", { name: "پرونده کارکنان", exact: true }).click();
  await expect(page.locator(".employee-directory button", { hasText: "علی مرادی" })).toContainText("غیرفعال");
});

test("roster rows follow shared names and mark a removed employee instead of showing a stale name", async ({ page }) => {
  await page.goto("/hr");
  await mutate(page, list => list.filter(e => e.code !== "RG-1051").map(e => e.code === "RG-1048" ? { ...e, name: "علی مرادی‌پور" } : e));
  await page.reload();
  await page.getByRole("button", { name: "برنامه شیفت", exact: true }).click();
  await expect(page.getByLabel("شیفت علی مرادی‌پور 13", { exact: true })).toBeVisible();
  await expect(page.getByLabel("شیفت RG-1051 (حذف‌شده) 13", { exact: true })).toBeVisible();
  await expect(page.getByLabel("شیفت علی مرادی 13", { exact: true })).toHaveCount(0);
});

test("corrupt employee or HR data shows a notice and is never replaced", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("roco-hr-v1", "broken-hr"); });
  await page.goto("/hr");
  await expect(page.getByRole("alert").filter({ hasText: "قابل خواندن نیست" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("roco-hr-v1"))).toBe("broken-hr");
});

test("an employee edited in the real admin screen appears in HR after reload, with no second employee list", async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem("roco-session-v1")) localStorage.setItem("roco-role", "admin"); });
  await page.goto("/admin");
  await page.getByRole("button", { name: "جزئیات سارا احمدی" }).click();
  await page.getByRole("button", { name: "ویرایش پرونده" }).click();
  await page.getByLabel("نام و نام خانوادگی").fill("سارا ادمین‌ویرایش");
  await page.getByRole("button", { name: "ذخیره تغییرها" }).click();
  await expect(page.locator(".sr-live")).toContainText("ذخیره شد");
  await page.goto("/hr");
  await page.reload();
  await page.getByRole("button", { name: "پرونده کارکنان", exact: true }).click();
  await expect(page.locator(".employee-directory")).toContainText("سارا ادمین‌ویرایش");
  await expect(page.locator(".employee-directory")).not.toContainText("سارا احمدی");
  await page.getByRole("button", { name: "برنامه شیفت", exact: true }).click();
  await expect(page.getByLabel("شیفت سارا ادمین‌ویرایش 13", { exact: true })).toBeVisible();
});
