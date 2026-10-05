import { expect, test, type Page } from "@playwright/test";

const HR = "roco-hr-v1", EMP = "roco-employees-v1";
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { if (!localStorage.getItem("roco-session-v1")) localStorage.setItem("roco-role", "hr"); }); });

/** Opens the file tab and persists the sample HR/employee data so saved bytes can be compared. */
async function openFile(page: Page) {
  await page.goto("/hr");
  await page.evaluate(async ([hr, emp]) => {
    const { hrStore } = await import("/src/features/hr.ts"); const { employeeStore } = await import("/src/features/store.ts");
    if (!localStorage.getItem(hr)) localStorage.setItem(hr, JSON.stringify(hrStore.get()));
    if (!localStorage.getItem(emp)) localStorage.setItem(emp, JSON.stringify(employeeStore.get()));
  }, [HR, EMP] as const);
  await page.reload();
  await page.getByRole("button", { name: "پرونده کارکنان", exact: true }).click();
}
const edit = (page: Page) => page.locator(".employee-file").getByRole("button", { name: "ویرایش پرونده" });
const saved = (page: Page, key = HR) => page.evaluate(k => localStorage.getItem(k), key);
const profile = (page: Page, code = "RG-1042") => page.evaluate(([k, c]) => JSON.parse(localStorage.getItem(k)!).profiles[c], [HR, code] as const);
const patchSaved = (page: Page, code: string, change: Record<string, string>) => page.evaluate(([k, c, ch]) => {
  const data = JSON.parse(localStorage.getItem(k)!); data.profiles[c] = { ...data.profiles[c], ...ch }; localStorage.setItem(k, JSON.stringify(data));
}, [HR, code, change] as const);
async function setBlocked(page: Page, blocked: boolean) {
  await page.evaluate(([key, blocked]) => {
    const w = window as unknown as { __orig?: typeof Storage.prototype.setItem };
    w.__orig ??= Storage.prototype.setItem; const original = w.__orig;
    Storage.prototype.setItem = blocked ? function (k, value) { if (k === key) throw new DOMException("Full", "QuotaExceededError"); return original.call(this, k, value); } : original;
  }, [HR, blocked] as const);
}

test("saving a profile persists after reload, keeps balance and shared fields, and returns focus", async ({ page }) => {
  await openFile(page);
  const employeesBefore = await saved(page, EMP);
  await edit(page).click();
  await expect(page.getByRole("dialog")).toContainText("نمونه محلی");
  await page.getByLabel("عنوان شغلی").fill("سرپرست محصول");
  await page.getByLabel("یادداشت مدارک").fill("قرارداد تمدید شد");
  await page.getByRole("button", { name: "ذخیره پرونده" }).click();
  await expect(page.locator(".sr-live")).toContainText("ذخیره شد");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(edit(page)).toBeFocused();
  await expect(page.locator(".employee-file")).toContainText("سرپرست محصول");
  await page.reload(); await page.getByRole("button", { name: "پرونده کارکنان", exact: true }).click();
  await expect(page.locator(".employee-file")).toContainText("قرارداد تمدید شد");
  expect(await profile(page)).toMatchObject({ role: "سرپرست محصول", document: "قرارداد تمدید شد", balanceBase: 12.5, skill: "تحقیق محصول" });
  expect(await saved(page, EMP)).toBe(employeesBefore);
});

test("a cleared field becomes 'ثبت نشده' and is not stored as an empty string", async ({ page }) => {
  await openFile(page);
  await edit(page).click();
  await page.getByLabel("مهارت شاخص").fill("   ");
  await page.getByRole("button", { name: "ذخیره پرونده" }).click();
  await expect(page.locator(".sr-live")).toContainText("ذخیره شد");
  await expect(page.locator(".employee-file")).toContainText("ثبت نشده");
  expect(Object.hasOwn(await profile(page), "skill")).toBe(false);
});

test("quota failure keeps the draft, shows no success, and a retry saves it", async ({ page }) => {
  await openFile(page);
  const before = await saved(page);
  await edit(page).click();
  await page.getByLabel("عنوان شغلی").fill("عنوان پیش‌نویس");
  await setBlocked(page, true);
  await page.getByRole("button", { name: "ذخیره پرونده" }).click();
  await expect(page.getByRole("dialog").getByRole("alert").filter({ hasText: "ذخیره انجام نشد" })).toBeVisible();
  await expect(page.getByLabel("عنوان شغلی")).toHaveValue("عنوان پیش‌نویس");
  await expect(page.locator(".sr-live")).toHaveText("");
  expect(await saved(page)).toBe(before);
  await setBlocked(page, false);
  await page.getByRole("button", { name: "تلاش دوباره برای ذخیره" }).click();
  await expect(page.locator(".sr-live")).toContainText("ذخیره شد");
  expect(await profile(page)).toMatchObject({ role: "عنوان پیش‌نویس" });
});

test("a profile changed in another tab is merged for review, never silently overwritten", async ({ page }) => {
  await openFile(page);
  await edit(page).click();
  await page.getByLabel("عنوان شغلی").fill("عنوان من");
  await patchSaved(page, "RG-1042", { skill: "مهارت تب دیگر" });
  await page.getByRole("button", { name: "ذخیره پرونده" }).click();
  await expect(page.getByRole("dialog").getByRole("alert").filter({ hasText: "تغییر کرده" })).toBeVisible();
  expect(await profile(page)).toMatchObject({ role: "کارشناس محصول", skill: "مهارت تب دیگر" });
  await expect(page.getByLabel("عنوان شغلی")).toHaveValue("عنوان من");
  await expect(page.getByLabel("مهارت شاخص")).toHaveValue("مهارت تب دیگر");
  await page.getByRole("button", { name: "تلاش دوباره برای ذخیره" }).click();
  await expect(page.locator(".sr-live")).toContainText("ذخیره شد");
  expect(await profile(page)).toMatchObject({ role: "عنوان من", skill: "مهارت تب دیگر", balanceBase: 12.5 });
});

test("a field another tab cleared stays cleared when the user did not edit it", async ({ page }) => {
  await openFile(page);
  await edit(page).click();
  await page.getByLabel("عنوان شغلی").fill("عنوان من");
  await page.evaluate(k => { const d = JSON.parse(localStorage.getItem(k)!); delete d.profiles["RG-1042"].skill; localStorage.setItem(k, JSON.stringify(d)); }, HR);
  await page.getByRole("button", { name: "ذخیره پرونده" }).click();
  await expect(page.getByRole("dialog").getByRole("alert").filter({ hasText: "تغییر کرده" })).toBeVisible();
  await expect(page.getByLabel("مهارت شاخص")).toHaveValue("");
  await page.getByRole("button", { name: "تلاش دوباره برای ذخیره" }).click();
  await expect(page.locator(".sr-live")).toContainText("ذخیره شد");
  const saved1042 = await profile(page);
  expect(saved1042.role).toBe("عنوان من"); expect(Object.hasOwn(saved1042, "skill")).toBe(false);
});

test("an employee removed elsewhere cannot receive a profile save", async ({ page }) => {
  await openFile(page);
  await edit(page).click();
  await page.getByLabel("عنوان شغلی").fill("نباید ذخیره شود");
  const before = await saved(page);
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify(JSON.parse(localStorage.getItem(k)!).filter((e: { code: string }) => e.code !== "RG-1042"))), EMP);
  await page.getByRole("button", { name: "ذخیره پرونده" }).click();
  await expect(page.getByRole("dialog").getByRole("alert").filter({ hasText: "دیگر در فهرست" })).toBeVisible();
  expect(await saved(page)).toBe(before);
  await expect(page.getByLabel("عنوان شغلی")).toHaveValue("نباید ذخیره شود");
});

test("corrupt HR data disables editing and is preserved", async ({ page }) => {
  await page.addInitScript(k => localStorage.setItem(k, "broken-hr"), HR);
  await page.goto("/hr"); await page.getByRole("button", { name: "پرونده کارکنان", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "قابل خواندن نیست" })).toBeVisible();
  await expect(edit(page)).toBeDisabled();
  expect(await saved(page)).toBe("broken-hr");
});

test("overlong text is rejected with a linked error, and Escape closes the drawer and returns focus", async ({ page }) => {
  await openFile(page);
  const before = await saved(page);
  await edit(page).click();
  await page.getByLabel("مهارت شاخص").fill("ا".repeat(121));
  await page.getByRole("button", { name: "ذخیره پرونده" }).click();
  const input = page.getByLabel("مهارت شاخص");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  const describedBy = await input.getAttribute("aria-describedby");
  await expect(page.locator(`#${describedBy}`)).toContainText("حداکثر");
  expect(await saved(page)).toBe(before);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(edit(page)).toBeFocused();
});
