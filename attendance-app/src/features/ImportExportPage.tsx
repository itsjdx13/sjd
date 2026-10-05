import { useMemo, useRef, useState } from "react";
import { CheckCircledIcon, CrossCircledIcon, DownloadIcon, FileTextIcon, UploadIcon } from "@radix-ui/react-icons";
import { JalaliField } from "../design/components";
import { jalaliToISO, todayJalali, isoToJalali, normalizeDigits } from "../design/locale";
import { addDays, isWeekend, recordFor } from "./attendance";
import { autoMap, download, importFields, parseCsv, toCsv, validateImport, type ImportField, type ImportRow } from "./csv";
import { safeLedger, workplaceDateISO } from "./ledger";
import { departments, employeeStore, exportStore, requestStore, type Employee, type ExportRecord } from "./store";
import { Banner, Segmented, dateTimeLabel, fa, weekdayOf } from "./ui";
import { decodeWorkbook, encodeWorkbook, readWorkbook, writeWorkbook, XLSX_MIME, type WorkbookSheet } from "./xlsx";

const MAX_BYTES = 10 * 1024 * 1024, MAX_DAYS = 92;
const steps = ["بارگذاری", "تطبیق ستون‌ها", "اعتبارسنجی", "ثبت", "نتیجه"] as const;
type Parsed = { name: string; headers: string[]; rows: string[][] };
const statusText = { complete: "کامل", late: "تأخیر", overtime: "اضافه‌کار", missingPunch: "ثبت ناقص", correction: "نیازمند اصلاح", off: "تعطیل هفتگی", future: "آینده", noPunch: "بدون ثبت", open: "در حال کار" } as const;
const saltFor = (code: string) => [...code].reduce((n, c) => n + c.charCodeAt(0), 1);

function ImportPanel() {
  const employees = employeeStore.use();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<Parsed | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sheets, setSheets] = useState<WorkbookSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [map, setMap] = useState<Record<ImportField, number>>({ code: -1, name: -1, department: -1, email: -1, shift: -1 });
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [result, setResult] = useState<{ added: number; skipped: ImportRow[] } | null>(null);
  const [announce, setAnnounce] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => file ? validateImport(file.rows, map, employees) : [], [file, map, employees]);
  const valid = rows.filter(r => r.errors.length === 0), invalid = rows.filter(r => r.errors.length > 0);
  const missingRequired = importFields.filter(f => f.required && map[f.key] < 0);

  const choose = async (f: File | undefined) => {
    if (!f) return; setError("");
    if (/\.xls$/i.test(f.name)) { setError("قالب قدیمی XLS پشتیبانی نمی‌شود؛ پرونده را به XLSX یا CSV UTF-8 تبدیل کنید."); return; }
    if (!/\.(csv|xlsx)$/i.test(f.name)) { setError("فقط پرونده CSV یا XLSX پذیرفته می‌شود."); return; }
    if (f.size > MAX_BYTES) { setError("حجم پرونده بیشتر از ۱۰ مگابایت است."); return; }
    setLoading(true); setAnnounce("در حال خواندن پرونده…");
    try {
      const workbook = /\.xlsx$/i.test(f.name) ? await readWorkbook(await f.arrayBuffer()) : [];
      const parsed = workbook.length ? [workbook[0].headers, ...workbook[0].rows] : parseCsv(await f.text());
      if (parsed.length < 2) { setError("پرونده باید یک ردیف عنوان و دست‌کم یک ردیف داده داشته باشد."); return; }
      if (parsed.length > 5001) { setError("حداکثر ۵۰۰۰ ردیف در هر بارگذاری مجاز است."); return; }
      setSheets(workbook); setSheetIndex(0);
      setFile({ name: f.name, headers: parsed[0], rows: parsed.slice(1) }); setMap(autoMap(parsed[0])); setStep(1);
      setAnnounce(`پرونده ${f.name} با ${fa(parsed.length - 1)} ردیف خوانده شد.`);
    } catch (e) { setError(e instanceof Error ? e.message : "خواندن پرونده ممکن نشد."); }
    finally { setLoading(false); }
  };
  const commit = () => {
    setError("");
    if (!file || missingRequired.length || !valid.length || (invalid.length && !skipInvalid)) return;
    try {
      const latest = employeeStore.refreshPersisted();
      const reviewed = validateImport(file.rows, map, latest);
      if (JSON.stringify(reviewed.map(row => row.errors)) !== JSON.stringify(rows.map(row => row.errors))) {
        setStep(2); setError("فهرست کارکنان تغییر کرده است؛ پیش‌نمایش تازه را بررسی و دوباره تأیید کنید."); return;
      }
      const toAdd: Employee[] = reviewed.filter(row => !row.errors.length).map(r => ({ code: r.values.code, name: r.values.name, department: r.values.department, status: "active", email: r.values.email || undefined, shift: r.values.shift }));
      employeeStore.setPersisted([...latest, ...toAdd]);
      setResult({ added: toAdd.length, skipped: invalid }); setStep(4); setAnnounce(`${fa(toAdd.length)} کارمند ثبت و ذخیره شد.`);
    } catch {
      setError("ذخیره کارکنان ممکن نشد. فضای مرورگر یا دسترسی ذخیره‌سازی را بررسی کنید؛ داده‌های قبلی جایگزین نشده‌اند. اگر داده ذخیره‌شده آسیب دیده باشد، ابتدا آن را بازیابی کنید و سپس دوباره تلاش کنید.");
    }
  };
  const reset = () => { setStep(0); setFile(null); setSheets([]); setResult(null); setError(""); };
  const errorReport = () => download("import-errors.csv", toCsv([["ردیف", "کد", "نام", "خطاها"], ...(result?.skipped ?? invalid).map(r => [r.line, r.values.code, r.values.name, r.errors.join(" | ")])]), "text/csv");

  return <section className="card import-workflow" aria-label="ورود داده">
    <ol className="stepper">{steps.map((s, i) => <li key={s}><button type="button" disabled={i >= step || step === 4} className={step === i ? "active" : step > i ? "done" : ""} aria-current={step === i ? "step" : undefined} onClick={() => setStep(i)}><span aria-hidden="true">{step > i ? <CheckCircledIcon /> : fa(i + 1)}</span>{s}</button></li>)}</ol>
    {error && <p className="field-error" role="alert">{error}</p>}
    {step === 0 && <div className="upload-panel" aria-busy={loading}><UploadIcon /><h2>پرونده کارکنان را بارگذاری کنید</h2><p>پرونده Excel (.xlsx) یا CSV (UTF-8) تا ۱۰ مگابایت و ۵۰۰۰ ردیف. ستون‌های لازم: کد پرسنلی، نام و واحد. فرمول‌ها باید به مقدار ثابت تبدیل شوند.</p>
      <button type="button" className="primary-button compact" disabled={loading} onClick={() => input.current?.click()}>{loading ? "در حال خواندن…" : "انتخاب پرونده"}</button>
      <input ref={input} type="file" hidden disabled={loading} accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e => { void choose(e.target.files?.[0]); e.target.value = ""; }} aria-label="انتخاب پرونده CSV یا Excel" />
      <button type="button" className="link-button" onClick={() => download("employees-template.csv", toCsv([["کد پرسنلی", "نام و نام خانوادگی", "واحد", "ایمیل", "شیفت"], ["RG-1090", "نمونه کارمند", "محصول", "sample@rocoguys.ir", "صبح"]]), "text/csv")}><DownloadIcon /> دریافت نمونه پرونده</button>
      </div>}
    {step === 1 && file && <div className="mapping-panel"><h2>تطبیق ستون‌ها</h2><p className="muted-text">پرونده «<bdi>{file.name}</bdi>» • {fa(file.rows.length)} ردیف</p>
      {sheets.length > 0 && <label>برگه Excel<select value={sheetIndex} onChange={e => { const index = Number(e.target.value); setSheetIndex(index); setFile({ name: file.name, headers: sheets[index].headers, rows: sheets[index].rows }); setMap(autoMap(sheets[index].headers)); setAnnounce(`برگه ${sheets[index].name} انتخاب شد.`); }}>{sheets.map((sheet, i) => <option key={i} value={i}>{sheet.name} • {fa(sheet.rows.length)} ردیف</option>)}</select><small>فقط برگه انتخاب‌شده وارد می‌شود؛ برگه‌های مخفی و خالی نمایش داده نمی‌شوند.</small></label>}
      {importFields.map(f => <div key={f.key} className="map-row"><label htmlFor={`map-${f.key}`}><strong>{f.label}</strong>{f.required && <small> (الزامی)</small>}</label>
        <select id={`map-${f.key}`} value={map[f.key]} onChange={e => setMap(m => ({ ...m, [f.key]: Number(e.target.value) }))}>
          <option value={-1}>{f.required ? "انتخاب ستون…" : "نادیده گرفته شود"}</option>{file.headers.map((h, i) => <option key={i} value={i}>{h || `ستون ${fa(i + 1)}`}</option>)}</select></div>)}
      {missingRequired.length > 0 && <p className="field-error" role="alert">ستون‌های الزامی را تطبیق دهید: {missingRequired.map(f => f.label).join("، ")}</p>}
      <div className="form-actions"><button type="button" className="secondary-button" onClick={reset}>پرونده دیگر</button><button type="button" className="primary-button" disabled={missingRequired.length > 0} onClick={() => setStep(2)}>اعتبارسنجی داده‌ها</button></div></div>}
    {step === 2 && file && <div className="validation-panel"><h2>پیش‌نمایش و اعتبارسنجی</h2>
      <div className="validation-summary"><span className="good"><CheckCircledIcon /><strong>{fa(valid.length)} ردیف معتبر</strong></span><span className={invalid.length ? "bad" : "good"}><CrossCircledIcon /><strong>{fa(invalid.length)} ردیف دارای خطا</strong></span></div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="پیش‌نمایش ردیف‌ها"><table className="preview-table"><thead><tr><th>ردیف</th><th>کد</th><th>نام</th><th>واحد</th><th>وضعیت</th></tr></thead>
        <tbody>{rows.slice(0, 50).map(r => <tr key={r.line} className={r.errors.length ? "bad" : ""}><td>{fa(r.line)}</td><td dir="ltr">{r.values.code}</td><td>{r.values.name}</td><td>{r.values.department}</td><td>{r.errors.length ? r.errors.join("؛ ") : "معتبر"}</td></tr>)}</tbody></table></div>
      {rows.length > 50 && <p className="muted-text">فقط ۵۰ ردیف اول نمایش داده می‌شود؛ همه ردیف‌ها اعتبارسنجی شده‌اند.</p>}
      {invalid.length > 0 && <label className="check-row"><input type="checkbox" checked={skipInvalid} onChange={e => setSkipInvalid(e.target.checked)} /> ردیف‌های دارای خطا نادیده گرفته شوند</label>}
      <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setStep(1)}>بازگشت به تطبیق</button>
        <button type="button" className="primary-button" disabled={valid.length === 0 || (invalid.length > 0 && !skipInvalid)} onClick={() => setStep(3)}>ادامه با {fa(valid.length)} ردیف</button></div></div>}
    {step === 3 && <div className="validation-panel"><h2>تأیید نهایی ثبت</h2><p>{fa(valid.length)} کارمند جدید به فهرست افزوده می‌شود{invalid.length ? ` و ${fa(invalid.length)} ردیف نادیده گرفته می‌شود` : ""}. این اقدام فقط در این مرورگر ذخیره می‌شود.</p>
      <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setStep(2)}>بازگشت</button><button type="button" className="primary-button" onClick={commit}>ثبت {fa(valid.length)} کارمند</button></div></div>}
    {step === 4 && result && <div className="result-panel" role="status"><CheckCircledIcon /><h2>ورود اطلاعات کامل شد</h2><p>{fa(result.added)} کارمند ثبت شد{result.skipped.length ? ` و ${fa(result.skipped.length)} ردیف برای اصلاح کنار گذاشته شد` : ""}.</p>
      <div className="form-actions">{result.skipped.length > 0 && <button type="button" className="secondary-button" onClick={errorReport}><DownloadIcon /> گزارش خطاها</button>}<button type="button" className="primary-button" onClick={reset}>ورود پرونده دیگر</button></div></div>}
    <div className="sr-live" aria-live="polite">{announce}</div>
  </section>;
}

function ExportPanel() {
  const employees = employeeStore.use();
  const history = exportStore.use();
  const requests = requestStore.use();
  const today = workplaceDateISO();
  const [from, setFrom] = useState(isoToJalali(addDays(today, -6))), [to, setTo] = useState(todayJalali());
  const [dept, setDept] = useState<string[]>([]);
  const [scope,setScope]=useState<"all"|"selected">("all");
  const [employeeQuery,setEmployeeQuery]=useState("");
  const [selectedCodes,setSelectedCodes]=useState<string[]>([]);
  const [format, setFormat] = useState<"csv" | "json" | "xlsx">("csv");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState(""); const [announce, setAnnounce] = useState("");
  const [warning, setWarning] = useState("");
  const fromISO = jalaliToISO(from), toISO = jalaliToISO(to);
  const rangeError = !fromISO || !toISO ? "بازه تاریخ را معتبر وارد کنید." : fromISO > toISO ? "تاریخ پایان باید بعد از شروع باشد." : (Date.parse(toISO) - Date.parse(fromISO)) / 86400000 + 1 > MAX_DAYS ? `بازه حداکثر ${fa(MAX_DAYS)} روز می‌تواند باشد.` : "";
  const eligible = employees.filter(e => e.status !== "inactive" && (dept.length === 0 || dept.includes(e.department)));
  const search=normalizeDigits(employeeQuery.trim()).toLocaleLowerCase();
  const visible=eligible.filter(e=>[e.name,e.code,e.department].some(value=>normalizeDigits(value).toLocaleLowerCase().includes(search)));
  const chosen=scope==="all"?eligible:eligible.filter(e=>selectedCodes.includes(e.code));
  const toggleEmployee=(code:string)=>setSelectedCodes(current=>current.includes(code)?current.filter(value=>value!==code):[...current,code]);
  const toggleDept = (d: string) => setDept(c => c.includes(d) ? c.filter(x => x !== d) : [...c, d]);

  const run = async () => {
    setError(""); setWarning("");
    if (rangeError) { setError(rangeError); return; }
    let exportPeople: Employee[];
    try {
      exportPeople = employeeStore.refreshPersisted().filter(employee => employee.status !== "inactive" && (!dept.length || dept.includes(employee.department)) && (scope === "all" || selectedCodes.includes(employee.code)));
    } catch { setError("اطلاعات ذخیره‌شده کارکنان قابل خواندن نیست؛ خروجی ساخته نشد و داده‌های قبلی حفظ شدند."); return; }
    if (!exportPeople.length) { setError("هیچ کارمندی با این فیلتر وجود ندارد."); return; }
    const ledger = safeLedger(); const rows: Array<Array<string | number>> = [];
    const dates: string[] = []; for (let d = fromISO!; d <= toISO!; d = addDays(d, 1)) dates.push(d);
    setProgress(0);
    try {
    for (let i = 0; i < exportPeople.length; i++) {
      const e = exportPeople[i]; const salt = e.code === "RG-1042" ? 0 : saltFor(e.code);
      for (const d of dates) {
        if (isWeekend(d)) continue; const r = recordFor(d, ledger, requests, salt);
        rows.push([e.code, e.name, e.department, isoToJalali(d), weekdayOf(d), r.in ?? "", r.out ?? "", (r.workedMin / 60).toFixed(2), r.lateMin, r.overtimeMin, statusText[r.state]]);
      }
      setProgress(Math.round((i + 1) / exportPeople.length * 100));
      await new Promise(res => setTimeout(res, 0));
    }
    const header = ["کد پرسنلی", "نام", "واحد", "تاریخ", "روز", "ورود", "خروج", "کارکرد (ساعت)", "تأخیر (دقیقه)", "اضافه‌کار (دقیقه)", "وضعیت"];
    const bytes = format === "xlsx" ? await writeWorkbook(header, rows) : null;
    const content = bytes ? encodeWorkbook(bytes) : format === "csv" ? toCsv([header, ...rows]) : JSON.stringify(rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i]]))), null, 1);
    const stamp = `${isoToJalali(fromISO!).replace(/[/]/g, "-")}_${isoToJalali(toISO!).replace(/[/]/g, "-")}`;
    const record: ExportRecord = { id: crypto.randomUUID(), name: `attendance_${stamp}.${format}`, createdAt: new Date().toISOString(), rows: rows.length, format, content, ...(bytes ? { encoding: "base64" as const } : {}), filters:{employeeCodes:exportPeople.map(e=>e.code),departments:[...dept],from:fromISO!,to:toISO!} };
    let saved = true;
    try { exportStore.setPersisted([record, ...exportStore.getPersisted()].slice(0, 8)); }
    catch { saved = false; setWarning("فایل برای دانلود آماده است، اما در تاریخچه ذخیره نشد. فضای مرورگر، مجوز ذخیره‌سازی یا سلامت تاریخچه را بررسی کنید؛ تاریخچه قبلی حذف نشده است. فایل دانلودشده را نگه دارید."); }
    download(record.name, bytes ?? content, bytes ? XLSX_MIME : format === "csv" ? "text/csv" : "application/json");
    setAnnounce(`خروجی با ${fa(rows.length)} ردیف آماده و دانلود شد.${saved ? "" : " ذخیره در تاریخچه انجام نشد."}`);
    } catch { setError("ساخت خروجی ممکن نشد؛ دوباره تلاش کنید."); }
    finally { setProgress(null); }
  };

  return <section className="card export-panel" aria-label="دریافت خروجی"><DownloadIcon /><h2>دریافت خروجی حضور</h2>
    <div className="field-grid"><JalaliField label="از تاریخ" value={from} onChange={setFrom} /><JalaliField label="تا تاریخ" value={to} onChange={setTo} /></div>
    {rangeError && <p className="field-error" role="alert">{rangeError}</p>}
    <fieldset className="check-group"><legend>واحدها <small>(بدون انتخاب = همه)</small></legend>{departments.map(d => <label key={d} className="check-row"><input type="checkbox" checked={dept.includes(d)} onChange={() => toggleDept(d)} /> {d}</label>)}</fieldset>
    <fieldset className="export-people" disabled={progress!==null}><legend>کارکنان خروجی</legend>
      <Segmented label="دامنه کارکنان خروجی" value={scope} onChange={setScope} options={[["all","همه کارکنان فیلترشده"],["selected","کارکنان انتخاب‌شده"]] as const}/>
      {scope==="selected"&&<div className="employee-picker">
        <label htmlFor="export-employee-search">جستجوی نام یا کد پرسنلی</label><input id="export-employee-search" value={employeeQuery} onChange={e=>setEmployeeQuery(e.target.value)} placeholder="نام، کد یا واحد"/>
        <div className="ds-actions"><button type="button" className="secondary-button compact" disabled={!visible.length} onClick={()=>setSelectedCodes(current=>[...new Set([...current,...visible.map(e=>e.code)])])}>انتخاب نتایج جستجو</button><button type="button" className="link-button" disabled={!selectedCodes.length} onClick={()=>setSelectedCodes([])}>پاک کردن انتخاب‌ها</button></div>
        <p className="muted-text">فقط کارکنان فعالِ واحدهای انتخاب‌شده در خروجی قرار می‌گیرند؛ جستجو فقط فهرست انتخاب را محدود می‌کند.</p>
        <div className="employee-picker-list">{visible.length?visible.map(employee=><label key={employee.code} className="check-row"><input type="checkbox" checked={selectedCodes.includes(employee.code)} onChange={()=>toggleEmployee(employee.code)}/><span>{employee.name} <bdi>{employee.code}</bdi><small>{employee.department}</small></span></label>):<p role="status">کارمندی با این جستجو و فیلتر پیدا نشد.</p>}</div>
        {selectedCodes.some(code=>!eligible.some(e=>e.code===code))&&<p className="muted-text">برخی انتخاب‌ها خارج از فیلتر فعلی هستند و در این خروجی نمی‌آیند.</p>}
      </div>}
    </fieldset>
    <label>قالب فایل<select disabled={progress !== null} value={format} onChange={e => setFormat(e.target.value as "csv" | "json" | "xlsx")}><option value="csv">CSV (سازگار با Excel)</option><option value="xlsx">Excel (.xlsx)</option><option value="json">JSON</option></select></label>
    <p className="muted-text" role="status">{fa(chosen.length)} کارمند فعال در خروجی قرار می‌گیرد.</p>
    {progress !== null && <div className="progress-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="پیشرفت ساخت خروجی"><span style={{ width: `${progress}%` }} /><small>{fa(progress)}٪</small></div>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {warning && <Banner tone="warn" role="alert">{warning}</Banner>}
    <button type="button" className="primary-button" onClick={() => void run()} disabled={progress !== null}>{progress !== null ? <><span className="spinner" /> در حال ساخت…</> : <><DownloadIcon /> ساخت و دانلود فایل</>}</button>
    <h3>تاریخچه خروجی‌ها</h3>
    {history.length === 0 ? <p className="muted-text">هنوز خروجی‌ای ساخته نشده است.</p> : history.map(h => <div className="download-history" key={h.id}><FileTextIcon /><span><strong dir="ltr">{h.name}</strong><small>{dateTimeLabel(h.createdAt)} • {fa(h.rows)} ردیف{h.filters?` • ${fa(h.filters.employeeCodes.length)} کارمند`:""}</small></span>
      <button type="button" aria-label={`دانلود دوباره ${h.name}`} onClick={() => { try { download(h.name, h.encoding === "base64" ? decodeWorkbook(h.content) : h.content, h.format === "xlsx" ? XLSX_MIME : h.format === "csv" ? "text/csv" : "application/json"); setAnnounce("پرونده دوباره دانلود شد."); } catch { setError("پرونده ذخیره‌شده قابل خواندن نیست؛ خروجی تازه بسازید."); } }}><DownloadIcon /></button></div>)}
    <div className="sr-live" aria-live="polite">{announce}</div>
  </section>;
}

export default function ImportExportPage() {
  const [tab, setTab] = useState<"import" | "export">("import");
  return <>
    <header className="page-header"><div><h1 tabIndex={-1}>ورود و خروج داده</h1><p>انتقال کنترل‌شده اطلاعات با گزارش کامل</p></div></header>
    <Segmented label="نوع عملیات" className="mobile-only-tabs" value={tab} onChange={setTab} options={[["import", "ورود داده"], ["export", "خروجی"]] as const} />
    <div className={`import-export-layout show-${tab}`}><ImportPanel /><ExportPanel /></div>
    <Banner tone="neutral">داده‌ها فقط در این مرورگر ذخیره می‌شوند؛ اتصال به پایگاه داده سازمان هنوز وجود ندارد.</Banner>
  </>;
}
