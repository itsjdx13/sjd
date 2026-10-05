import { useState } from "react";
import { Badge, Button, Field, JalaliField, Modal, TimeField, UploadField } from "./components";
import { statusDefinitions, type StatusKey } from "./status";
import { organizationPolicy, permissions, type Role } from "./policy";
import { todayJalali } from "./locale";

export default function ReferencePage() {
  const [date,setDate]=useState(todayJalali()),[time,setTime]=useState("۰۸:۳۰"),[notice,setNotice]=useState("");
  return <div className="ds-reference"><header className="page-header"><div><h1>راهنمای رابط روکو گایز</h1><p>بنیاد مشترک نسخه دوم؛ نمونه‌های تعاملی، نه سامانه نهایی</p></div></header>
    <section className="card"><h2>قواعد سازمان شما</h2><p>تعطیلات هفتگی: شنبه و یکشنبه • تأیید نهایی مرخصی: فقط مدیر</p><p>مدیر سیستم: امکان تأیید درخواست و ویرایش کارکرد • منطقه زمانی: <bdi>{organizationPolicy.workplaceTimeZone}</bdi></p><p>ثبت آفلاین تا بررسی معتبر، در انتظار می‌ماند. مجوزهای این نسخه نمایشی فقط در رابط اعمال می‌شوند؛ امنیت واقعی نیازمند سرور است.</p></section>
    <section className="card"><h2>رنگ‌های معنایی</h2><div className="ds-swatches">{["page","card","sunken"].map(t=><div key={t} style={{background:`var(--surface-${t})`}}><bdi>surface-{t}</bdi></div>)}<div className="ds-brand-swatch">رنگ اصلی</div></div></section>
    <section className="card"><h2>دکمه‌ها و پنجره</h2><div className="ds-actions">{(["primary","secondary","ghost","danger"] as const).map((variant,i)=><Button key={variant} variant={variant} onClick={()=>setNotice("نمونه دکمه اجرا شد")}>{["ثبت","بازگشت","جزئیات","حذف"][i]}</Button>)}<Button disabled>غیرفعال</Button><Button busy>در حال بررسی</Button><Modal title="بررسی تغییر" description="با Escape، کلیک بیرون یا دکمه بستن بسته می‌شود و تمرکز به دکمه آغاز برمی‌گردد." trigger={<Button variant="secondary">نمونه پنجره</Button>}><Field label="توضیح" autoFocus/><p>این پنجره هیچ داده‌ای را تغییر نمی‌دهد.</p></Modal></div><p role="status">{notice}</p></section>
    <section className="card"><h2>وضعیت‌ها</h2><div className="ds-actions">{(Object.keys(statusDefinitions) as StatusKey[]).map(status=><Badge key={status} status={status}/>)}</div></section>
    <section className="card"><h2>ورودی و تاریخ</h2><div className="ds-form-grid"><Field label="نام" hint="نام کامل خود را وارد کنید."/><Field label="نمونه خطا" error="این فیلد نیازمند اصلاح است." defaultValue=""/><Field label="فیلد غیرفعال" disabled value="غیرفعال"/><JalaliField label="تاریخ جلالی" value={date} onChange={setDate}/><TimeField label="ساعت" value={time} onChange={setTime}/><UploadField/></div></section>
    <section className="card"><h2>مجوزهای مشترک</h2><div className="ds-table-scroll"><table><caption>دامنه مجوزها در نسخه نمایشی</caption><thead><tr><th scope="col">نقش</th><th scope="col">تأیید درخواست</th><th scope="col">ویرایش کارکرد</th><th scope="col">مدیریت کاربران</th></tr></thead><tbody>{(Object.keys(permissions) as Role[]).map((role,i)=><tr key={role}><th scope="row">{["کارمند","مدیر","منابع انسانی","مدیر سیستم"][i]}</th>{(["approveRequests","editAttendance","users"] as const).map(c=><td key={c}>{permissions[role][c]===false?"ندارد":permissions[role][c]==="team"?"تیم":"سازمان"}</td>)}</tr>)}</tbody></table></div></section>
  </div>;
}
