import { expect, test, type Page } from "@playwright/test";

const KEY = "roco-employees-v1";
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem("roco-role", "admin")); });

async function openAdmin(page: Page) {
  await page.goto("/admin");
  // Persist the sample list so saved bytes can be compared before/after a failed write.
  await page.evaluate(async key => {
    const { employeeStore } = await import("/src/features/store.ts");
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(employeeStore.get()));
  }, KEY);
  await page.reload();
}
const saved = (page: Page) => page.evaluate(key => localStorage.getItem(key), KEY);
const savedList = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!) as { code: string; name: string; department: string; shift: string }[], KEY);
async function setBlocked(page: Page, blocked: boolean) {
  await page.evaluate(([key, blocked]) => {
    const w = window as unknown as { __orig?: typeof Storage.prototype.setItem };
    w.__orig ??= Storage.prototype.setItem;
    const original = w.__orig;
    Storage.prototype.setItem = blocked
      ? function (k, value) { if (k === key) throw new DOMException("Full", "QuotaExceededError"); return original.call(this, k, value); }
      : original;
  }, [KEY, blocked] as const);
}
async function startEdit(page: Page, name = "سارا احمدی") {
  await page.getByRole("button", { name: `جزئیات ${name}` }).click();
  await page.getByRole("button", { name: "ویرایش پرونده" }).click();
}

test("edit write failure keeps the form values, shows no success and retries", async ({ page }) => {
  await openAdmin(page);
  const before = await saved(page);
  await startEdit(page);
  await page.getByLabel("نام و نام خانوادگی").fill("سارا احمدی‌نژاد");
  await setBlocked(page, true);
  await page.getByRole("button", { name: "ذخیره تغییرها" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "ذخیره انجام نشد" })).toBeVisible();
  await expect(page.getByLabel("نام و نام خانوادگی")).toHaveValue("سارا احمدی‌نژاد");
  await expect(page.locator(".sr-live")).toHaveText("");
  expect(await saved(page)).toBe(before);
  await setBlocked(page, false);
  await page.getByRole("button", { name: "تلاش دوباره برای ذخیره" }).click();
  await expect(page.locator(".sr-live")).toContainText("ذخیره شد");
  await page.reload();
  expect((await savedList(page)).find(e => e.code === "RG-1042")?.name).toBe("سارا احمدی‌نژاد");
  await expect(page.getByRole("button", { name: "جزئیات سارا احمدی‌نژاد" })).toBeVisible();
});

test("an edit made in another tab is not overwritten by a stale form", async ({ page }) => {
  await openAdmin(page);
  await startEdit(page);
  await page.evaluate(key => {
    const list = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify(list.map((e: { code: string }) => e.code === "RG-1042" ? { ...e, shift: "شب" } : e)));
  }, KEY);
  await page.getByLabel("نام و نام خانوادگی").fill("نام تازه");
  await page.getByRole("button", { name: "ذخیره تغییرها" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "تغییر کرده" })).toBeVisible();
  const row = (await savedList(page)).find(e => e.code === "RG-1042")!;
  expect(row.shift).toBe("شب"); expect(row.name).toBe("سارا احمدی");
  // The draft keeps only the user's change; the other tab's shift is merged in for review.
  await expect(page.getByLabel("شیفت")).toHaveValue("شب");
  await expect(page.getByLabel("نام و نام خانوادگی")).toHaveValue("نام تازه");
  await page.getByRole("button", { name: "تلاش دوباره برای ذخیره" }).click();
  await expect(page.locator(".sr-live")).toContainText("ذخیره شد");
  expect((await savedList(page)).find(e => e.code === "RG-1042")).toMatchObject({ name: "نام تازه", shift: "شب" });
});

test("conflict retry preserves a newly added optional email", async ({ page }) => {
  await openAdmin(page);
  await page.evaluate(key => {
    const list = JSON.parse(localStorage.getItem(key)!);
    const employee = list.find((e: { code: string }) => e.code === "RG-1042");
    delete employee.email;
    localStorage.setItem(key, JSON.stringify(list));
  }, KEY);
  await page.reload();
  await startEdit(page);
  await page.getByLabel("ایمیل", { exact: true }).fill("new@example.com");
  await page.evaluate(key => {
    const list = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify(list.map((e: { code: string }) => e.code === "RG-1042" ? { ...e, shift: "شب" } : e)));
  }, KEY);
  await page.getByRole("button", { name: "ذخیره تغییرها" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "تغییر کرده" })).toBeVisible();
  await expect(page.getByLabel("ایمیل", { exact: true })).toHaveValue("new@example.com");
  await expect(page.getByLabel("شیفت")).toHaveValue("شب");
  await page.getByRole("button", { name: "تلاش دوباره برای ذخیره" }).click();
  await expect(page.locator(".sr-live")).toContainText("ذخیره شد");
  await page.reload();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).find((e: { code: string }) => e.code === "RG-1042"), KEY)).toMatchObject({ email: "new@example.com", shift: "شب" });
});

test("conflict retry respects removal of an untouched optional email", async ({ page }) => {
  await openAdmin(page);
  await page.evaluate(key => {
    const list = JSON.parse(localStorage.getItem(key)!);
    list.find((e: { code: string }) => e.code === "RG-1042").email = "old@example.com";
    localStorage.setItem(key, JSON.stringify(list));
  }, KEY);
  await page.reload();
  await startEdit(page);
  await page.getByLabel("نام و نام خانوادگی").fill("نام تازه");
  await page.evaluate(key => {
    const list = JSON.parse(localStorage.getItem(key)!);
    const employee = list.find((e: { code: string }) => e.code === "RG-1042");
    delete employee.email;
    localStorage.setItem(key, JSON.stringify(list));
  }, KEY);
  await page.getByRole("button", { name: "ذخیره تغییرها" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "تغییر کرده" })).toBeVisible();
  await expect(page.getByLabel("ایمیل", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "تلاش دوباره برای ذخیره" }).click();
  await expect(page.locator(".sr-live")).toContainText("ذخیره شد");
  await page.reload();
  const employee = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).find((e: { code: string }) => e.code === "RG-1042"), KEY);
  expect(employee.name).toBe("نام تازه");
  expect(employee.email).toBeUndefined();
});

test("adding an employee fails safely on quota and on a code taken elsewhere", async ({ page }) => {
  await openAdmin(page);
  const before = await saved(page);
  await page.getByRole("button", { name: "افزودن کارمند" }).first().click();
  await page.getByLabel("نام و نام خانوادگی").fill("کارمند آزمایشی");
  await setBlocked(page, true);
  await page.getByRole("button", { name: "افزودن کارمند" }).last().click();
  await expect(page.getByRole("alert").filter({ hasText: "ذخیره انجام نشد" })).toBeVisible();
  expect(await saved(page)).toBe(before);
  await setBlocked(page, false);
  // Another tab takes the proposed code first.
  const code = await page.getByLabel("کد پرسنلی").inputValue();
  await page.evaluate(([key, code]) => {
    const list = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify([...list, { code, name: "از تب دیگر", department: "محصول", status: "active", shift: "صبح" }]));
  }, [KEY, code] as const);
  await page.getByRole("button", { name: "تلاش دوباره برای ذخیره" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "کد پرسنلی" })).toBeVisible();
  expect((await savedList(page)).filter(e => e.code === code)).toHaveLength(1);
  await expect(page.getByLabel("نام و نام خانوادگی")).toHaveValue("کارمند آزمایشی");
});

test("bulk change failure keeps selection and data, then retry succeeds", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openAdmin(page);
  const before = await saved(page);
  await page.getByRole("checkbox", { name: "انتخاب سارا احمدی" }).check();
  await page.getByRole("checkbox", { name: "انتخاب علی مرادی" }).check();
  await page.getByLabel("شیفت جدید").selectOption("شب");
  await setBlocked(page, true);
  await page.getByRole("button", { name: "تغییر شیفت" }).click();
  await expect(page.getByRole("region", { name: "اقدام گروهی" }).getByRole("alert")).toContainText("ذخیره انجام نشد");
  await expect(page.locator(".sr-live")).toHaveText("");
  expect(await saved(page)).toBe(before);
  await expect(page.getByText("۲ نفر انتخاب شده")).toBeVisible();
  await setBlocked(page, false);
  await page.getByRole("button", { name: "تغییر شیفت" }).click();
  await expect(page.locator(".sr-live")).toContainText("تغییر کرد");
  await page.reload();
  const list = await savedList(page);
  expect(list.filter(e => ["RG-1042", "RG-1048"].includes(e.code)).map(e => e.shift)).toEqual(["شب", "شب"]);
});

test("bulk change refuses rows edited elsewhere and corrupt data is never replaced", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openAdmin(page);
  await page.getByRole("checkbox", { name: "انتخاب سارا احمدی" }).check();
  await page.evaluate(key => {
    const list = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify(list.map((e: { code: string }) => e.code === "RG-1042" ? { ...e, department: "مالی" } : e)));
  }, KEY);
  await page.getByLabel("شیفت جدید").selectOption("شب");
  await page.getByRole("button", { name: "تغییر شیفت" }).click();
  await expect(page.getByRole("region", { name: "اقدام گروهی" }).getByRole("alert")).toContainText("تغییر کرده");
  expect((await savedList(page)).find(e => e.code === "RG-1042")).toMatchObject({ department: "مالی", shift: "صبح" });
  await page.evaluate(key => localStorage.setItem(key, "broken-employees"), KEY);
  await page.getByRole("button", { name: "تغییر شیفت" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "قابل خواندن نیست" }).first()).toBeVisible();
  expect(await saved(page)).toBe("broken-employees");
});
