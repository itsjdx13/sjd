import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roco-role", "admin"));
});

test("responsive shell matches each required breakpoint without overflow", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "صبح بخیر، سارا" })).toBeVisible();

    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      phoneFrames: document.querySelectorAll(".phone-stage,.phone-device,.device-menu-bar").length,
      bottomNavigation: getComputedStyle(document.querySelector(".bottom-nav")!).display,
      sidebar: getComputedStyle(document.querySelector(".side-nav")!).display,
    }));

    expect(layout.overflow).toBe(false);
    expect(layout.phoneFrames).toBe(0);
    expect(layout.bottomNavigation === "grid").toBe(viewport.width < 768);
    expect(layout.sidebar === "flex").toBe(viewport.width >= 768);
  }
});

test("captures normalized mobile and desktop dashboard evidence", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.screenshot({ path: "qa/implementation-mobile-390x844.png", fullPage: false });

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/dashboard");
  await page.screenshot({ path: "qa/implementation-desktop-1366x768.png", fullPage: false });
});

test("real routes render independently", async ({ page }) => {
  const routes = [
    ["/clock", "ثبت ورود"],
    ["/attendance", "کارکرد من"],
    ["/requests", "درخواست‌ها"],
    ["/calendar", "تقویم کاری"],
    ["/profile", "پروفایل"],
    ["/manager/approvals", "صندوق تأییدها"],
    ["/hr", "عملیات منابع انسانی"],
    ["/admin", "مدیریت سازمان"],
    ["/admin/import-export", "ورود و خروج داده"],
    ["/workplace-qr", "نمایشگر QR محل کار"],
  ];

  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.locator("#main-content").getByRole("heading", { name: heading }).first()).toBeVisible();
    const overflow = await page.evaluate(() => { const w = window.innerWidth; return [...document.querySelectorAll<HTMLElement>("body *")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).position !== "fixed" && (r.left < -1 || r.right > w + 1) && !e.closest(".table-scroll,.roster-scroll,.sr-only,.skip-link,dialog:not([open])"); }).slice(0, 4).map(e => e.tagName + "." + e.className); });
    expect(overflow, route).toEqual([]);
  }
});

test("HR operations keeps onboarding progress and publishes a shift plan", async ({ page }) => {
  await page.goto("/hr");
  await page.getByRole("button", { name: "ورود و خروج کارکنان" }).click();
  const task = page.getByRole("checkbox", { name: /معرفی مدیر و تیم/ });
  await task.check();
  await expect(page.getByText("۴ از ۶ مرحله")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("roco-onboarding"))).toContain("true");

  await page.getByRole("button", { name: "برنامه شیفت" }).click();
  await page.getByRole("button", { name: "انتشار برنامه" }).click();
  await expect(page.getByRole("button", { name: "منتشر شد" })).toBeDisabled();
  await expect(page.getByText("برنامه شیفت در همین مرورگر منتشر و ذخیره شد.")).toBeAttached();
});

test("offline attendance survives reopening, waits for connection, and preserves its receipt", async ({ page, context }) => {
  await page.goto("/clock");
  await context.setOffline(true);
  await page.getByRole("button", { name: "ذخیره ثبت آفلاین" }).click();
  await expect(page.getByText(/۱ رویداد در صف همگام‌سازی/)).toBeVisible();
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem("roco-attendance-v2")!).events[0]);
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText(/۱ رویداد در صف همگام‌سازی/)).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByRole("button", { name: "انتقال به سابقه نمایشی" })).toBeDisabled();
  await page.getByRole("button", { name: "ذخیره ثبت آفلاین" }).click();
  await expect(page.getByText("ثبت تکراری متوقف شد")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("roco-attendance-v2")!).events.length)).toBe(1);
  await context.setOffline(false);
  await page.getByRole("button", { name: "انتقال به سابقه نمایشی" }).click();
  await expect(page.getByRole("heading", { name: "ورود ثبت شد" })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("roco-attendance-v2")!).events[0]);
  expect(saved.id).toBe(original.id);
  expect(saved.time).toBe(original.time);
  expect(saved.state).toBe("local");
  await page.reload();
  await expect(page.locator("#main-content").getByRole("heading", { name: "ثبت خروج", exact:true })).toBeVisible();
  await expect(page.getByText(/۱ رویداد در صف همگام‌سازی/)).toHaveCount(0);
});

test("corrupt attendance storage is preserved and blocks replacement", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("roco-attendance-v2", "invalid-data"));
  await page.goto("/clock");
  await expect(page.getByRole("alert")).toContainText("هیچ رویدادی حذف نشد");
  await expect(page.getByRole("button", {name:"ثبت ورود با موقعیت مکانی"})).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("roco-attendance-v2"))).toBe("invalid-data");
});
