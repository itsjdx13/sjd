import {expect,test} from "@playwright/test";
import {readFile} from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(!localStorage.getItem("roco-session-v1"))localStorage.setItem("roco-role","admin");});});
test("individual selection exports only the chosen employee in CSV and JSON",async({page})=>{
  await page.goto("/admin/import-export");
  await page.getByRole("button",{name:"کارکنان انتخاب‌شده",exact:true}).click();
  await page.getByLabel("جستجوی نام یا کد پرسنلی",{exact:true}).fill("RG-۱۰۴۲");
  await page.getByRole("checkbox",{name:/سارا احمدی RG-1042/}).check();
  await expect(page.getByText("۱ کارمند فعال در خروجی قرار می‌گیرد.",{exact:true})).toBeVisible();
  for(const format of ["csv","json"]) {
    await page.getByRole("combobox",{name:/قالب فایل/}).selectOption(format);
    const result=page.waitForEvent("download");
    await page.getByRole("button",{name:"ساخت و دانلود فایل",exact:true}).click();
    const downloaded=await result;
    const text=await readFile((await downloaded.path())!,"utf8");
    if(format==="json"){const rows=JSON.parse(text);expect(rows.length).toBeGreaterThan(0);expect(rows.every((r:Record<string,string>)=>r["کد پرسنلی"]==="RG-1042")).toBe(true);}
    else {expect(text).toContain("RG-1042");expect(text).not.toContain("RG-1048");}
  }
  const history=await page.evaluate(()=>JSON.parse(localStorage.getItem("roco-exports-v1")!));
  expect(history[0].filters.employeeCodes).toEqual(["RG-1042"]);
  await page.reload();
  await expect(page.locator(".download-history")).toHaveCount(2);
});
test("department intersection excludes hidden selections and empty selection blocks download",async({page})=>{
  await page.goto("/admin/import-export");
  await page.getByRole("button",{name:"کارکنان انتخاب‌شده",exact:true}).click();
  await page.getByRole("button",{name:"ساخت و دانلود فایل",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("هیچ کارمندی");
  await page.getByRole("checkbox",{name:/سارا احمدی RG-1042/}).check();
  await page.getByRole("checkbox",{name:/علی مرادی RG-1048/}).check();
  await page.getByRole("checkbox",{name:"محصول",exact:true}).check();
  await expect(page.getByText("۱ کارمند فعال در خروجی قرار می‌گیرد.",{exact:true})).toBeVisible();
  await expect(page.getByText("برخی انتخاب‌ها خارج از فیلتر فعلی هستند و در این خروجی نمی‌آیند.")).toBeVisible();
  await page.getByRole("button",{name:"پاک کردن انتخاب‌ها",exact:true}).click();
  await expect(page.getByText("۰ کارمند فعال در خروجی قرار می‌گیرد.",{exact:true})).toBeVisible();
});
test("select search results never selects inactive people; search does not change export scope",async({page})=>{
  await page.goto("/admin/import-export");
  await page.getByRole("button",{name:"کارکنان انتخاب‌شده",exact:true}).click();
  await page.getByLabel("جستجوی نام یا کد پرسنلی",{exact:true}).fill("عملیات");
  await page.getByRole("button",{name:"انتخاب نتایج جستجو",exact:true}).click();
  await expect(page.getByText("۲ کارمند فعال در خروجی قرار می‌گیرد.",{exact:true})).toBeVisible();
  await expect(page.getByRole("checkbox",{name:/سینا بهرامی/})).toHaveCount(0);
  await page.getByLabel("جستجوی نام یا کد پرسنلی",{exact:true}).fill("not-found");
  await expect(page.getByText("کارمندی با این جستجو و فیلتر پیدا نشد.")).toBeVisible();
  await expect(page.getByText("۲ کارمند فعال در خروجی قرار می‌گیرد.",{exact:true})).toBeVisible();
});
test("expanded picker is accessible and fits small screens",async({page})=>{
  for(const width of [320,390,1366]) {
    await page.setViewportSize({width,height:900});await page.goto("/admin/import-export");
    if(width<768)await page.getByRole("button",{name:"خروجی",exact:true}).click();
    await page.getByRole("button",{name:"کارکنان انتخاب‌شده",exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
    expect(result.violations.filter(v=>v.impact==="serious"||v.impact==="critical").map(v=>v.id)).toEqual([]);
  }
});
