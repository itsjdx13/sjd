import { test, expect } from "@playwright/test";
import { isoToJalali, jalaliToISO, normalizeDigits, validTime } from "../src/design/locale";
import { can, isRole, organizationPolicy } from "../src/design/policy";

test("shared policy preserves the user's explicit decisions",()=>{
  expect(organizationPolicy.weekendDays).toEqual([6,0]);
  expect(organizationPolicy.approvalRoute).toEqual(["manager"]);
  expect(can("admin","approveRequests")).toBe(true);
  expect(can("admin","editAttendance")).toBe(true);
  expect(can("hr","users")).toBe(false);
  expect(isRole("superuser")).toBe(false);
});
test("Jalali parsing supports three digit sets and leap boundaries",()=>{
  expect(normalizeDigits("۱۴۰۵/٠٧/09")).toBe("1405/07/09");
  expect(jalaliToISO("۱۴۰۵/۰۷/۰۹")).toBe("2026-10-01");
  expect(isoToJalali("2026-10-01")).toBe("۱۴۰۵/۰۷/۰۹");
  expect(jalaliToISO("۱۴۰۳/۱۲/۳۰")).toBe("2025-03-20");
  expect(jalaliToISO("۱۴۰۴/۱۲/۳۰")).toBeNull();
  expect(jalaliToISO("۱۴۰۵/۰۷/۳۱")).toBeNull();
  expect(validTime("٠٨:۳۰")).toBe(true);
  expect(validTime("۲۴:۰۰")).toBe(false);
});
test("reference page fits all required sizes and 320px reflow",async({page})=>{
  await page.addInitScript(()=>localStorage.setItem("roco-role","admin"));
  for(const [width,height] of [[320,900],[390,844],[430,932],[768,1024],[1366,768],[1440,900],[1920,1080]]) {
    await page.setViewportSize({width,height});await page.goto("/design-system");
    await expect(page.getByRole("heading",{name:"راهنمای رابط روکو گایز"})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.screenshot({path:"qa/v2-reference-desktop.png",fullPage:false});
});
test("reference modal traps focus, closes with Escape and restores focus",async({page})=>{
  await page.addInitScript(()=>localStorage.setItem("roco-role","admin"));
  await page.goto("/design-system");
  const trigger=page.getByRole("button",{name:"نمونه پنجره"});
  await trigger.click();
  const dialog=page.getByRole("dialog");await expect(dialog).toBeVisible();
  for(let i=0;i<6;i++){await page.keyboard.press("Tab");expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);}
  await page.keyboard.press("Escape");await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
  await page.getByLabel("تاریخ جلالی",{exact:true}).fill("۱۴۰۵/۰۷/۳۱");
  await expect(page.getByLabel("تاریخ جلالی",{exact:true})).toHaveAttribute("aria-invalid","true");
});
test("mobile navigation includes profile and request preview is manager-only",async({page})=>{
  await page.addInitScript(()=>localStorage.setItem("roco-role","admin"));
  await page.setViewportSize({width:390,height:844});await page.goto("/requests");
  await expect(page.locator(".bottom-nav").getByRole("button",{name:"پروفایل"})).toBeVisible();
  await page.getByRole("button",{name:"درخواست جدید",exact:true}).click();
  await expect(page.getByLabel("مسیر تأیید")).toContainText("نیما رضایی");
  await expect(page.getByLabel("مسیر تأیید")).toContainText("تأیید نهایی مدیر مستقیم");
});
test("calendar shows real months and Saturday/Sunday weekends",async({page})=>{
  await page.addInitScript(()=>localStorage.setItem("roco-role","admin"));
  await page.goto("/calendar");
  await expect(page.getByText("تعطیلات هفتگی شما: شنبه و یکشنبه")).toBeVisible();
  const before=await page.locator(".calendar-head h2").textContent();
  await page.getByRole("button",{name:"ماه بعد",exact:true}).click();
  expect(await page.locator(".calendar-head h2").textContent()).not.toBe(before);
  expect(await page.locator(".month-grid button").count()).toBeLessThanOrEqual(31);
  await page.locator(".month-grid button.holiday").first().click();
  await expect(page.getByText("تعطیل هفتگی؛ شیفت عادی برنامه‌ریزی نشده است.")).toBeVisible();
});
