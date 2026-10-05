import { expect, test, type Locator } from "@playwright/test";
import { isoToJalali } from "../src/design/locale";

async function expectError(field: Locator, message: string) {
  await expect(field).toHaveAttribute("aria-invalid", "true");
  const description = await field.evaluate(element => (element.getAttribute("aria-describedby") || "").split(" ").map(id => document.getElementById(id)?.textContent || "").join(" "));
  expect(description).toContain(message);
}

test("login errors identify and focus the field, and clear after editing", async ({ page }) => {
  await page.goto("/login");
  const email = page.getByLabel("ایمیل سازمانی", { exact: true });
  await email.fill("bad"); await page.getByRole("button", { name: "ورود به سامانه", exact: true }).click();
  await expect(email).toBeFocused(); await expectError(email, "ایمیل سازمانی را معتبر");
  await email.fill("sara@rocoguys.ir"); await expect(email).toHaveAttribute("aria-invalid", "false");
  const password = page.getByLabel("رمز عبور", { exact: true });
  await password.fill("short"); await page.getByRole("button", { name: "ورود به سامانه", exact: true }).click();
  await expect(password).toBeFocused(); await expectError(password, "دست‌کم ۸ نویسه");
});

test("request errors are linked to blank time and reason fields, with correction focus", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roco-role", "employee"));
  await page.goto("/requests"); await page.getByRole("button", { name: "درخواست جدید", exact: true }).click();
  await page.getByLabel("نوع درخواست", { exact: true }).selectOption("hourlyLeave");
  await page.getByRole("button", { name: "ثبت و ارسال درخواست", exact: true }).click();
  const start = page.getByLabel("از ساعت", { exact: true });
  await expect(start).toBeFocused(); await expectError(start, "ساعت معتبر وارد کنید");
  await expectError(page.getByLabel("تا ساعت", { exact: true }), "ساعت معتبر وارد کنید");
  await expectError(page.getByLabel("دلیل و توضیحات", { exact: true }), "۱۰ نویسه");
  await page.screenshot({ path: "qa/phase1/request-accessible-errors.png", fullPage: false });
  await start.fill("۰۹:۰۰"); await page.getByLabel("تا ساعت", { exact: true }).fill("۱۰:۰۰");
  await page.getByRole("button", { name: "ثبت و ارسال درخواست", exact: true }).click();
  await expect(page.getByLabel("دلیل و توضیحات", { exact: true })).toBeFocused();
});

test("reversed leave dates identify the end field, not just a detached error", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roco-role", "employee"));
  await page.goto("/requests"); await page.getByRole("button", { name: "درخواست جدید", exact: true }).click();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const future = new Date(Date.parse(today + "T12:00:00Z") + 86400000 * 10).toISOString().slice(0, 10);
  await page.getByLabel("از تاریخ", { exact: true }).fill(isoToJalali(future));
  await page.getByRole("button", { name: "ثبت و ارسال درخواست", exact: true }).click();
  const end = page.getByLabel("تا تاریخ", { exact: true });
  await expect(end).toBeFocused(); await expectError(end, "تاریخ پایان باید بعد از شروع باشد");
});

test("RTL profile tabs support arrows, Home and End without extra tab stops", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roco-role", "employee"));
  await page.goto("/profile");
  const tabs = page.getByRole("tab");
  await tabs.first().focus(); await page.keyboard.press("ArrowLeft");
  await expect(tabs.nth(1)).toBeFocused(); await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End"); await expect(tabs.last()).toBeFocused();
  await page.keyboard.press("Home"); await expect(tabs.first()).toBeFocused();
  expect(await tabs.evaluateAll(elements => elements.filter(e => e.getAttribute("tabindex") === "0").length)).toBe(1);
});

test("request dialog traps forward and reverse keyboard focus then returns it", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roco-role", "employee"));
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/requests");
  const trigger = page.getByRole("button", { name: "درخواست جدید", exact: true }); await trigger.click();
  const dialog = page.getByRole("dialog");
  for (const key of ["Tab", "Shift+Tab"]) for (let i = 0; i < 24; i++) {
    await page.keyboard.press(key); expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
});
