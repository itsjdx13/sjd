import { expect, test, type Page } from "@playwright/test";

const key = "roco-requests-v1";
async function openRequest(page: Page) {
  await page.addInitScript(() => localStorage.setItem("roco-role", "employee"));
  await page.goto("/requests"); await page.getByRole("button", { name: "درخواست جدید", exact: true }).click();
  await page.getByLabel("نوع درخواست", { exact: true }).selectOption("missingPunch");
  await page.getByRole("combobox", { name: /رویداد حضور مورد نظر/ }).selectOption({ index: 1 });
  await page.getByLabel("ساعت فراموش‌شده", { exact: true }).fill("۱۷:۰۰");
  await page.getByLabel("دلیل و توضیحات", { exact: true }).fill("خروج خود را امروز فراموش کردم.");
}
async function denyWrites(page: Page) {
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreWrites: () => void }).restoreWrites = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (k, value) { if (k === key) throw new DOMException("Full", "QuotaExceededError"); return original.call(this, k, value); };
  }, key);
}
async function restoreWrites(page: Page) { await page.evaluate(() => (window as unknown as { restoreWrites: () => void }).restoreWrites()); }

test("failed request save preserves the form and successful retry creates one durable request", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openRequest(page); await denyWrites(page);
  await page.getByRole("button", { name: "ثبت و ارسال درخواست", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible(); await expect(page.getByRole("alert")).toContainText("ذخیره انجام نشد");
  await expect(page.getByLabel("دلیل و توضیحات", { exact: true })).toHaveValue("خروج خود را امروز فراموش کردم.");
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  await page.getByRole("button", { name: "تلاش دوباره برای ذخیره درخواست", exact: true }).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "qa/phase1/request-save-retry-mobile.png", fullPage: false });
  await restoreWrites(page); await page.getByRole("button", { name: "تلاش دوباره برای ذخیره درخواست", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible(); await page.reload();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).filter((r: { submissionKey?: string }) => r.submissionKey), key);
  expect(saved).toHaveLength(1); expect(saved[0].history).toHaveLength(1);
});

test("failed read-back after writing can retry without creating a duplicate request", async ({ page }) => {
  await openRequest(page);
  await page.evaluate(key => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem; let deny = false;
    (window as unknown as { restoreWrites: () => void }).restoreWrites = () => { Storage.prototype.getItem = get; Storage.prototype.setItem = set; };
    Storage.prototype.setItem = function (k, value) { set.call(this, k, value); if (k === key) deny = true; };
    Storage.prototype.getItem = function (k) { if (k === key && deny) throw new DOMException("Denied", "SecurityError"); return get.call(this, k); };
  }, key);
  await page.getByRole("button", { name: "ثبت و ارسال درخواست", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("قابل تأیید نیست");
  await restoreWrites(page); await page.getByRole("button", { name: "تلاش دوباره برای ذخیره درخواست", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).filter((r: { submissionKey?: string }) => r.submissionKey).length, key)).toBe(1);
});

test("corrupt requests show a notice and cannot be overwritten", async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, "broken-requests"), key);
  await openRequest(page);
  await page.getByRole("button", { name: "ثبت و ارسال درخواست", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("داده ذخیره‌شده قابل خواندن نیست");
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe("broken-requests");
});

test("failed manager decision preserves comment and status; retry saves one history entry", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roco-role", "manager"));
  await page.goto("/manager/approvals");
  await page.getByRole("button", { name: /علی مرادی/ }).click(); await page.getByLabel("نظر شما", { exact: true }).fill("با این درخواست موافق هستم.");
  await page.getByRole("button", { name: "تأیید درخواست", exact: true }).click(); await denyWrites(page);
  await page.getByRole("button", { name: "بله، تأیید شود", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("ذخیره انجام نشد");
  // The background form is inert under the confirmation dialog; assert both its
  // retained value and the visible comment included in the confirmation.
  await expect(page.locator(".decision-block textarea")).toHaveValue("با این درخواست موافق هستم.");
  await expect(page.getByRole("dialog").getByText("با این درخواست موافق هستم.", { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  await restoreWrites(page); await page.getByRole("button", { name: "تلاش دوباره برای ذخیره تصمیم", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible(); await page.reload();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).find((r: { id: string }) => r.id === "REQ-1002"), key);
  expect(saved.status).toBe("approved"); expect(saved.history.filter((h: { action: string }) => h.action === "approved")).toHaveLength(1);
  expect(saved.history.at(-1).comment).toBe("با این درخواست موافق هستم.");
});

test("a stale confirmation cannot overwrite another manager's decision", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roco-role", "manager")); await page.goto("/manager/approvals");
  await page.getByRole("button", { name: /علی مرادی/ }).click(); await page.getByRole("button", { name: "تأیید درخواست", exact: true }).click();
  await page.evaluate(async () => {
    const { requestStore } = await import("/src/features/store.ts");
    const records = requestStore.getPersisted();
    const changed = records.map(r => r.id === "REQ-1002" ? { ...r, status: "rejected", history: [...r.history, { at: new Date().toISOString(), actor: "مدیر دیگر", action: "rejected", comment: "قبلاً بررسی شد" }] } : r);
    localStorage.setItem("roco-requests-v1", JSON.stringify(changed));
  });
  await page.getByRole("button", { name: "بله، تأیید شود", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("قبلاً بررسی شده");
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).find((r: { id: string }) => r.id === "REQ-1002"), key);
  expect(saved.status).toBe("rejected"); expect(saved.history.at(-1).actor).toBe("مدیر دیگر");
  expect(saved.history.some((h: { action: string }) => h.action === "approved")).toBe(false);
});

test("a storage API that silently ignores a write cannot produce a successful request", async ({ page }) => {
  await openRequest(page);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreWrites: () => void }).restoreWrites = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (k, value) { if (k !== key) original.call(this, k, value); };
  }, key);
  await page.getByRole("button", { name: "ثبت و ارسال درخواست", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("ذخیره تأیید نشد");
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  await restoreWrites(page); await page.getByRole("button", { name: "تلاش دوباره برای ذخیره درخواست", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("returned request edits survive a failed resubmission and keep one resubmission history entry", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roco-role", "employee")); await page.goto("/requests");
  await page.getByRole("button", { name: /اصلاح حضور/ }).click(); await page.getByRole("button", { name: "ویرایش و ارسال مجدد", exact: true }).click();
  await page.getByLabel("ورود صحیح", { exact: true }).fill("۰۸:۳۰"); await page.getByLabel("خروج صحیح", { exact: true }).fill("۱۷:۰۰");
  await denyWrites(page); await page.getByRole("button", { name: "ویرایش و ارسال مجدد", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("ذخیره انجام نشد");
  await expect(page.getByLabel("خروج صحیح", { exact: true })).toHaveValue("۱۷:۰۰");
  await restoreWrites(page); await page.getByRole("button", { name: "تلاش دوباره برای ذخیره درخواست", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible(); await page.reload();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).find((r: { id: string }) => r.id === "REQ-0999"), key);
  expect(saved.status).toBe("pending"); expect(saved.endTime).toBe("17:00"); expect(saved.history.map((h: { action: string }) => h.action)).toEqual(["submitted", "returned", "resubmitted"]);
});
