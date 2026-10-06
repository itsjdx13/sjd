import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const key="roco-announcement-draft-v1";
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem("roco-role","admin"));});
async function open(page:Page) { await page.goto("/hr"); await page.getByRole("button",{name:"پیش‌نمایش",exact:true}).click(); }
async function fill(page:Page) { await page.getByLabel("عنوان اطلاعیه",{exact:true}).fill("جلسه آزمایشی تیم"); await page.getByLabel("متن اطلاعیه",{exact:true}).fill("این پیام فقط پیش‌نمایش است.\nهیچ اطلاعیه‌ای ارسال نمی‌شود."); }

test("actual preview uses shared active employees and saved local draft survives reload without delivery",async({page})=>{
  await open(page); await fill(page);
  await page.getByLabel("مخاطب پیشنهادی",{exact:true}).selectOption("محصول");
  await expect(page.locator(".announcement-preview")).toContainText("جلسه آزمایشی تیم");
  const expected=await page.evaluate(async()=>{const {employeeStore}=await import("/src/features/store.ts");return employeeStore.get().filter((e:any)=>e.status==="active"&&e.department==="محصول").length;});
  await expect(page.locator(".announcement-preview")).toContainText(new Intl.NumberFormat("fa-IR").format(expected)+" نفر");
  await page.getByRole("button",{name:"ذخیره پیش‌نویس محلی",exact:true}).click();
  await expect(page.getByRole("dialog").locator(".sr-live")).toContainText("ارسال نشده است");
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key);
  expect(saved).toMatchObject({version:1,status:"draft",title:"جلسه آزمایشی تیم",department:"محصول"});
  expect(saved.sentAt).toBeUndefined();
  await page.reload(); await page.getByRole("button",{name:"پیش‌نمایش",exact:true}).click();
  await expect(page.getByLabel("عنوان اطلاعیه",{exact:true})).toHaveValue("جلسه آزمایشی تیم");
  await expect(page.getByLabel("مخاطب پیشنهادی",{exact:true})).toHaveValue("محصول");
  await expect(page.getByRole("dialog").getByRole("button",{name:/^ارسال/})).toHaveCount(0);
});

test("failed draft save preserves input and retry confirms storage without false success",async({page})=>{
  await open(page); await fill(page);
  await page.evaluate(k=>{const original=Storage.prototype.setItem;(window as any).restoreWrites=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(name,value){if(name===k)throw new DOMException("Full","QuotaExceededError");original.call(this,name,value);};},key);
  await page.getByRole("button",{name:"ذخیره پیش‌نویس محلی",exact:true}).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("ذخیره انجام نشد");
  await expect(page.getByLabel("عنوان اطلاعیه",{exact:true})).toHaveValue("جلسه آزمایشی تیم");
  await expect(page.getByRole("dialog").locator(".sr-live")).toBeEmpty();
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
  await page.evaluate(()=>(window as any).restoreWrites());
  await page.getByRole("button",{name:"تلاش دوباره برای ذخیره پیش‌نویس",exact:true}).click();
  await expect(page.getByRole("dialog").locator(".sr-live")).toContainText("ذخیره شد");
});

test("uncertain read-back retry confirms the existing draft without another write",async({page})=>{
  await open(page); await fill(page);
  await page.evaluate(k=>{const get=Storage.prototype.getItem,set=Storage.prototype.setItem;let fail=false;(window as any).draftWrites=0;(window as any).restoreRead=()=>Storage.prototype.getItem=get;
    Storage.prototype.setItem=function(name,value){set.call(this,name,value);if(name===k){fail=true;(window as any).draftWrites++;}};
    Storage.prototype.getItem=function(name){if(name===k&&fail){fail=false;throw new DOMException("Unavailable","SecurityError");}return get.call(this,name);};},key);
  await page.getByRole("button",{name:"ذخیره پیش‌نویس محلی",exact:true}).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("قابل تأیید نیست");
  await expect(page.getByRole("dialog").locator(".sr-live")).toBeEmpty();
  await page.evaluate(()=>(window as any).restoreRead());
  await page.getByRole("button",{name:"تلاش دوباره برای ذخیره پیش‌نویس",exact:true}).click();
  await expect(page.getByRole("dialog").locator(".sr-live")).toContainText("ذخیره شد");
  expect(await page.evaluate(()=>(window as any).draftWrites)).toBe(1);
});

test("conflict keeps edited fields and adopts untouched fields from the latest saved draft",async({page})=>{
  await open(page); await fill(page);
  await page.getByRole("button",{name:"ذخیره پیش‌نویس محلی",exact:true}).click();
  await page.getByLabel("عنوان اطلاعیه",{exact:true}).fill("عنوان ویرایش من");
  await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k)!);localStorage.setItem(k,JSON.stringify({...d,body:"متن تازه از پنجره دیگر",department:"مالی",savedAt:new Date().toISOString()}));},key);
  await page.getByRole("button",{name:"ذخیره پیش‌نویس محلی",exact:true}).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("در این فاصله");
  await expect(page.getByLabel("عنوان اطلاعیه",{exact:true})).toHaveValue("عنوان ویرایش من");
  await expect(page.getByLabel("متن اطلاعیه",{exact:true})).toHaveValue("متن تازه از پنجره دیگر");
  await expect(page.getByLabel("مخاطب پیشنهادی",{exact:true})).toHaveValue("مالی");
  await page.getByRole("button",{name:"تلاش دوباره برای ذخیره پیش‌نویس",exact:true}).click();
  expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).body,key)).toBe("متن تازه از پنجره دیگر");
});

test("corrupt draft is preserved and cannot be overwritten",async({page})=>{
  await page.addInitScript(k=>localStorage.setItem(k,"broken-draft"),key); await open(page); await fill(page);
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("قابل خواندن نیست");
  await page.getByRole("button",{name:"ذخیره پیش‌نویس محلی",exact:true}).click();
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe("broken-draft");
  await expect(page.getByRole("dialog").locator(".sr-live")).toBeEmpty();
});

test("required and overlong inputs identify fields; preview treats HTML as plain text",async({page})=>{
  await open(page); await page.getByRole("button",{name:"ذخیره پیش‌نویس محلی",exact:true}).click();
  await expect(page.getByLabel("عنوان اطلاعیه",{exact:true})).toBeFocused();
  await expect(page.getByLabel("عنوان اطلاعیه",{exact:true})).toHaveAttribute("aria-describedby",/.+/);
  await page.getByLabel("عنوان اطلاعیه",{exact:true}).fill("ا".repeat(121));
  await page.getByLabel("متن اطلاعیه",{exact:true}).fill('<img src=x onerror="alert(1)">');
  await page.getByRole("button",{name:"ذخیره پیش‌نویس محلی",exact:true}).click();
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
  await expect(page.locator(".announcement-preview img")).toHaveCount(0);
  await expect(page.locator(".announcement-body")).toContainText("<img");
});

test("preview fits required sizes, traps keyboard focus and restores focus after closing",async({page})=>{
  for(const [width,height] of [[390,844],[430,932],[768,1024],[1366,768],[1440,900],[1920,1080]]) {
    await page.setViewportSize({width,height}); await open(page); await fill(page);
    await page.getByLabel("متن اطلاعیه",{exact:true}).fill("آ".repeat(500));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await page.getByRole("dialog").evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    if(width===390) {
      const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
      expect(result.violations.filter(v=>v.impact==="serious"||v.impact==="critical").map(v=>v.id)).toEqual([]);
      for(let i=0;i<10;i++){await page.keyboard.press("Tab");expect(await page.getByRole("dialog").evaluate(e=>e.contains(document.activeElement))).toBe(true);}
    }
    await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button",{name:"پیش‌نمایش",exact:true})).toBeFocused();
  }
});
