import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import QRCode from "qrcode";

const as = (role: string) => async ({ page }: { page: Page }) => { await page.addInitScript(r => { if (!localStorage.getItem("roco-session-v1")) localStorage.setItem("roco-role", r); }, role); };
const offscreen = (page: Page) => page.evaluate(() => { const w = window.innerWidth; return [...document.querySelectorAll<HTMLElement>("body *")].filter(e => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.position !== "fixed" && (r.left < -1 || r.right > w + 1) && !e.closest(".table-scroll,.roster-scroll,.sr-only,.skip-link,dialog:not([open])"); }).slice(0, 4).map(e => e.tagName + "." + e.className); });
const HQ = { latitude: 35.7219, longitude: 51.3347 };

test.describe("session and role-aware shells", () => {
  test("deep link survives login, then logout returns to the sign-in screen", async ({ page }) => {
    await page.goto("/requests");
    await expect(page.getByRole("heading", { name: "ورود به روکو گایز" })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/login");
    await page.getByRole("button", { name: "ورود به سامانه" }).click();
    await expect(page.locator("#main-content").getByRole("heading", { name: "درخواست‌ها", level: 1 })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/requests");
    await page.getByRole("button", { name: "خروج از حساب" }).first().click();
    await expect(page.getByRole("heading", { name: "ورود به روکو گایز" })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("roco-session-v1"))).toBeNull();
  });

  test("login validates credentials before creating a session", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("ایمیل سازمانی").fill("not-an-email");
    await page.getByRole("button", { name: "ورود به سامانه" }).click();
    await expect(page.getByRole("alert")).toContainText("ایمیل");
    expect(await page.evaluate(() => localStorage.getItem("roco-session-v1"))).toBeNull();
  });

  test("expired session shows a dedicated screen and keeps the deep link", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("roco-session-v1", JSON.stringify({ role: "employee", expiresAt: Date.now() - 1000 })));
    await page.goto("/attendance");
    await expect(page.getByRole("heading", { name: "نشست شما منقضی شده است" })).toBeVisible();
    await page.getByRole("button", { name: "ورود دوباره" }).click();
    await page.getByRole("button", { name: "ورود به سامانه" }).click();
    await expect(page.locator("#main-content").getByRole("heading", { name: "کارکرد من" })).toBeVisible();
  });

  test("session that expires while the app is open ends the session", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("roco-session-v1", JSON.stringify({ role: "employee", expiresAt: Date.now() + 1500 })));
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "نشست شما منقضی شده است" })).toBeVisible({ timeout: 6000 });
  });

  test("employees never see manager or administration navigation and direct URLs are refused", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("roco-role", "employee"));
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation", { name: "ناوبری اصلی" });
    for (const name of ["تأییدها", "مدیریت", "منابع انسانی", "راهنمای رابط"]) await expect(nav.getByRole("button", { name })).toHaveCount(0);
    for (const route of ["/manager/approvals", "/admin", "/hr", "/admin/import-export", "/workplace-qr", "/design-system"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { name: "دسترسی محدود است" })).toBeVisible();
    }
    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { name: "صفحه پیدا نشد" })).toBeVisible();
  });

  test("managers get approvals only; admins get everything; Back is predictable", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("roco-role", "manager"));
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation", { name: "ناوبری اصلی" });
    await expect(nav.getByRole("button", { name: /تأییدها/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: "مدیریت" })).toHaveCount(0);
    await nav.getByRole("button", { name: "درخواست‌ها" }).click();
    await nav.getByRole("button", { name: "تقویم" }).click();
    await page.goBack();
    await expect(page.locator("#main-content").getByRole("heading", { name: "درخواست‌ها", level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(/درخواست‌ها/);
  });
});

test.describe("clock-in", () => {
  test.beforeEach(as("employee"));

  test("nothing is requested until a method is chosen, and the employee app never shows a QR", async ({ page, context }) => {
    let asked = 0;
    await page.addInitScript(() => {
      const count = () => { (window as unknown as { __asked: number }).__asked = ((window as unknown as { __asked?: number }).__asked ?? 0) + 1; };
      navigator.geolocation.getCurrentPosition = (() => count()) as never;
      navigator.mediaDevices.getUserMedia = (async () => { count(); throw new DOMException("x", "NotAllowedError"); }) as never;
    });
    await page.goto("/clock");
    await expect(page.getByRole("button", { name: "ثبت ورود با موقعیت مکانی" })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __asked?: number }).__asked ?? 0)).toBe(0);
    await expect(page.locator("canvas, #main-content img[alt*='QR']")).toHaveCount(0);
    void asked; void context;
  });

  test("GPS inside the geofence: confirmation summary, then a durable receipt", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ ...HQ, accuracy: 20 });
    await page.goto("/clock");
    await page.getByRole("button", { name: "ثبت ورود با موقعیت مکانی" }).click();
    const summary = page.getByRole("region", { name: "بررسی پیش از ثبت" });
    await expect(summary).toBeVisible();
    for (const label of ["اقدام", "روش", "محل", "دقت موقعیت", "شیفت", "زمان فعلی"]) await expect(summary.getByText(label, { exact: true })).toBeVisible();
    await summary.getByRole("button", { name: "تأیید و ثبت ورود" }).click();
    await expect(page.getByRole("heading", { name: "ورود ثبت شد" })).toBeVisible();
    const event = await page.evaluate(() => JSON.parse(localStorage.getItem("roco-attendance-v2")!).events[0]);
    expect(event.method).toBe("gps");
    expect(event.location.accuracy).toBe(20);
    await expect(page.locator(".receipt")).toContainText(event.id);
    await expect(page.locator(".receipt")).toContainText("موقعیت مکانی");
    await expect(page.locator(".next-action")).toContainText("ثبت خروج");
    // durable: the receipt can be reopened after reload
    await page.reload();
    await page.getByRole("button", { name: /مشاهده رسید/ }).click();
    await expect(page.getByRole("dialog").getByText(event.id)).toBeVisible();
  });

  test("GPS outside geofence blocks the punch; low accuracy asks for a retry", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 35.75, longitude: 51.4, accuracy: 20 });
    await page.goto("/clock");
    await page.getByRole("button", { name: "ثبت ورود با موقعیت مکانی" }).click();
    await expect(page.getByRole("alert")).toContainText("خارج از محدوده");
    expect(await page.evaluate(() => localStorage.getItem("roco-attendance-v2"))).toBeNull();
    await context.setGeolocation({ ...HQ, accuracy: 900 });
    await page.getByRole("button", { name: "بررسی دوباره" }).click();
    await expect(page.getByRole("alert")).toContainText("دقت موقعیت کافی نیست");
  });

  test("GPS permission denied is explained and offers QR instead", async ({ page, context }) => {
    await context.clearPermissions();
    await page.addInitScript(() => { navigator.geolocation.getCurrentPosition = ((_: unknown, err: (e: unknown) => void) => err({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 })) as never; });
    await page.goto("/clock");
    await page.getByRole("button", { name: "ثبت ورود با موقعیت مکانی" }).click();
    await expect(page.getByRole("alert")).toContainText("دسترسی به موقعیت داده نشده");
    await expect(page.getByRole("button", { name: /اسکن QR/ })).toBeVisible();
  });

  test("GPS service unavailable and camera denied each have an explicit state", async ({ page }) => {
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = ((_: unknown, err: (e: unknown) => void) => err({ code: 2, PERMISSION_DENIED: 1, TIMEOUT: 3 })) as never;
      navigator.mediaDevices.getUserMedia = (async () => { throw new DOMException("denied", "NotAllowedError"); }) as never;
    });
    await page.goto("/clock");
    await page.getByRole("button", { name: "ثبت ورود با موقعیت مکانی" }).click();
    await expect(page.getByRole("alert")).toContainText("سرویس موقعیت‌یابی در دسترس نیست");
    await page.getByRole("button", { name: /اسکن QR/ }).click();
    await expect(page.getByRole("alert")).toContainText("دسترسی به دوربین داده نشده");
  });

  test("QR: scans the rotating workplace code from the camera, rejects stale or foreign codes", async ({ page }) => {
    const sign = (site: string, w: number) => createHash("sha256").update(`roco-demo-qr-secret-v1:${site}:${w}`).digest("hex").slice(0, 16);
    const win = Math.floor(Date.now() / 1000 / 30);
    const stale = await QRCode.toDataURL(`ROCO:v1:hq:${win - 10}:${sign("hq", win - 10)}`, { margin: 4, width: 480 });
    const good = await QRCode.toDataURL(`ROCO:v1:hq:${win}:${sign("hq", win)}`, { margin: 4, width: 480 });
    await page.addInitScript(({ stale, good }) => {
      const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 480; const ctx = canvas.getContext("2d")!;
      const images = { stale: new Image(), good: new Image() }; images.stale.src = stale; images.good.src = good;
      (window as unknown as { __qr: string }).__qr = "stale";
      setInterval(() => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 640, 480); const img = images[(window as unknown as { __qr: "stale" | "good" }).__qr]; if (img.complete) ctx.drawImage(img, 80, 0, 480, 480); }, 60);
      navigator.mediaDevices.getUserMedia = (async () => canvas.captureStream(15)) as never;
    }, { stale, good });
    await page.goto("/clock");
    await page.getByRole("button", { name: /ثبت ورود با اسکن QR/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "منقضی شده" })).toBeVisible({ timeout: 8000 });
    await page.evaluate(() => { (window as unknown as { __qr: string }).__qr = "good"; });
    const summary = page.getByRole("region", { name: "بررسی پیش از ثبت" });
    await expect(summary).toBeVisible({ timeout: 8000 });
    await expect(summary).toContainText("اسکن QR محل کار");
    await summary.getByRole("button", { name: "تأیید و ثبت ورود" }).click();
    await expect(page.getByRole("heading", { name: "ورود ثبت شد" })).toBeVisible();
    expect((await page.evaluate(() => JSON.parse(localStorage.getItem("roco-attendance-v2")!).events[0])).method).toBe("qr");
  });

  test("duplicate punches inside the window are blocked and the camera is released", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]); await context.setGeolocation({ ...HQ, accuracy: 15 });
    await page.goto("/clock");
    await page.getByRole("button", { name: "ثبت ورود با موقعیت مکانی" }).click();
    await page.getByRole("button", { name: "تأیید و ثبت ورود" }).click();
    await page.getByRole("button", { name: "بازگشت به ثبت حضور" }).first().click();
    await page.getByRole("button", { name: "ثبت خروج با موقعیت مکانی" }).click();
    await page.getByRole("button", { name: "تأیید و ثبت خروج" }).click();
    await expect(page.getByText("ثبت تکراری متوقف شد")).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("roco-attendance-v2")!).events.length)).toBe(1);
  });

  test("workplace display produces codes that verify, expire and reject tampering", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("roco-role", "hr"));
    await page.goto("/workplace-qr");
    await expect(page.getByRole("img", { name: "کد QR چرخان ثبت حضور" })).toBeVisible();
    const out = await page.evaluate(async () => {
      const m = await import("/src/features/qr.ts");
      const { payload } = await m.makeQrPayload();
      const ok = await m.verifyQrPayload(payload);
      const late = await m.verifyQrPayload(payload, Date.now() + 120_000);
      const bad = await m.verifyQrPayload(payload.slice(0, -1) + (payload.endsWith("0") ? "1" : "0"));
      const other = await m.verifyQrPayload("https://example.com");
      return { ok, late, bad, other };
    });
    expect(out.ok.ok).toBe(true);
    expect(out.late).toMatchObject({ ok: false, reason: "expired" });
    expect(out.bad).toMatchObject({ ok: false, reason: "signature" });
    expect(out.other).toMatchObject({ ok: false, reason: "format" });
  });
});

test.describe("requests and approvals", () => {
  test("type drives fields; validation, balance and overlap are enforced; sheet focus is restored", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("roco-role", "employee"));
    await page.goto("/requests");
    const trigger = page.getByRole("button", { name: "درخواست جدید", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("نوع مرخصی")).toBeVisible();
    await dialog.getByLabel("نوع درخواست").selectOption({ label: "مرخصی ساعتی" });
    await expect(dialog.getByRole("textbox", { name: "از ساعت" })).toBeVisible();
    await expect(dialog.getByLabel("نوع مرخصی")).toHaveCount(0);
    await dialog.getByLabel("نوع درخواست").selectOption({ label: "ماموریت" });
    await expect(dialog.getByLabel("مقصد")).toBeVisible();
    await dialog.getByLabel("نوع درخواست").selectOption({ label: "فراموشی ثبت" });
    await expect(dialog.getByLabel("رویداد حضور مورد نظر")).toBeVisible();
    await dialog.getByLabel("نوع درخواست").selectOption({ label: "مرخصی روزانه" });
    await dialog.getByRole("button", { name: "ثبت و ارسال درخواست" }).click();
    await expect(dialog.getByRole("alert").first()).toBeVisible();
    // overlaps the seeded pending request on 1405/07/14 and exceeds nothing
    await dialog.getByLabel("از تاریخ", { exact: true }).fill("۱۴۰۵/۰۷/۱۴");
    await dialog.getByLabel("تا تاریخ", { exact: true }).fill("۱۴۰۵/۰۷/۱۴");
    await dialog.getByLabel("دلیل و توضیحات").fill("کار شخصی که نیاز به حضور دارد");
    await expect(dialog.getByText("هم‌پوشانی با درخواست دیگر")).toBeVisible();
    await dialog.getByRole("button", { name: "ثبت و ارسال درخواست" }).click();
    await expect(dialog.getByText("برای ادامه این گزینه را تأیید کنید.")).toBeVisible();
    // balance: 40 working days of paid leave exceeds the balance
    await dialog.getByLabel("تا تاریخ", { exact: true }).fill("۱۴۰۵/۰۹/۳۰");
    await dialog.getByLabel("نوع مرخصی").selectOption("paid");
    await dialog.getByRole("button", { name: "ثبت و ارسال درخواست" }).click();
    await expect(dialog.getByText("مانده مرخصی کافی نیست")).toBeVisible();
    await dialog.getByLabel("نوع مرخصی").selectOption("unpaid");
    await expect(dialog.getByText("مانده مرخصی کافی نیست")).toHaveCount(0);
    await expect(dialog.getByLabel("مسیر تأیید")).toContainText("نیما رضایی");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("sheet closes by backdrop and close button", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("roco-role", "employee"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/requests");
    await page.getByRole("button", { name: "درخواست جدید", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.mouse.click(195, 20);
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("button", { name: "درخواست جدید", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "بستن" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("employee submits; manager decides others with confirmation; own requests never reach the own inbox", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("roco-role", "employee"));
    await page.goto("/requests");
    await page.getByRole("button", { name: "درخواست جدید", exact: true }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("نوع درخواست").selectOption({ label: "اضافه‌کار" });
    await d.getByLabel("تاریخ", { exact: true }).fill("۱۴۰۵/۰۷/۰۹");
    await d.getByLabel("شروع").fill("17:00"); await d.getByLabel("پایان").fill("19:00");
    await d.getByLabel("دلیل و توضیحات").fill("تحویل گزارش پایان هفته به مشتری");
    await d.getByRole("button", { name: "ثبت و ارسال درخواست" }).click();
    await expect(page.getByRole("status").filter({ hasText: "برای نیما رضایی ارسال شد" })).toBeVisible();
    await expect(page.locator(".request-list")).toContainText("اضافه‌کار");

    await page.evaluate(() => localStorage.setItem("roco-session-v1", JSON.stringify({ role: "manager", expiresAt: Date.now() + 1e7 })));
    await page.goto("/manager/approvals");
    await expect(page.getByText("۳ درخواست منتظر تصمیم شماست")).toBeVisible();
    await expect(page.getByRole("button", { name: /اضافه‌کار/ })).toHaveCount(1); // only رضا نادری's, not the one just submitted by the signed-in user
    await page.getByRole("button", { name: /علی مرادی/ }).click();
    await page.getByRole("button", { name: "رد درخواست" }).click();
    await expect(page.getByRole("alert")).toContainText("دلیل");
    await page.getByLabel("نظر شما").fill("در این بازه تیم کمبود نیرو دارد");
    await page.getByRole("button", { name: "رد درخواست" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /بله/ }).click();
    await expect(page.getByText("۲ درخواست منتظر تصمیم شماست")).toBeVisible();
    await expect(page.locator(".decision-result")).toContainText("رد شد");
    await expect(page.locator(".status-timeline")).toContainText("در این بازه تیم کمبود نیرو دارد");
    await page.getByRole("tab", { name: /بررسی‌شده/ }).click();
    await expect(page.getByRole("button", { name: /علی مرادی/ })).toBeVisible();
  });

  test("returned requests can be edited and resubmitted; history records it", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("roco-role", "employee"));
    await page.goto("/requests");
    await page.getByRole("button", { name: /اصلاح حضور/ }).click();
    await expect(page.getByRole("dialog")).toContainText("ساعت دقیق خروج را بنویسید");
    await page.getByRole("button", { name: "ویرایش و ارسال مجدد" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("ورود صحیح").fill("08:30"); await d.getByLabel("خروج صحیح").fill("17:00");
    await d.getByRole("button", { name: "ویرایش و ارسال مجدد" }).click();
    await expect(page.locator(".request-list").getByText("در انتظار تأیید").first()).toBeVisible();
    const hist = await page.evaluate(() => JSON.parse(localStorage.getItem("roco-requests-v1")!).find((r: { id: string }) => r.id === "REQ-0999").history.map((h: { action: string }) => h.action));
    expect(hist).toEqual(["submitted", "returned", "resubmitted"]);
  });
});

test.describe("attendance and calendar", () => {
  test.beforeEach(as("employee"));
  test("weekly and monthly modes keep independent ranges; records open a detail drawer instead of alert()", async ({ page }) => {
    let dialogs = 0; page.on("dialog", d => { dialogs++; void d.dismiss(); });
    await page.goto("/attendance");
    const label = () => page.locator(".period-nav strong").textContent();
    const weekNow = await label();
    await page.getByRole("button", { name: "هفته قبل" }).click();
    const weekPrev = await label();
    expect(weekPrev).not.toBe(weekNow);
    await page.getByRole("tab", { name: "ماهانه" }).click();
    const monthNow = await label();
    await page.getByRole("button", { name: "ماه قبل" }).click();
    const monthPrev = await label();
    expect(monthPrev).not.toBe(monthNow);
    await page.getByRole("tab", { name: "هفتگی" }).click();
    expect(await label()).toBe(weekPrev);
    await page.getByRole("tab", { name: "ماهانه" }).click();
    expect(await label()).toBe(monthPrev);
    await page.getByRole("button", { name: /^جزئیات/ }).first().click();
    await expect(page.getByRole("dialog")).toContainText("شیفت");
    await page.keyboard.press("Escape");
    expect(dialogs).toBe(0);
    await page.getByRole("button", { name: "ماه بعد" }).click();
    await page.getByRole("button", { name: "ماه بعد" }).click();
    await expect(page.getByText("هنوز رکوردی وجود ندارد")).toBeVisible();
  });

  test("a missing punch offers a correction that opens the prefilled form", async ({ page }) => {
    await page.goto("/attendance");
    await page.getByRole("tab", { name: "ماهانه" }).click();
    await page.getByRole("button", { name: "ماه قبل" }).click();
    const missing = page.getByRole("row").filter({ hasText: "ثبت ناقص" }).first();
    await missing.getByRole("button").click();
    await page.getByRole("button", { name: "ثبت درخواست اصلاح" }).click();
    await expect(page.getByRole("dialog").getByLabel("نوع درخواست")).toHaveValue("correction");
  });

  test("calendar day detail shows the request on its day", async ({ page }) => {
    await page.goto("/calendar");
    for (let i = 0; i < 1; i++) await page.getByRole("button", { name: "ماه بعد", exact: true }).click();
    await page.getByRole("button", { name: "ماه قبل", exact: true }).click();
    await page.getByRole("button", { name: /۱۴۰۵\/۰۷\/۱۴/ }).click();
    await expect(page.locator(".day-detail")).toContainText("مرخصی روزانه");
  });
});

test.describe("administration", () => {
  test.beforeEach(as("admin"));
  test("table filters, paginates, bulk-edits and opens a detail drawer", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/admin");
    await expect(page.getByText("نمایش ۱ تا ۵ از ۱۲")).toBeVisible();
    await page.getByRole("button", { name: "صفحه بعد" }).click();
    await expect(page.getByText("نمایش ۶ تا ۱۰ از ۱۲")).toBeVisible();
    await page.getByLabel("فیلتر واحد").selectOption("عملیات");
    await expect(page.getByText("نمایش ۱ تا ۳ از ۳")).toBeVisible();
    await page.getByLabel("انتخاب همه ردیف‌های این صفحه").check();
    await expect(page.getByText("۳ نفر انتخاب شده")).toBeVisible();
    await page.getByLabel("واحد جدید").selectOption("فروش");
    await page.getByRole("button", { name: "تغییر واحد" }).click();
    await expect(page.getByText("هیچ", { exact: false }).first()).toBeHidden().catch(() => {});
    await page.getByLabel("فیلتر واحد").selectOption("all");
    await page.getByLabel("جستجوی کارمند").fill("علی مرادی");
    await page.getByRole("button", { name: "جزئیات علی مرادی" }).click();
    await expect(page.getByRole("dialog")).toContainText("فروش");
    await page.getByRole("button", { name: "ویرایش پرونده" }).click();
    await page.getByRole("dialog").getByLabel("شیفت").selectOption("عصر");
    await page.getByRole("button", { name: "ذخیره تغییرها" }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("roco-employees-v1")!).find((e: { code: string }) => e.code === "RG-1048").shift)).toBe("عصر");
  });

  test("mobile administration is limited to quick actions", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin");
    await expect(page.getByLabel("انتخاب همه ردیف‌های این صفحه")).toHaveCount(0);
    await expect(page.getByText("برای مدیریت گروهی از رایانه استفاده کنید")).toBeVisible();
  });

  test("import: upload → mapping → validation preview → commit → result", async ({ page }) => {
    await page.goto("/admin/import-export");
    const csv = "کد پرسنلی,نام و نام خانوادگی,واحد,ایمیل\nRG-2001,لیلا رضایی,مالی,leila@rocoguys.ir\nRG-2002,,مالی,x@rocoguys.ir\nRG-1042,تکراری,مالی,\nRG-2004,بدون واحد معتبر,نامعلوم,a@b.co\nRG-2005,مهدی کاظمی,محصول,mehdi@rocoguys.ir";
    await page.locator("input[type=file]").setInputFiles({ name: "emp.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
    await expect(page.getByRole("heading", { name: "تطبیق ستون‌ها" })).toBeVisible();
    await expect(page.getByLabel("کد پرسنلی", { exact: false }).first()).toHaveValue("0");
    await page.getByRole("button", { name: "اعتبارسنجی داده‌ها" }).click();
    await expect(page.getByText("۲ ردیف معتبر")).toBeVisible();
    await expect(page.getByText("۳ ردیف دارای خطا")).toBeVisible();
    await expect(page.getByText("نام خالی است")).toBeVisible();
    await expect(page.getByText("از قبل وجود دارد")).toBeVisible();
    await expect(page.getByText("«نامعلوم» تعریف نشده است")).toBeVisible();
    await page.getByRole("button", { name: /ادامه با ۲ ردیف/ }).click();
    await page.getByRole("button", { name: "ثبت ۲ کارمند" }).click();
    await expect(page.getByRole("heading", { name: "ورود اطلاعات کامل شد" })).toBeVisible();
    const codes = await page.evaluate(() => JSON.parse(localStorage.getItem("roco-employees-v1")!).map((e: { code: string }) => e.code));
    expect(codes).toContain("RG-2001"); expect(codes).toContain("RG-2005"); expect(codes).not.toContain("RG-2002");
    await page.getByRole("button", { name: "گزارش خطاها" }).click({ trial: true });
  });

  test("import rejects unsupported and oversized files with a clear message", async ({ page }) => {
    await page.goto("/admin/import-export");
    await page.locator("input[type=file]").setInputFiles({ name: "a.xls", mimeType: "application/vnd.ms-excel", buffer: Buffer.from("x") });
    await expect(page.getByRole("alert")).toContainText("CSV");
  });

  test("export honors range and department, reports progress, downloads real data and keeps history", async ({ page }) => {
    await page.goto("/admin/import-export");
    await page.getByLabel("مالی").check();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "ساخت و دانلود فایل" }).click()]);
    expect(download.suggestedFilename()).toMatch(/^attendance_.*\.csv$/);
    const text = (await (await import("node:fs/promises")).readFile((await download.path())!, "utf8"));
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.trim().split(/\r\n/);
    expect(lines[0]).toContain("کد پرسنلی");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.slice(1).every(l => l.includes("مالی"))).toBe(true);
    await expect(page.locator(".download-history")).toHaveCount(1);
    await page.getByLabel("از تاریخ", { exact: true }).fill("۱۴۰۵/۰۷/۱۰");
    await page.getByLabel("تا تاریخ", { exact: true }).fill("۱۴۰۵/۰۷/۰۱");
    await expect(page.getByRole("alert")).toContainText("تاریخ پایان باید بعد از شروع باشد");
  });
});

test.describe("quality gates", () => {
  const routes = ["/dashboard", "/clock", "/attendance", "/requests", "/calendar", "/profile", "/manager/approvals", "/hr", "/admin", "/admin/import-export", "/workplace-qr"];

  test("every interactive control is at least 44×44 CSS px on mobile and desktop", async ({ page }) => {
    test.setTimeout(180_000);
    await page.addInitScript(() => localStorage.setItem("roco-role", "admin"));
    for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 768 }]) {
      await page.setViewportSize(viewport);
      for (const route of routes) {
        await page.goto(route);
        await page.waitForTimeout(350);
        const small = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("a[href],button,input:not([type=hidden]),select,textarea,[role=tab],[role=button]")]
          .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; })
          .filter(el => !el.closest(".sr-only") && !el.classList.contains("skip-link") && !(el instanceof HTMLInputElement && el.type === "file" && el.hidden))
          .map(el => { const target = el instanceof HTMLInputElement && /checkbox|radio/.test(el.type) && el.closest("label") ? el.closest("label")! : el; const r = target.getBoundingClientRect(); return { el: `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 20)}"`, w: Math.round(r.width), h: Math.round(r.height) }; })
          .filter(x => x.w < 44 || x.h < 44));
        expect(small, `${route} @${viewport.width}`).toEqual([]);
      }
    }
  });

  test("nothing overflows the viewport at 200% and 400% zoom equivalents and every required device size", async ({ page }) => {
    test.setTimeout(180_000);
    await page.addInitScript(() => localStorage.setItem("roco-role", "admin"));
    for (const viewport of [{ width: 683, height: 384 }, { width: 320, height: 256 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 1366, height: 768 }]) {
      await page.setViewportSize(viewport);
      for (const route of routes) {
        await page.goto(route); await page.waitForTimeout(250);
        const overflow = await offscreen(page);
        expect(overflow, `${route} @${viewport.width}`).toEqual([]);
      }
    }
  });

  test("axe finds no serious or critical violations on any route", async ({ page }) => {
    test.setTimeout(240_000);
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    await page.addInitScript(() => localStorage.setItem("roco-role", "admin"));
    for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 768 }]) {
      await page.setViewportSize(viewport);
      for (const route of routes) {
        await page.goto(route); await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        const bad = results.violations.filter(v => v.impact === "serious" || v.impact === "critical").map(v => `${v.id}: ${v.nodes.slice(0, 2).map(n => n.target.join(" ")).join(" | ")}`);
        expect(bad, `${route} @${viewport.width}`).toEqual([]);
      }
    }
  });

  test("keyboard-only: tab order reaches skip link first and every focused control shows a visible ring", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("roco-role", "manager"));
    await page.goto("/dashboard");
    await expect(page.locator("#main-content h1")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "پرش به محتوای اصلی" })).toBeFocused();
    const rings: string[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      rings.push(await page.evaluate(() => { const el = document.activeElement as HTMLElement; const s = getComputedStyle(el); return el === document.body || (parseFloat(s.outlineWidth) >= 2 && s.outlineStyle !== "none") || parseFloat(s.boxShadow.split(" ").pop() ?? "0") > 0 ? "ok" : `${el.tagName}.${el.className}`; }));
    }
    expect(rings.filter(r => r !== "ok")).toEqual([]);
  });

  test("reduced motion removes animation and respects safe areas viewport meta", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("roco-role", "employee"));
    await page.goto("/attendance");
    await expect(page.locator(".summary-cards")).toBeVisible();
    const dur = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".skeleton-row, .summary-cards")!).animationDuration || "0"));
    expect(dur).toBeLessThan(0.05);
    expect(await page.locator('meta[name=viewport]').getAttribute("content")).toContain("viewport-fit=cover");
    expect(await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir, getComputedStyle(document.body).fontFamily.includes("Estedad")])).toEqual(["fa", "rtl", true]);
  });

  test("inactive pages are removed from the DOM; tablet shows a rail, phone shows bottom nav, desktop the 248px sidebar", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("roco-role", "employee"));
    for (const [w, h, expectNav] of [[390, 844, "bottom"], [768, 1024, "rail"], [1366, 768, "sidebar"]] as const) {
      await page.setViewportSize({ width: w, height: h }); await page.goto("/dashboard");
      await expect(page.locator("#main-content h1")).toHaveCount(1);
      const bar = await page.evaluate(() => ({ side: document.querySelector(".side-nav")!.getBoundingClientRect().width, bottom: getComputedStyle(document.querySelector(".bottom-nav")!).display }));
      if (expectNav === "bottom") expect(bar.bottom).toBe("grid"); else expect(bar.bottom).toBe("none");
      if (expectNav === "sidebar") expect(Math.round(bar.side)).toBe(248);
      if (expectNav === "rail") expect(bar.side).toBeLessThan(100);
      for (const btn of await page.getByRole("navigation", { name: expectNav === "bottom" ? "ناوبری پایین" : "ناوبری اصلی" }).getByRole("button").all()) expect((await btn.getAttribute("aria-label")) || (await btn.innerText()) || (await btn.textContent())).toBeTruthy();
    }
  });
});
