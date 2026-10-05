import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, GearIcon, MagnifyingGlassIcon, PlusIcon, UploadIcon } from "@radix-ui/react-icons";
import { download, toCsv, validShifts } from "./csv";
import { PersistenceFailure, persistenceMessage } from "./persistence";
import { addEmployee, departments, employeeStatusLabel, employeeStore, patchEmployees, requestStore, updateEmployee, type Employee } from "./store";
import { EmptyState, Sheet, Tabs, panelProps, fa, useMedia } from "./ui";

const PAGE_SIZE = 5;
const statusBadge = (s: Employee["status"]) => s === "active" ? <span className="ds-badge ds-tone-success">{employeeStatusLabel[s]}</span> : s === "leave" ? <span className="ds-badge ds-tone-warning">{employeeStatusLabel[s]}</span> : <span className="ds-badge ds-tone-neutral">{employeeStatusLabel[s]}</span>;
const exportRows = (list: Employee[]) => toCsv([["کد پرسنلی", "نام", "واحد", "وضعیت", "ایمیل", "شیفت"], ...list.map(e => [e.code, e.name, e.department, employeeStatusLabel[e.status], e.email ?? "", e.shift])]);

function EmployeeForm({ initial, onSave, onCancel, existing }: { initial?: Employee; onSave: (e: Employee, baseline?: Employee) => void; onCancel: () => void; existing: Employee[] }) {
  const nextCode = useMemo(() => `RG-${Math.max(1000, ...existing.map(e => Number(e.code.replace(/\D/g, "")) || 0)) + 1}`, [existing]);
  const [v, setV] = useState<Employee>(initial ?? { code: nextCode, name: "", department: departments[0], status: "active", email: "", shift: "صبح" });
  const [touched, setTouched] = useState(false), [saveError, setSaveError] = useState(""), [saving, setSaving] = useState(false);
  const baseline = useRef(initial); // the saved version this edit started from
  const errors: Record<string, string> = {};
  if (!v.name.trim()) errors.name = "نام را وارد کنید.";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = "ایمیل معتبر نیست.";
  if (!initial && existing.some(e => e.code === v.code)) errors.code = "این کد قبلاً استفاده شده است.";
  const submit = (e: FormEvent) => { e.preventDefault(); setTouched(true); if (Object.keys(errors).length || saving) return; setSaving(true); setSaveError("");
    try { onSave({ ...v, name: v.name.trim(), email: v.email?.trim() || undefined }, baseline.current); }
    catch (error) {
      // Keep the typed values; after a conflict the draft is rebased onto the latest saved record for review.
      if (initial && baseline.current && error instanceof PersistenceFailure && error.kind === "conflict") {
        const latest = employeeStore.get().find(x => x.code === initial.code), old = baseline.current;
        if (latest) { // Keep only the fields this user changed; everything else follows the latest saved record.
          setV(cur => Object.fromEntries((Object.keys(latest) as (keyof Employee)[]).map(k => [k, cur[k] !== old[k] ? cur[k] : latest[k]])) as Employee);
          baseline.current = latest;
        }
      }
      setSaveError(persistenceMessage(error)); setSaving(false);
    } };
  const err = (k: string) => touched ? errors[k] : undefined;
  return <form className="request-form" onSubmit={submit} noValidate>
    <label>نام و نام خانوادگی<input value={v.name} aria-invalid={!!err("name")} onChange={e => setV({ ...v, name: e.target.value })} />{err("name") && <small className="ds-error" role="alert">{err("name")}</small>}</label>
    <div className="field-grid"><label>کد پرسنلی<input value={v.code} dir="ltr" disabled={!!initial} onChange={e => setV({ ...v, code: e.target.value.toUpperCase() })} />{err("code") && <small className="ds-error" role="alert">{err("code")}</small>}</label>
      <label>ایمیل<input type="email" value={v.email ?? ""} dir="ltr" aria-invalid={!!err("email")} onChange={e => setV({ ...v, email: e.target.value })} />{err("email") && <small className="ds-error" role="alert">{err("email")}</small>}</label></div>
    <div className="field-grid"><label>واحد<select value={v.department} onChange={e => setV({ ...v, department: e.target.value })}>{departments.map(d => <option key={d}>{d}</option>)}</select></label>
      <label>شیفت<select value={v.shift} onChange={e => setV({ ...v, shift: e.target.value })}>{validShifts.map(s => <option key={s}>{s}</option>)}</select></label></div>
    <label>وضعیت<select value={v.status} onChange={e => setV({ ...v, status: e.target.value as Employee["status"] })}>{Object.entries(employeeStatusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
    {saveError && <p className="ds-error" role="alert">{saveError}</p>}
    <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>انصراف</button><button className="primary-button" disabled={saving}>{saveError ? "تلاش دوباره برای ذخیره" : initial ? "ذخیره تغییرها" : "افزودن کارمند"}</button></div>
  </form>;
}

export default function AdminPage({ go }: { go: (p: string) => void }) {
  const employees = employeeStore.use();
  const requests = requestStore.use();
  const compact = useMedia("(max-width: 767px)");
  const [tab, setTab] = useState<"people" | "org">("people");
  const [query, setQuery] = useState(""), [dept, setDept] = useState("all"), [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  const [editing, setEditing] = useState(false), [adding, setAdding] = useState(false);
  const [bulkDept, setBulkDept] = useState(departments[0]), [bulkShift, setBulkShift] = useState(validShifts[0]);
  const [announce, setAnnounce] = useState(""), [bulkError, setBulkError] = useState("");
  const storageProblem = employeeStore.useProblem();
  const trigger = useRef<HTMLElement | null>(null);

  const filtered = employees.filter(e => (dept === "all" || e.department === dept) && (status === "all" || e.status === status)
    && (!query.trim() || e.name.includes(query.trim()) || e.code.toLowerCase().includes(query.trim().toLowerCase()) || (e.email ?? "").includes(query.trim())));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  useEffect(() => setPage(1), [query, dept, status]);
  const allOnPage = rows.length > 0 && rows.every(r => selected.includes(r.code));
  const toggle = (code: string) => setSelected(s => s.includes(code) ? s.filter(x => x !== code) : [...s, code]);
  const selectedEmployees = employees.filter(e => selected.includes(e.code));
  const detailEmployee = employees.find(e => e.code === detail) ?? null;
  const patch = (change: Partial<Pick<Employee, "department" | "shift">>, message: string) => {
    try { patchEmployees(selectedEmployees, change); setBulkError(""); setAnnounce(message); }
    catch (error) { setBulkError(persistenceMessage(error)); setAnnounce(""); }
  };
  const pendingApprovals = requests.filter(r => r.status === "pending" && r.employeeCode !== "RG-1042").length;
  const counts = { active: employees.filter(e => e.status === "active").length, leave: employees.filter(e => e.status === "leave").length };
  const shiftCover = validShifts.map(s => ({ s, n: employees.filter(e => e.shift === s && e.status === "active").length }));

  return <>
    <header className="page-header"><div><h1 tabIndex={-1}>مدیریت سازمان</h1><p>کارکنان، ساختار، شیفت‌ها و داده‌ها</p></div>
      <button type="button" className="primary-button compact" onClick={e => { trigger.current = e.currentTarget; setAdding(true); }}><PlusIcon /> افزودن کارمند</button></header>
    {storageProblem && <p className="ds-error" role="alert">{storageProblem}</p>}
    <div className="admin-stats" role="list">
      <div className="card" role="listitem"><strong>{fa(counts.active)}</strong><span>کارمند فعال</span></div>
      <div className="card" role="listitem"><strong>{fa(counts.leave)}</strong><span>در مرخصی</span></div>
      <div className="card" role="listitem"><strong>{fa(departments.length)}</strong><span>واحد سازمانی</span></div>
      <button type="button" className="card stat-link" role="listitem" onClick={() => go("/manager/approvals")}><strong>{fa(pendingApprovals)}</strong><span>درخواست منتظر تأیید</span></button>
    </div>
    <div className="admin-layout">
      <section className="card admin-table-card">
        <Tabs idBase="admin" label="بخش‌های مدیریت" className="segment" value={tab} onChange={setTab} tabs={[["people", "کارکنان"], ["org", "ساختار سازمان"]] as const} />
        <div {...panelProps("admin", tab)} className="tab-panel">
        {tab === "people" ? <>
          <div className="toolbar"><div className="search-field"><MagnifyingGlassIcon aria-hidden="true" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="جستجوی نام، کد یا ایمیل" aria-label="جستجوی کارمند" /></div>
            <select aria-label="فیلتر واحد" value={dept} onChange={e => setDept(e.target.value)}><option value="all">همه واحدها</option>{departments.map(d => <option key={d}>{d}</option>)}</select>
            <select aria-label="فیلتر وضعیت" value={status} onChange={e => setStatus(e.target.value)}><option value="all">همه وضعیت‌ها</option>{Object.entries(employeeStatusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          {compact && <p className="muted-text">در موبایل فقط اقدام‌های سریع در دسترس است؛ برای مدیریت گروهی از رایانه استفاده کنید.</p>}
          {!compact && selected.length > 0 && <div className="bulk-bar" role="region" aria-label="اقدام گروهی"><strong>{fa(selected.length)} نفر انتخاب شده</strong>
            <select aria-label="واحد جدید" value={bulkDept} onChange={e => setBulkDept(e.target.value)}>{departments.map(d => <option key={d}>{d}</option>)}</select><button type="button" onClick={() => { patch({ department: bulkDept }, `واحد ${fa(selected.length)} نفر به ${bulkDept} تغییر کرد.`); }}>تغییر واحد</button>
            <select aria-label="شیفت جدید" value={bulkShift} onChange={e => setBulkShift(e.target.value)}>{validShifts.map(s => <option key={s}>{s}</option>)}</select><button type="button" onClick={() => { patch({ shift: bulkShift }, `شیفت ${fa(selected.length)} نفر به ${bulkShift} تغییر کرد.`); }}>تغییر شیفت</button>
            <button type="button" onClick={() => download("employees-selected.csv", exportRows(selectedEmployees), "text/csv")}><DownloadIcon /> خروجی</button>
            <button type="button" onClick={() => { setSelected([]); setBulkError(""); }}>لغو انتخاب</button>{bulkError && <p className="ds-error" role="alert">{bulkError}</p>}</div>}
          {rows.length === 0 ? <EmptyState title="کارمندی پیدا نشد"><button type="button" className="secondary-button compact" onClick={() => { setQuery(""); setDept("all"); setStatus("all"); }}>پاک‌کردن فیلترها</button></EmptyState> :
            <div className={`data-table ${compact ? "compact-table" : ""}`} role="table" aria-label="فهرست کارکنان" aria-rowcount={filtered.length}>
              <div className="data-row data-head" role="row">{!compact && <span role="columnheader"><input type="checkbox" checked={allOnPage} onChange={() => setSelected(s => allOnPage ? s.filter(c => !rows.some(r => r.code === c)) : [...new Set([...s, ...rows.map(r => r.code)])])} aria-label="انتخاب همه ردیف‌های این صفحه" /></span>}<span role="columnheader">کارمند</span><span role="columnheader">کد</span><span role="columnheader">واحد</span><span role="columnheader">وضعیت</span><span role="columnheader"><span className="sr-only">جزئیات</span></span></div>
              {rows.map(emp => <div className="data-row" role="row" key={emp.code}>{!compact && <span role="cell"><input type="checkbox" checked={selected.includes(emp.code)} onChange={() => toggle(emp.code)} aria-label={`انتخاب ${emp.name}`} /></span>}
                <span role="cell" className="employee-cell"><span className="initials" aria-hidden="true">{emp.name[0]}</span><strong>{emp.name}</strong></span><span role="cell"><bdi dir="ltr">{emp.code}</bdi></span><span role="cell">{emp.department}</span><span role="cell">{statusBadge(emp.status)}</span>
                <span role="cell"><button type="button" className="link-button" onClick={e => { trigger.current = e.currentTarget; setEditing(false); setDetail(emp.code); }} aria-label={`جزئیات ${emp.name}`}>جزئیات</button></span></div>)}
            </div>}
          <div className="pagination"><span>نمایش {fa(filtered.length ? (current - 1) * PAGE_SIZE + 1 : 0)} تا {fa(Math.min(current * PAGE_SIZE, filtered.length))} از {fa(filtered.length)}</span>
            <div><button type="button" aria-label="صفحه قبل" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronRightIcon /></button><strong aria-live="polite">صفحه {fa(current)} از {fa(pages)}</strong><button type="button" aria-label="صفحه بعد" disabled={current === pages} onClick={() => setPage(current + 1)}><ChevronLeftIcon /></button></div></div>
        </> : <div className="org-list"><h2>واحدهای سازمانی</h2><p className="muted-text">مسیر تأیید همه واحدها: مدیر مستقیم (تأیید نهایی). اختیار تأیید به‌جای مدیر فقط برای مدیر سیستم فعال است.</p>
          {departments.map(d => { const members = employees.filter(e => e.department === d); return <div key={d} className="org-row"><span className="soft-icon" aria-hidden="true"><GearIcon /></span><span><strong>{d}</strong><small>{fa(members.length)} نفر • {fa(members.filter(m => m.status === "active").length)} فعال</small></span><button type="button" className="link-button" onClick={() => { setTab("people"); setDept(d); }}>مشاهده کارکنان</button></div>; })}</div>}
        </div>
      </section>
      <aside className="admin-side">
        <section className="card quick-actions"><h2>دسترسی سریع</h2>
          <button type="button" onClick={() => go("/admin/import-export")}><UploadIcon /><span><strong>ورود و خروج داده</strong><small>CSV کارکنان، گزارش حضور و تاریخچه</small></span><ChevronLeftIcon /></button>
          <button type="button" onClick={() => go("/hr")}><CalendarIcon /><span><strong>منابع انسانی و شیفت</strong><small>پرونده‌ها، ورود کارکنان و برنامه هفتگی</small></span><ChevronLeftIcon /></button>
          <button type="button" onClick={() => go("/workplace-qr")}><GearIcon /><span><strong>نمایشگر QR محل کار</strong><small>کد چرخان برای ثبت حضور</small></span><ChevronLeftIcon /></button></section>
        <section className="card shift-planner"><h2>پوشش شیفت فعال</h2>{shiftCover.map(({ s, n }) => <div key={s}><span>{s}</span><div className="progress" aria-hidden="true"><span style={{ width: `${Math.min(100, n / Math.max(1, counts.active) * 100)}%` }} /></div><strong>{fa(n)} نفر</strong></div>)}</section>
      </aside>
    </div>
    <Sheet open={!!detailEmployee} onClose={() => { setDetail(null); setEditing(false); }} title={detailEmployee?.name ?? ""} eyebrow={detailEmployee ? `کد ${detailEmployee.code}` : undefined} triggerRef={trigger} variant="drawer">
      {detailEmployee && (editing ? <EmployeeForm initial={detailEmployee} existing={employees} onCancel={() => setEditing(false)} onSave={(emp, baseline) => { updateEmployee(emp, baseline ?? detailEmployee); setEditing(false); setAnnounce(`پرونده ${emp.name} ذخیره شد.`); }} />
        : <><div className="drawer-status">{statusBadge(detailEmployee.status)}</div><dl className="details-list"><div><dt>واحد</dt><dd>{detailEmployee.department}</dd></div><div><dt>شیفت</dt><dd>{detailEmployee.shift}</dd></div><div><dt>ایمیل</dt><dd dir="ltr">{detailEmployee.email ?? "—"}</dd></div>
          <div><dt>درخواست‌های باز</dt><dd>{fa(requests.filter(r => r.employeeCode === detailEmployee.code && r.status === "pending").length)} مورد</dd></div></dl>
          <button type="button" className="primary-button" onClick={() => setEditing(true)}>ویرایش پرونده</button></>)}
    </Sheet>
    <Sheet open={adding} onClose={() => setAdding(false)} title="افزودن کارمند" eyebrow="کارمند جدید" triggerRef={trigger}>
      {adding && <EmployeeForm existing={employees} onCancel={() => setAdding(false)} onSave={emp => { addEmployee(emp); setAdding(false); setAnnounce(`${emp.name} افزوده شد.`); }} />}
    </Sheet>
    <div className="sr-live" aria-live="polite">{announce}</div>
  </>;
}
