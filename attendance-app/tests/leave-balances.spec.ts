import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
const KEY = "roco-leave-v1";
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem("roco-role", "admin")); });
async function openCorrection(page: Page, name = "سارا احمدی") {
  await page.goto("/hr");
  await page.getByRole("button", { name: "مرخصی و مانده", exact: true }).click();
  await page.getByRole("button", { name: `اصلاح مانده ${name}`, exact: true }).click();
}
async function fillCorrection(page: Page, target = "18") {
  await page.getByLabel("مانده جدید پیش از رزرو درخواست‌ها").fill(target);
  await page.getByLabel("دلیل اصلاح مانده").fill("اصلاح پس از بررسی پرونده آزمایشی");
  await page.getByRole("checkbox", { name: "مقدار، دلیل و اثر بر درخواست‌ها را بررسی کردم." }).check();
}
const saved = (page: Page) => page.evaluate(key => localStorage.getItem(key), KEY);

test("HR correction persists once and feeds requests, dashboard, profile and form validation", async ({ page }) => {
  await openCorrection(page); await fillCorrection(page);
  await page.getByRole("button", { name: "ثبت اصلاح مانده", exact: true }).click();
  await expect(page.locator(".sr-live")).toContainText("اصلاح مانده سارا احمدی ذخیره شد");
  const data = JSON.parse((await saved(page))!);
  expect(data.corrections).toHaveLength(1);
  expect(data.corrections[0]).toMatchObject({ before: 12.5, after: 18, delta: 5.5, employeeCode: "RG-1042" });
  await page.reload(); await page.getByRole("button", { name: "مرخصی و مانده", exact: true }).click();
  await expect(page.locator(".balance-row", { hasText: "سارا احمدی" })).toContainText("۱۸ روز");
  await page.goto("/requests");
  await expect(page.locator(".summary-cards")).toContainText("۱۸ روز");
  await expect(page.locator(".balance-card")).toContainText("۱۷");
  await page.getByRole("button", { name: "درخواست جدید", exact: true }).first().click();
  await expect(page.getByRole("dialog").locator(".impact-box")).toContainText("۱۸ روز مانده");
  await page.keyboard.press("Escape");
  await page.goto("/dashboard"); await expect(page.getByText(/مانده مرخصی پس از رزرو درخواست‌ها:/)).toContainText("۱۷ روز");
  await page.goto("/profile"); await page.getByRole("tab", { name: "حضور" }).click();
  await expect(page.locator(".profile-content")).toContainText("۱۷ روز");
});

test("quota failure keeps the draft and retry creates one correction with history", async ({ page }) => {
  await openCorrection(page); await fillCorrection(page);
  await page.evaluate(key => { const original = Storage.prototype.setItem; (window as any).__originalSet = original; Storage.prototype.setItem = function(k,v) { if(k===key) throw new DOMException("Full","QuotaExceededError"); original.call(this,k,v); }; }, KEY);
  await page.getByRole("button", { name: "ثبت اصلاح مانده", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("ذخیره انجام نشد");
  await expect(page.getByLabel("مانده جدید پیش از رزرو درخواست‌ها")).toHaveValue("18");
  await expect(page.locator(".sr-live")).toHaveText("");
  expect(await saved(page)).toBeNull();
  await page.evaluate(() => { Storage.prototype.setItem = (window as any).__originalSet; });
  await page.getByRole("button", { name: "تلاش دوباره برای ذخیره", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openCorrection(page);
  await expect(page.locator(".leave-history")).toContainText("اصلاح پس از بررسی پرونده آزمایشی");
  expect(JSON.parse((await saved(page))!).corrections).toHaveLength(1);
});

test("uncertain read-back retry does not apply the correction twice", async ({ page }) => {
  await openCorrection(page); await fillCorrection(page);
  await page.evaluate(async key => {
    const { ensureLeaveData } = await import("/src/features/leave.ts"); const { requestStore } = await import("/src/features/store.ts"); ensureLeaveData(requestStore.get());
    const set = Storage.prototype.setItem, get = Storage.prototype.getItem; let fail = false;
    Storage.prototype.setItem = function(k,v) { set.call(this,k,v); if(k===key) fail=true; };
    Storage.prototype.getItem = function(k) { if(k===key&&fail) { fail=false; throw new DOMException("Unavailable","SecurityError"); } return get.call(this,k); };
    (window as any).__restore = () => { Storage.prototype.setItem=set; Storage.prototype.getItem=get; };
  }, KEY);
  await page.getByRole("button", { name: "ثبت اصلاح مانده", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("نتیجه ذخیره قابل تأیید نیست");
  await expect(page.locator(".sr-live")).toHaveText("");
  await page.evaluate(() => (window as any).__restore());
  await page.getByRole("button", { name: "تلاش دوباره برای ذخیره", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(JSON.parse((await saved(page))!).corrections).toHaveLength(1);
});

test("stale correction preserves input and requires fresh confirmation", async ({ page }) => {
  await openCorrection(page); await fillCorrection(page, "20");
  await page.evaluate(async () => {
    const { correctLeaveBalance, requestStore } = await import("/src/features/store.ts"); const { leaveFingerprint } = await import("/src/features/leave.ts");
    correctLeaveBalance({id:"OTHER",code:"RG-1042",target:16,reason:"اصلاح از پنجره آزمایشی دیگر",actor:"تب دیگر",expected:leaveFingerprint(requestStore.get(),"RG-1042")});
  });
  await page.getByRole("button", { name: "ثبت اصلاح مانده", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert").filter({hasText:"در این فاصله"})).toBeVisible();
  await expect(page.getByLabel("مانده جدید پیش از رزرو درخواست‌ها")).toHaveValue("20");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  expect(JSON.parse((await saved(page))!).corrections).toHaveLength(1);
  await page.getByRole("checkbox").check(); await page.getByRole("button", {name:"تلاش دوباره برای ذخیره"}).click();
  const history = JSON.parse((await saved(page))!).corrections;
  expect(history).toHaveLength(2); expect(history[1]).toMatchObject({before:16,after:20,delta:4});
});

test("approval converts a reservation to one deduction, rejection releases it and unpaid leave does not deduct", async ({ page }) => {
  await page.goto("/hr");
  const result = await page.evaluate(async () => {
    const { requestStore, decideRequest } = await import("/src/features/store.ts"); const { balanceFor, ensureLeaveData } = await import("/src/features/leave.ts");
    const before=balanceFor(requestStore.get(),"RG-1048"); ensureLeaveData(requestStore.get());
    decideRequest("REQ-1002","approved","مدیر","تأیید"); const approved=balanceFor(requestStore.get(),"RG-1048");
    const template=requestStore.get().find((r:any)=>r.id==="REQ-1002")!;
    requestStore.setPersisted([...requestStore.get(),{...template,id:"TEST-PAID",status:"pending",days:1},{...template,id:"TEST-UNPAID",status:"pending",leaveKind:"unpaid",days:3}]);
    const reserved=balanceFor(requestStore.get(),"RG-1048"); decideRequest("TEST-PAID","rejected","مدیر","عدم موافقت"); decideRequest("TEST-UNPAID","approved","مدیر","");
    return {before,approved,reserved,after:balanceFor(requestStore.get(),"RG-1048")};
  });
  expect(result.before).toMatchObject({available:8,pendingDays:2,afterPending:6});
  expect(result.approved).toMatchObject({available:6,pendingDays:0,afterPending:6});
  expect(result.reserved).toMatchObject({available:6,pendingDays:1,afterPending:5});
  expect(result.after).toMatchObject({available:6,pendingDays:0,afterPending:6});
  await page.reload();
});

test("migration keeps earlier approved leave inside the opening snapshot", async ({ page }) => {
  await page.goto("/hr");
  const value=await page.evaluate(async()=>{
    const {requestStore}=await import("/src/features/store.ts"); const {ensureLeaveData,balanceFor}=await import("/src/features/leave.ts");
    requestStore.setPersisted(requestStore.get().map((r:any)=>r.id==="REQ-1002"?{...r,status:"approved"}:r));
    ensureLeaveData(requestStore.get()); return balanceFor(requestStore.get(),"RG-1048");
  });
  expect(value).toMatchObject({available:8,pendingDays:0,afterPending:8});
});

test("unknown employees keep an unknown balance until HR records one; corrupt balances are never replaced", async ({ page }) => {
  await page.goto("/hr");
  await page.evaluate(async()=>{const {addEmployee}=await import("/src/features/store.ts");addEmployee({code:"RG-9001",name:"کارمند تازه",department:"مالی",status:"active",shift:"صبح"});});
  await openCorrection(page,"کارمند تازه");
  await expect(page.getByRole("dialog").locator(".impact-box")).toContainText("ثبت نشده");
  await fillCorrection(page,"5"); await page.getByRole("button",{name:"ثبت اصلاح مانده",exact:true}).click();
  expect(JSON.parse((await saved(page))!).corrections[0]).toMatchObject({before:null,after:5,delta:0});
  await page.evaluate(key=>localStorage.setItem(key,"broken-leave"),KEY); await page.reload();
  await expect(page.getByRole("alert").filter({hasText:"قابل خواندن نیست"})).toBeVisible();
  await page.getByRole("button",{name:"مرخصی و مانده",exact:true}).click();
  await expect(page.getByRole("button",{name:"اصلاح مانده سارا احمدی",exact:true})).toBeDisabled();
  expect(await saved(page)).toBe("broken-leave");
});

test("correction requires a reason and prevents setting less than reserved days", async ({ page }) => {
  await openCorrection(page); await fillCorrection(page,"0");
  await page.getByLabel("دلیل اصلاح مانده").fill("");
  await page.getByRole("button",{name:"ثبت اصلاح مانده",exact:true}).click();
  await expect(page.getByRole("dialog").getByRole("alert").filter({hasText:"رزروشده"})).toBeVisible();
  await expect(page.getByLabel("مانده جدید پیش از رزرو درخواست‌ها")).toBeFocused();
  expect(await saved(page)).toBeNull();
});

test("correction drawer fits mobile with accessible controls and focus return", async ({ page }) => {
  await page.setViewportSize({width:390,height:844}); await openCorrection(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
  expect(result.violations.filter(v=>v.impact==="serious"||v.impact==="critical").map(v=>v.id)).toEqual([]);
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"اصلاح مانده سارا احمدی",exact:true})).toBeFocused();
});

test("shared corrected balance blocks excessive paid submission and corrupt data blocks approval without changing requests", async ({ page }) => {
  await openCorrection(page); await fillCorrection(page,"1");
  await page.getByRole("button",{name:"ثبت اصلاح مانده",exact:true}).click();
  const result=await page.evaluate(async()=>{
    const {requestStore,submitRequest,decideRequest}=await import("/src/features/store.ts");
    const {id,status,createdAt,history,employee,employeeCode,...draft}=requestStore.get().find((r:any)=>r.type==="dailyLeave")!;
    const before=JSON.stringify(requestStore.get()); let submission="",approval="";
    try { submitRequest({...draft,days:1,leaveKind:"paid"}); } catch(e) { submission=String(e); }
    const afterSubmission=JSON.stringify(requestStore.get());
    localStorage.setItem("roco-leave-v1","corrupted-accounting");
    try { decideRequest("REQ-1002","approved","مدیر",""); } catch(e) { approval=String(e); }
    return {before,afterSubmission,afterApproval:JSON.stringify(requestStore.get()),submission,approval,raw:localStorage.getItem("roco-leave-v1")};
  });
  expect(result.submission).toContain("کافی نیست"); expect(result.approval).toContain("قابل خواندن نیست");
  expect(result.afterSubmission).toBe(result.before); expect(result.afterApproval).toBe(result.before);
  expect(result.raw).toBe("corrupted-accounting");
});

test("balance report downloads actual corrected values and reservations", async ({ page }) => {
  await openCorrection(page); await fillCorrection(page);
  await page.getByRole("button",{name:"ثبت اصلاح مانده",exact:true}).click();
  const pending=page.waitForEvent("download");
  await page.getByRole("button",{name:"دریافت گزارش",exact:true}).click();
  const file=await pending; expect(file.suggestedFilename()).toBe("leave-balances-demo.csv");
  const csv=await readFile((await file.path())!,"utf8");
  expect(csv).toContain("RG-1042,سارا احمدی,18,1,17");
  await expect(page.locator(".sr-live")).toContainText("دانلود گزارش مانده‌های محلی آغاز شد");
});
