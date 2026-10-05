import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.addInitScript(() => { if (!localStorage.getItem("roco-session-v1")) localStorage.setItem("roco-role", "admin"); }); });

const routes: Array<[string, string]> = [["/dashboard", "صبح بخیر، سارا"], ["/clock", "ثبت ورود"], ["/attendance", "کارکرد من"], ["/requests", "درخواست‌ها"], ["/calendar", "تقویم کاری"], ["/profile", "پروفایل"], ["/manager/approvals", "صندوق تأییدها"], ["/admin", "مدیریت سازمان"], ["/admin/import-export", "ورود و خروج داده"]];

test("every route renders RTL Persian without horizontal overflow", async ({ page }) => {
  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.locator("#main-content").getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    const state = await page.evaluate(() => {
      const w = window.innerWidth;
      const off = [...document.querySelectorAll<HTMLElement>("body *")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).position !== "fixed" && (r.left < -1 || r.right > w + 1) && !e.closest(".table-scroll,.roster-scroll,.sr-only,.skip-link,dialog:not([open])"); }).slice(0, 3).map(e => e.tagName + "." + e.className);
      return { dir: document.documentElement.dir, lang: document.documentElement.lang, font: document.fonts.check('16px "Estedad"'), off };
    });
    expect(state.dir).toBe("rtl"); expect(state.lang).toBe("fa"); expect(state.font).toBe(true); expect(state.off, route).toEqual([]);
  }
});

test("request sheet opens, validates, submits and closes with focus restored", async ({ page }) => {
  await page.goto("/requests");
  const trigger = page.getByRole("button", { name: "درخواست جدید", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "ثبت و ارسال درخواست" }).click();
  await expect(dialog.getByRole("alert").first()).toBeVisible();
  await dialog.getByLabel("نوع درخواست").selectOption({ label: "اضافه‌کار" });
  await dialog.getByLabel("تاریخ", { exact: true }).fill("۱۴۰۵/۰۷/۰۹");
  await dialog.getByLabel("شروع").fill("17:00"); await dialog.getByLabel("پایان").fill("18:30");
  await dialog.getByLabel("دلیل و توضیحات").fill("تحویل گزارش پایان هفته به مشتری");
  await dialog.getByRole("button", { name: "ثبت و ارسال درخواست" }).click();
  await expect(page.getByRole("status").filter({ hasText: "ارسال شد" })).toBeVisible();
  await expect(dialog).toBeHidden();
});

test("offline punch is queued locally and survives reload", async ({ page, context, browserName }) => {
  test.skip(browserName === "webkit", "WebKit offline emulation is unreliable for same-origin dev servers");
  await page.goto("/clock");
  await expect(page.getByRole("button", { name: "ثبت ورود با موقعیت مکانی" })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "ذخیره ثبت آفلاین" }).click();
  await expect(page.getByText(/۱ رویداد در صف همگام‌سازی/)).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText(/۱ رویداد در صف همگام‌سازی/)).toBeVisible();
});

test("expired session ends at the dedicated screen", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roco-session-v1", JSON.stringify({ role: "employee", expiresAt: Date.now() - 1 })));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "نشست شما منقضی شده است" })).toBeVisible();
});
