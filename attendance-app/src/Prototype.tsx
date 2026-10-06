import { lazy, Suspense, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  BarChartIcon, BellIcon, CalendarIcon, CheckCircledIcon, ChevronDownIcon, ChevronLeftIcon, ClockIcon,
  EnterIcon, ExclamationTriangleIcon, ExitIcon, FileTextIcon, GearIcon, HomeIcon, IdCardIcon, LockClosedIcon,
  MixIcon, PersonIcon, PlusIcon, ReloadIcon,
} from "@radix-ui/react-icons";
import "./design/tokens.css";
import "./prototype.css";
import "./design/components.css";
import "./features/features.css";
import "./features/pwa";
import WorkCalendar from "./design/WorkCalendar";
import { can, isRole, organizationPolicy, type Role } from "./design/policy";
import { Badge } from "./design/components";
import { Brand, PageHeader } from "./features/common";
import { monthPeriod, recordFor, totals, weekPeriod } from "./features/attendance";
import { eventClock, safeLedger, shift, todayStatus, useLedgerVersion, workplaceDateISO } from "./features/ledger";
import { CURRENT_USER, clearSession, decisionCounts, readSession, requestStore, requestTypeLabels, writeSession, leaveBalance, type SessionState } from "./features/store";
import { useLeaveRevision } from "./features/leave";
import { Sheet, Tabs, panelProps, fa, hhmm, longDate, useOnline } from "./features/ui";
import { requestSummary } from "./features/RequestsPage";
import AttendancePage from "./features/AttendancePage";
import ClockPage from "./features/ClockPage";
import RequestsPage from "./features/RequestsPage";
import ApprovalsPage from "./features/ApprovalsPage";
import HrOperationsPage from "./features/HrPage";
import AdminPage from "./features/AdminPage";
import ImportExportPage from "./features/ImportExportPage";
import WorkplaceQrPage from "./features/WorkplaceQrPage";

const ReferencePage = lazy(() => import("./design/ReferencePage"));
const roleLabels: Record<Role, string> = { employee: "کارمند", manager: "مدیر", hr: "منابع انسانی", admin: "مدیر سیستم" };
const RETURN_KEY = "roco-return-to";
const titles: Record<string, string> = {
  "/design-system": "راهنمای رابط", "/dashboard": "داشبورد", "/clock": "ثبت ورود و خروج", "/attendance": "کارکرد من", "/requests": "درخواست‌ها",
  "/calendar": "تقویم کاری", "/profile": "پروفایل", "/manager/approvals": "صندوق تأییدها", "/hr": "عملیات منابع انسانی", "/admin": "مدیریت سازمان",
  "/admin/import-export": "ورود و خروج داده", "/workplace-qr": "نمایشگر QR محل کار", "/login": "ورود",
};
const routeTitle = (path: string) => titles[path] ?? "صفحه پیدا نشد";

function useRoute() {
  const read = () => ({ path: window.location.pathname === "/" ? "/dashboard" : window.location.pathname.replace(/(.)\/$/, "$1"), search: window.location.search });
  const [loc, setLoc] = useState(read);
  useEffect(() => { const onPop = () => setLoc(read()); window.addEventListener("popstate", onPop); return () => window.removeEventListener("popstate", onPop); }, []);
  const go = (next: string, replace = false) => {
    window.history[replace ? "replaceState" : "pushState"]({}, "", next);
    setLoc(read());
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return { ...loc, go };
}

/* ------------------------------ session screens ------------------------------ */
function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [role, setRole] = useState<Role>("employee");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("sara@rocoguys.ir"), [password, setPassword] = useState("RocoDemo1405");
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<"email" | "password" | null>(null);
  const errorId = useId();
  const emailRef = useRef<HTMLInputElement>(null), passwordRef = useRef<HTMLInputElement>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("ایمیل سازمانی را معتبر وارد کنید."); setInvalidField("email"); emailRef.current?.focus(); return; }
    if (password.length < 8) { setError("رمز عبور باید دست‌کم ۸ نویسه باشد."); setInvalidField("password"); passwordRef.current?.focus(); return; }
    setError(""); setInvalidField(null); setBusy(true); window.setTimeout(() => onLogin(role), 650);
  };
  return <main className="login-page">
    <section className="login-brand-panel" aria-label="معرفی روکو گایز"><Brand /><div><span className="eyebrow">فضای کار بهتر، هر روز</span><h1>همه‌چیز برای یک روز کاری روان</h1><p>حضور، درخواست‌ها، برنامه‌ریزی و تأییدها در یک تجربه ساده و فارسی.</p></div><div className="login-stat"><CheckCircledIcon /><span><strong>نسخه نمایشی شخصی</strong><small>اطلاعات این نمونه در همین مرورگر ذخیره می‌شود.</small></span></div></section>
    <section className="login-card-wrap"><form className="login-card" onSubmit={submit} noValidate><Brand /><div><span className="eyebrow">خوش آمدید</span><h2>ورود به روکو گایز</h2><p>برای دیدن نسخه نمایشی، نقش خود را انتخاب کنید.</p></div>
      <label>ایمیل سازمانی<input ref={emailRef} type="email" value={email} aria-invalid={invalidField === "email"} aria-describedby={invalidField === "email" ? errorId : undefined} onChange={e => { setEmail(e.target.value); if (invalidField === "email") { setError(""); setInvalidField(null); } }} required dir="ltr" autoComplete="username" /></label>
      <label>رمز عبور<input ref={passwordRef} type="password" value={password} aria-invalid={invalidField === "password"} aria-describedby={invalidField === "password" ? errorId : undefined} onChange={e => { setPassword(e.target.value); if (invalidField === "password") { setError(""); setInvalidField(null); } }} required dir="ltr" autoComplete="current-password" /></label>
      <label>نقش نمایشی<select value={role} onChange={e => setRole(e.target.value as Role)}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy}>{busy ? <><span className="spinner" /> در حال ورود…</> : <><EnterIcon /> ورود به سامانه</>}</button>
      <p className="muted-text small">این نسخه سرور احراز هویت ندارد؛ نشست فقط روی همین مرورگر و برای ۸ ساعت معتبر است.</p></form></section>
  </main>;
}
function SessionLoading() {
  return <main className="session-screen" role="status" aria-live="polite"><Brand /><span className="spinner dark large" aria-hidden="true" /><h1>در حال بررسی نشست…</h1><p>لطفاً چند لحظه صبر کنید.</p></main>;
}
function SessionExpired({ onSignIn }: { onSignIn: () => void }) {
  return <main className="session-screen"><Brand /><span className="soft-icon warning" aria-hidden="true"><ClockIcon /></span><h1>نشست شما منقضی شده است</h1><p>برای امنیت حساب، پس از چند ساعت باید دوباره وارد شوید. ثبت‌های ذخیره‌شده روی این دستگاه از بین نرفته‌اند.</p>
    <button type="button" className="primary-button" onClick={onSignIn}><EnterIcon /> ورود دوباره</button></main>;
}
function Unauthorized({ go }: { go: (p: string) => void }) {
  return <section className="card unauthorized"><LockClosedIcon /><h1 tabIndex={-1}>دسترسی محدود است</h1><p>نقش فعلی شما اجازه مشاهده این بخش را ندارد.</p><button type="button" className="primary-button compact" onClick={() => go("/dashboard")}>بازگشت به داشبورد</button></section>;
}
function NotFound({ go }: { go: (p: string) => void }) {
  return <section className="card unauthorized"><ExclamationTriangleIcon /><h1 tabIndex={-1}>صفحه پیدا نشد</h1><p>نشانی واردشده وجود ندارد یا جابه‌جا شده است.</p><button type="button" className="primary-button compact" onClick={() => go("/dashboard")}>بازگشت به داشبورد</button></section>;
}

/* ---------------------------------- shell ---------------------------------- */
type NavDef = { path: string; label: string; short?: string; Icon: typeof HomeIcon; badge?: number };
function NavItem({ item, active, go, compact = false }: { item: NavDef; active: boolean; go: (path: string) => void; compact?: boolean }) {
  return <button type="button" className={`nav-item ${active ? "active" : ""}`} onClick={() => go(item.path)} aria-current={active ? "page" : undefined}>
    <span className="nav-icon"><item.Icon aria-hidden="true" />{!!item.badge && <b className="nav-badge" aria-hidden="true">{fa(item.badge)}</b>}</span><span>{compact && item.short ? item.short : item.label}</span>{!!item.badge && <span className="sr-only">، {fa(item.badge)} مورد جدید</span>}</button>;
}
function Notifications({ open, onClose, go, trigger }: { open: boolean; onClose: () => void; go: (p: string) => void; trigger: React.RefObject<HTMLElement | null> }) {
  const requests = requestStore.use(); const ledger = safeLedger();
  const items: Array<{ key: string; title: string; meta: string; path: string }> = [];
  requests.filter(r => r.employeeCode === CURRENT_USER.code && r.status === "returned").forEach(r => items.push({ key: r.id, title: `${requestTypeLabels[r.type]} نیازمند ویرایش است`, meta: requestSummary(r), path: "/requests" }));
  requests.filter(r => r.employeeCode === CURRENT_USER.code && (r.status === "approved" || r.status === "rejected")).slice(0, 2).forEach(r => items.push({ key: r.id, title: `${requestTypeLabels[r.type]} ${r.status === "approved" ? "تأیید شد" : "رد شد"}`, meta: requestSummary(r), path: "/requests" }));
  const pending = ledger.events.filter(e => e.state === "pending").length;
  if (pending) items.push({ key: "sync", title: `${fa(pending)} ثبت حضور منتظر همگام‌سازی است`, meta: "برای بررسی به صفحه ثبت حضور بروید", path: "/clock" });
  return <Sheet open={open} onClose={onClose} title="اعلان‌ها" eyebrow="مرکز اعلان" triggerRef={trigger} variant="drawer">
    {items.length === 0 ? <p className="muted-text">اعلان تازه‌ای ندارید.</p> : <ul className="notice-list">{items.map(i => <li key={i.key}><button type="button" onClick={() => { onClose(); go(i.path); }}><strong>{i.title}</strong><small>{i.meta}</small><ChevronLeftIcon aria-hidden="true" /></button></li>)}</ul>}</Sheet>;
}
function Shell({ path, go, role, onLogout, children }: { path: string; go: (path: string) => void; role: Role; onLogout: () => void; children: ReactNode }) {
  const requests = requestStore.use(); const { pending } = decisionCounts(requests);
  const [notices, setNotices] = useState(false); const bell = useRef<HTMLButtonElement>(null);
  const approvals = can(role, "approveRequests");
  const sidebar: NavDef[] = [
    { path: "/dashboard", label: "خانه", Icon: HomeIcon }, { path: "/clock", label: "ثبت حضور", short: "حضور", Icon: ClockIcon }, { path: "/attendance", label: "کارکرد", Icon: BarChartIcon },
    { path: "/requests", label: "درخواست‌ها", short: "درخواست", Icon: FileTextIcon }, { path: "/calendar", label: "تقویم", Icon: CalendarIcon }, { path: "/profile", label: "پروفایل", Icon: PersonIcon },
  ];
  if (approvals) sidebar.push({ path: "/manager/approvals", label: "تأییدها", Icon: BellIcon, badge: pending });
  if (can(role, "schedules")) sidebar.push({ path: "/hr", label: "منابع انسانی", Icon: IdCardIcon });
  if (can(role, "users")) sidebar.push({ path: "/admin", label: "مدیریت", Icon: GearIcon }, { path: "/design-system", label: "راهنمای رابط", Icon: MixIcon });
  const bottom = sidebar.filter(i => ["/dashboard", "/clock", "/requests", "/manager/approvals", "/calendar", "/profile"].includes(i.path));
  const isActive = (route: string) => path === route || (route === "/admin" && path.startsWith("/admin"));
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">پرش به محتوای اصلی</a>
    <aside className="side-nav"><Brand /><nav aria-label="ناوبری اصلی">{sidebar.map(item => <NavItem key={item.path} item={item} active={isActive(item.path)} go={go} />)}</nav>
      <div className="side-profile"><img src="/assets/sara-avatar.png" alt="" /><span><strong>{CURRENT_USER.name}</strong><small>{roleLabels[role]}</small></span><button type="button" onClick={onLogout} aria-label="خروج از حساب"><ExitIcon /></button></div></aside>
    <div className="app-body"><header className="desktop-header"><div><p className="header-title">{routeTitle(path)}</p><p>{new Intl.DateTimeFormat("fa-IR", { timeZone: organizationPolicy.workplaceTimeZone, dateStyle: "full" }).format(new Date())}</p></div>
      <div className="header-tools"><button ref={bell} type="button" className="icon-button" aria-label="اعلان‌ها" onClick={() => setNotices(true)}><BellIcon /></button>
        <button type="button" className="profile-button" onClick={() => go("/profile")}><img src="/assets/sara-avatar.png" alt="" /><span><strong>{CURRENT_USER.name}</strong><small>{roleLabels[role]}</small></span><ChevronDownIcon aria-hidden="true" /></button></div></header>
      <main id="main-content" className="main-content" tabIndex={-1}>{children}</main></div>
    <nav className="bottom-nav" aria-label="ناوبری پایین" style={{ "--cols": bottom.length } as React.CSSProperties}>{bottom.map(item => <NavItem key={item.path} item={item} active={isActive(item.path)} go={go} compact />)}</nav>
    <Notifications open={notices} onClose={() => setNotices(false)} go={go} trigger={bell} />
  </div>;
}

/* -------------------------------- dashboard -------------------------------- */
function Dashboard({ role, go }: { role: Role; go: (p: string) => void }) {
  useLedgerVersion();
  const online = useOnline();
  const ledger = safeLedger(); const requests = requestStore.use();
  const today = todayStatus(ledger);
  const todayISO = workplaceDateISO();
  const todayRecord = recordFor(todayISO, ledger, requests);
  const week = weekPeriod(0); const weekRecords = week.dates.map(d => recordFor(d, ledger, requests)); const t = totals(weekRecords);
  const exceptions = monthPeriod(0).dates.concat(monthPeriod(-1).dates).filter(d => d < todayISO).map(d => recordFor(d, ledger, requests)).filter(r => ["late", "missingPunch", "correction"].includes(r.state)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const mine = requests.filter(r => r.employeeCode === CURRENT_USER.code && (r.status === "pending" || r.status === "returned"));
  const queue = requests.filter(r => r.status === "pending" && r.employeeCode !== CURRENT_USER.code);
  useLeaveRevision();
  const bal = leaveBalance(requests);
  const weekend = organizationPolicy.weekendDays.includes(new Date(todayISO + "T12:00:00Z").getUTCDay());
  const action = today.last ? (today.last.action === "in" ? "out" : "in") : "in";
  const heading = today.working ? "در حال کار" : today.last ? "کار امروز ثبت شد" : weekend ? "امروز تعطیل هفتگی است" : "آماده ثبت ورود";
  const detail = today.working && today.first ? `ورود شما ساعت ${eventClock(today.first.time)} ثبت شده است.` : today.last ? `خروج شما ساعت ${eventClock(today.last.time)} ثبت شده است.` : weekend ? "ثبت حضور برای امروز لازم نیست." : `شیفت امروز ${fa(shift.start)} شروع می‌شود.`;
  const expectedWeek = 40 * 60;
  const tone = today.working ? "good" : "neutral";
  return <>
    <header className="page-header dashboard-header"><div><h1 tabIndex={-1}>صبح بخیر، سارا</h1><p>{longDate(todayISO)}</p></div></header>
    {!online && <div className="state-banner warn" role="status"><ExclamationTriangleIcon /><p>اتصال قطع است؛ ثبت آفلاین در صف می‌ماند و بعداً بررسی می‌شود.</p></div>}
    <div className="dashboard-grid">
      <section className="card clock-card" aria-labelledby="clock-status"><div className="card-top"><div><span className="overline">وضعیت امروز</span><h2 id="clock-status">{heading}</h2><p>{detail}{today.pending ? " (منتظر همگام‌سازی)" : ""}</p></div>
        <span className={`ds-badge ds-tone-${tone === "good" ? "success" : "neutral"}`}>{today.working ? "فعال" : today.last ? "تمام‌شده" : "ثبت نشده"}</span></div>
        <div className="work-rhythm" aria-label="برنامه امروز"><div className={`rhythm-step ${today.first ? "active" : ""}`}><span><EnterIcon /></span><strong>شروع</strong><small>{today.first ? eventClock(today.first.time) : fa(shift.start)}</small></div><i /><div className="rhythm-step"><span><ClockIcon /></span><strong>استراحت</strong><small>{fa("12:30")}</small></div><i /><div className={`rhythm-step ${today.last?.action === "out" ? "active" : ""}`}><span><ExitIcon /></span><strong>پایان</strong><small>{today.last?.action === "out" ? eventClock(today.last.time) : fa(shift.end)}</small></div></div>
        <button type="button" className="primary-button large" onClick={() => go("/clock")}>{action === "out" ? <ExitIcon /> : <EnterIcon />}{action === "out" ? "ثبت خروج" : "ثبت ورود"}</button></section>
      <section className="card shift-card"><div className="section-title"><span className="soft-icon"><ClockIcon /></span><div><h2>برنامه امروز</h2><p>{shift.place} • {shift.name}</p></div></div>
        {weekend ? <p className="big-number small">تعطیل هفتگی</p> : <strong className="big-number" dir="ltr">{shift.start} — {shift.end}</strong>}
        <div className="shift-meta"><span>استراحت<strong>{fa(1)} ساعت</strong></span><span>کار برنامه‌ریزی‌شده<strong>{hhmm(shift.endMin - shift.startMin - shift.breakMin)}</strong></span></div></section>
      <section className="card weekly-card"><div className="card-heading"><div><span className="overline">این هفته</span><h2>{hhmm(t.worked)} از {hhmm(expectedWeek)} ساعت</h2></div><button type="button" className="link-button" onClick={() => go("/attendance")}>جزئیات <ChevronLeftIcon /></button></div>
        <div className="progress" role="progressbar" aria-label="پیشرفت ساعت کار هفته" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(t.worked / expectedWeek * 100))}><span style={{ width: `${Math.min(100, t.worked / expectedWeek * 100)}%` }} /></div>
        <div className="metrics"><span><strong>{hhmm(t.worked)}</strong><small>کارکرد</small></span><span><strong>{hhmm(t.overtime)}</strong><small>اضافه‌کار</small></span><span><strong>{hhmm(t.late)}</strong><small>تأخیر</small></span></div></section>
      <section className="card list-card"><div className="card-heading"><h2>استثناهای حضور</h2>{exceptions.length > 0 && <span className="ds-badge ds-tone-warning">{fa(exceptions.length)} مورد</span>}</div>
        {exceptions.length === 0 ? <p className="muted-text">استثنای بازی ندارید.</p> : exceptions.map(r => <button type="button" key={r.date} className="list-row" onClick={() => go("/attendance")}>
          <span className={`soft-icon ${r.state === "late" ? "danger" : "warning"}`}>{r.state === "late" ? <ClockIcon /> : <ExclamationTriangleIcon />}</span><span><strong>{r.state === "late" ? `${fa(r.lateMin)} دقیقه تأخیر` : r.state === "correction" ? "اصلاح حضور نیازمند ویرایش" : "ثبت خروج فراموش‌شده"}</strong><small>{longDate(r.date).replace(/ [۰-۹]{4}$/, "")}</small></span><ChevronLeftIcon aria-hidden="true" /></button>)}</section>
      <section className="card list-card"><div className="card-heading"><h2>درخواست‌های من</h2><button type="button" className="link-button" onClick={() => go("/requests")}>مشاهده همه</button></div>
        {mine.length === 0 ? <p className="muted-text">درخواست بازی ندارید.</p> : mine.slice(0, 3).map(r => <button type="button" key={r.id} className="list-row" onClick={() => go("/requests")}><span className="soft-icon"><FileTextIcon /></span><span><strong>{requestTypeLabels[r.type]}</strong><small>{requestSummary(r)}</small></span><Badge status={r.status} /></button>)}
        <p className="muted-text small">مانده مرخصی پس از رزرو درخواست‌ها: {bal.afterPending === undefined ? "ثبت نشده یا قابل خواندن نیست" : `${fa(bal.afterPending)} روز`}</p>
        {bal.problem && <p className="ds-error" role="alert">{bal.problem}</p>}
        <button type="button" className="secondary-button" onClick={() => go("/requests?new=dailyLeave")}><PlusIcon /> درخواست جدید</button></section>
      {can(role, "approveRequests") && <section className="card approvals-card"><div className="card-heading"><div><span className="overline">ویژه مدیر</span><h2>در انتظار تصمیم شما</h2></div><span className="count-badge" aria-label={`${fa(queue.length)} درخواست`}>{fa(queue.length)}</span></div>
        {queue.length === 0 ? <p>همه درخواست‌ها بررسی شده‌اند.</p> : <ul className="queue-preview">{queue.slice(0, 3).map(r => <li key={r.id}><strong>{r.employee}</strong><small>{requestTypeLabels[r.type]} • {requestSummary(r)}</small></li>)}</ul>}
        <button type="button" className="primary-button" onClick={() => go("/manager/approvals")}><BellIcon /> رفتن به صندوق تأیید</button></section>}
    </div></>;
}

/* --------------------------------- profile --------------------------------- */
function ProfilePage({ role, go, onLogout }: { role: Role; go: (p: string) => void; onLogout: () => void }) {
  type Tab = "personal" | "employment" | "attendance" | "requests" | "documents";
  const [tab, setTab] = useState<Tab>("personal");
  useLedgerVersion();
  const ledger = safeLedger(); const requests = requestStore.use();
  const month = monthPeriod(0); const t = totals(month.dates.map(d => recordFor(d, ledger, requests)));
  const mine = requests.filter(r => r.employeeCode === CURRENT_USER.code);
  useLeaveRevision();
  const bal = leaveBalance(requests);
  const rows: Record<Tab, Array<[string, ReactNode]>> = {
    personal: [["نام و نام خانوادگی", "سارا احمدی"], ["شماره همراه", <bdi dir="ltr" key="p">0912 234 6789</bdi>], ["ایمیل", <bdi dir="ltr" key="e">sara@rocoguys.ir</bdi>], ["کد پرسنلی", <bdi dir="ltr" key="c">{CURRENT_USER.code}</bdi>]],
    employment: [["عنوان شغلی", "کارشناس محصول"], ["واحد", "محصول"], ["مدیر مستقیم", "نیما رضایی"], ["نوع قرارداد", "تمام‌وقت"], ["شیفت", `${shift.name} • ${fa(shift.start)} تا ${fa(shift.end)}`], ["محل کار", shift.place]],
    attendance: [["کارکرد این ماه", `${hhmm(t.worked)} ساعت`], ["اضافه‌کار", `${hhmm(t.overtime)} ساعت`], ["تأخیر", `${hhmm(t.late)} ساعت`], ["مانده مرخصی", bal.afterPending === undefined ? "ثبت نشده یا قابل خواندن نیست" : `${fa(bal.afterPending)} روز`]],
    requests: [],
    documents: [["قرارداد کار", "معتبر تا اسفند ۱۴۰۵"], ["مدرک هویتی", "معتبر"], ["بیمه تکمیلی", "در انتظار بارگذاری"]],
  };
  const tabs = [["personal", "شخصی"], ["employment", "استخدام"], ["attendance", "حضور"], ["requests", "درخواست‌ها"], ["documents", "مدارک"]] as const;
  return <>
    <PageHeader title="پروفایل" subtitle="اطلاعات شخصی و شغلی شما" />
    <section className="profile-layout"><aside className="card profile-summary"><img src="/assets/sara-avatar.png" alt="" /><h2>{CURRENT_USER.name}</h2><p>کارشناس محصول</p><span className="ds-badge ds-tone-success">فعال • {roleLabels[role]}</span>
      <button type="button" className="secondary-button" onClick={onLogout}><ExitIcon /> خروج از حساب</button></aside>
      <section className="card profile-content"><Tabs idBase="profile" label="بخش‌های پروفایل" className="profile-tabs" value={tab} onChange={setTab} tabs={tabs} />
        <div {...panelProps("profile", tab)}>{tab === "requests" ? (mine.length === 0 ? <p className="muted-text">درخواستی ثبت نشده است.</p> : <ul className="notice-list">{mine.slice(0, 6).map(r => <li key={r.id}><button type="button" onClick={() => go("/requests")}><strong>{requestTypeLabels[r.type]}</strong><small>{requestSummary(r)}</small><Badge status={r.status} /></button></li>)}</ul>)
          : <dl className="details-list">{rows[tab].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}</div></section></section>
    {(can(role, "approveRequests") || can(role, "schedules") || can(role, "users")) && <section className="card mobile-admin-links"><h2>بخش‌های مدیریتی</h2><p className="muted-text">اقدام‌های سریع؛ برای مدیریت گسترده از رایانه استفاده کنید.</p>
      {can(role, "approveRequests") && <button type="button" onClick={() => go("/manager/approvals")}><BellIcon /> صندوق تأییدها <ChevronLeftIcon /></button>}
      {can(role, "schedules") && <button type="button" onClick={() => go("/hr")}><IdCardIcon /> منابع انسانی <ChevronLeftIcon /></button>}
      {can(role, "users") && <button type="button" onClick={() => go("/admin")}><GearIcon /> مدیریت سازمان <ChevronLeftIcon /></button>}
      {can(role, "schedules") && <button type="button" onClick={() => go("/workplace-qr")}><ReloadIcon /> نمایشگر QR محل کار <ChevronLeftIcon /></button>}</section>}
  </>;
}

/* ----------------------------------- app ----------------------------------- */
export default function Prototype() {
  const { path, search, go } = useRoute();
  const [sess, setSess] = useState<SessionState>(() => readSession());
  const [booting, setBooting] = useState(sess.status === "active");
  useEffect(() => { document.documentElement.lang = "fa"; document.documentElement.dir = "rtl"; }, []);
  useEffect(() => { document.title = `${routeTitle(path)} — روکو گایز`; }, [path]);
  useEffect(() => { if (!booting) return; const id = window.setTimeout(() => setBooting(false), 300); return () => window.clearTimeout(id); }, [booting]);
  useEffect(() => {
    const check = () => { const next = readSession(); setSess(prev => prev.status === next.status && (prev.status !== "active" || next.status !== "active" || prev.session.expiresAt === next.session.expiresAt) ? prev : next); };
    const msLeft = sess.status === "active" ? sess.session.expiresAt - Date.now() : Infinity;
    const timer = Number.isFinite(msLeft) ? window.setTimeout(check, Math.min(Math.max(msLeft, 0) + 50, 2 ** 31 - 1)) : undefined;
    window.addEventListener("focus", check); window.addEventListener("storage", check); document.addEventListener("visibilitychange", check);
    return () => { window.clearTimeout(timer); window.removeEventListener("focus", check); window.removeEventListener("storage", check); document.removeEventListener("visibilitychange", check); };
  }, [sess]);
  const active = sess.status === "active";
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (!active || booting || path === "/login") return;
    // Move focus to the new page heading on in-app navigation only; never steal focus on first load.
    if (lastPath.current !== null && lastPath.current !== path) document.querySelector<HTMLElement>("#main-content h1")?.focus({ preventScroll: true });
    lastPath.current = path;
  }, [path, active, booting]);
  useEffect(() => {
    if (path === "/login" || sess.status === "active") return;
    sessionStorage.setItem(RETURN_KEY, path + search);
    if (sess.status === "none") go("/login", true);
  }, [sess.status, path, search]);

  const login = (role: Role) => {
    writeSession(role); setSess(readSession());
    const back = sessionStorage.getItem(RETURN_KEY); sessionStorage.removeItem(RETURN_KEY);
    go(back && back.startsWith("/") && !back.startsWith("//") && !back.startsWith("/login") ? back : "/dashboard", true);
  };
  const logout = () => { clearSession(); setSess({ status: "none" }); sessionStorage.removeItem(RETURN_KEY); go("/login", true); };

  if (booting) return <SessionLoading />;
  if (sess.status === "expired" && path !== "/login") return <SessionExpired onSignIn={() => go("/login")} />;
  if (path === "/login" || sess.status !== "active") return <Login onLogin={login} />;

  const role = sess.session.role;
  const actorLabel = `${CURRENT_USER.name} (${roleLabels[role]})`;
  const guard = (allowed: boolean, node: ReactNode) => allowed ? node : <Unauthorized go={go} />;
  let page: ReactNode;
  switch (path) {
    case "/dashboard": page = <Dashboard role={role} go={go} />; break;
    case "/clock": page = <ClockPage />; break;
    case "/attendance": page = <AttendancePage go={go} />; break;
    case "/requests": page = <RequestsPage />; break;
    case "/calendar": page = <WorkCalendar />; break;
    case "/profile": page = <ProfilePage role={role} go={go} onLogout={logout} />; break;
    case "/manager/approvals": page = guard(can(role, "approveRequests"), <ApprovalsPage actorLabel={actorLabel} />); break;
    case "/hr": page = guard(can(role, "schedules"), <HrOperationsPage />); break;
    case "/admin": page = guard(can(role, "users"), <AdminPage go={go} />); break;
    case "/admin/import-export": page = guard(can(role, "import") || can(role, "export"), <ImportExportPage />); break;
    case "/workplace-qr": page = guard(can(role, "schedules"), <WorkplaceQrPage />); break;
    case "/design-system": page = guard(can(role, "users"), <Suspense fallback={<SessionLoading />}><ReferencePage /></Suspense>); break;
    default: page = <NotFound go={go} />;
  }
  return <Shell path={path} go={go} role={role} onLogout={logout}>{page}</Shell>;
}
