import { expect, test } from "@playwright/test";
const key="roco-roster-2026-10-03-v1";
test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(!localStorage.getItem("roco-session-v1"))localStorage.setItem("roco-role","admin");});});
test("roster edits and publication survive reload; later edits return to draft",async({page})=>{
  await page.goto("/hr");
  await page.getByRole("button",{name:"برنامه شیفت",exact:true}).click();
  const cell=page.getByLabel("شیفت سارا احمدی 13",{exact:true});
  await cell.selectOption("off");
  await page.reload();await page.getByRole("button",{name:"برنامه شیفت",exact:true}).click();
  await expect(cell).toHaveValue("off");
  await page.getByRole("button",{name:"انتشار برنامه",exact:true}).click();
  await page.reload();await page.getByRole("button",{name:"برنامه شیفت",exact:true}).click();
  await expect(page.getByRole("button",{name:"منتشر شد",exact:true})).toBeDisabled();
  await cell.selectOption("evening");
  await expect(page.getByRole("button",{name:"انتشار برنامه",exact:true})).toBeEnabled();
  expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).publishedAt,key)).toBeNull();
});
test("corrupt roster is preserved and blocks replacement",async({page})=>{
  await page.addInitScript(k=>localStorage.setItem(k,"broken-roster"),key);
  await page.goto("/hr");await page.getByRole("button",{name:"برنامه شیفت",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("قابل خواندن نیست");
  await expect(page.getByLabel("شیفت سارا احمدی 13",{exact:true})).toBeDisabled();
  expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe("broken-roster");
});
test("saving failure does not falsely publish a roster",async({page})=>{
  await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==="roco-roster-2026-10-03-v1")throw new DOMException("Full","QuotaExceededError");return original.call(this,k,v);};});
  await page.goto("/hr");await page.getByRole("button",{name:"برنامه شیفت",exact:true}).click();
  await page.getByRole("button",{name:"انتشار برنامه",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("ذخیره برنامه ممکن نشد");
  await expect(page.getByRole("button",{name:"منتشر شد",exact:true})).toHaveCount(0);
});
test("mobile sheet ignores short drag then closes on downward swipe and returns focus",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/requests");
  const trigger=page.getByRole("button",{name:"درخواست جدید",exact:true});
  await trigger.click();const dialog=page.getByRole("dialog",{name:"درخواست جدید",exact:true});await expect(dialog).toBeVisible();
  const handle=dialog.locator(".sheet-handle");
  const box=(await handle.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2+30,{steps:5});await page.mouse.up();
  await expect(dialog).toBeVisible();
  const next=(await handle.boundingBox())!;
  await page.mouse.move(next.x+next.width/2,next.y+next.height/2);await page.mouse.down();
  await page.mouse.move(next.x+next.width/2,next.y+next.height/2+110,{steps:10});await page.mouse.up();
  await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
});
