import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { CheckCircledIcon, ChevronLeftIcon, ExclamationTriangleIcon, FileTextIcon, PlusIcon } from "@radix-ui/react-icons";
import { Badge, Button, Field, JalaliField, TimeField } from "../design/components";
import { isoToJalali, todayJalali } from "../design/locale";
import { MANAGER_NAME, CURRENT_USER, leaveBalance, requestStore, requestTypeLabels, submitRequest, type HistoryEntry, type RequestStatus, type RequestType, type RoRequest } from "./store";
import { ATTACHMENT_LIMIT, attachmentOk, checkDraft, norm, requiredFields, typeHelp, type Draft } from "./requestForm";
import { safeLedger, workplaceDateISO } from "./ledger";
import { recordFor, addDays } from "./attendance";
import { EmptyState, Sheet, dateTimeLabel, dayMonth, fa, longDate } from "./ui";
import { PersistenceFailure, persistenceMessage } from "./persistence";

export const historyLabel: Record<HistoryEntry["action"], string> = { submitted: "ارسال شد", resubmitted: "ویرایش و دوباره ارسال شد", approved: "تأیید شد", rejected: "رد شد", returned: "برای ویرایش برگشت خورد" };
export const requestTypes = Object.keys(requestTypeLabels) as RequestType[];
export const statusKey = (s: RequestStatus) => s;
export function requestSummary(r: RoRequest) {
  if (r.type === "dailyLeave") return r.startDate === r.endDate ? `${dayMonth(r.startDate)} • یک روز` : `${dayMonth(r.startDate)} تا ${dayMonth(r.endDate)} • ${fa(r.days)} روز`;
  if (r.type === "missingPunch" || r.type === "correction") return `${dayMonth(r.eventRef ?? r.startDate)} • ${r.type === "correction" ? "اصلاح ساعت" : "ثبت فراموش‌شده"}`;
  return `${dayMonth(r.startDate)} • ${fa(r.startTime ?? "")} تا ${fa(r.endTime ?? "")}${r.destination ? ` • ${r.destination}` : ""}`;
}
export function RequestFacts({ r }: { r: RoRequest }) {
  return <dl className="details-list">
    <div><dt>نوع</dt><dd>{requestTypeLabels[r.type]}</dd></div>
    <div><dt>زمان</dt><dd>{requestSummary(r)}</dd></div>
    {r.type === "dailyLeave" && <div><dt>نوع مرخصی</dt><dd>{r.leaveKind === "unpaid" ? "بدون حقوق" : "با حقوق"}</dd></div>}
    {r.type === "dailyLeave" && r.leaveKind !== "unpaid" && <div><dt>اثر بر مانده</dt><dd>{fa(r.days)} روز کسر می‌شود</dd></div>}
    {r.destination && <div><dt>مقصد</dt><dd>{r.destination}</dd></div>}
    <div><dt>توضیحات</dt><dd>{r.reason}</dd></div>
    <div><dt>پیوست‌ها</dt><dd>{r.attachments.length ? r.attachments.map(a => <bdi key={a} className="chip">{a}</bdi>) : "ندارد"}</dd></div>
  </dl>;
}
export function HistoryTimeline({ history }: { history: HistoryEntry[] }) {
  return <ol className="status-timeline" aria-label="تاریخچه وضعیت">{[...history].reverse().map((h, i) => <li key={i}><span aria-hidden="true" /><div>
    <strong>{historyLabel[h.action]}</strong><small>{h.actor} • {dateTimeLabel(h.at)}</small>{h.comment && <p>«{h.comment}»</p>}</div></li>)}</ol>;
}

const emptyDraft = (type: RequestType = "dailyLeave"): Draft => ({ type, startDate: todayJalali(), endDate: todayJalali(), startTime: "", endTime: "", leaveKind: "paid", destination: "", eventRef: "", reason: "", attachments: [] });
const fromRequest = (r: RoRequest): Draft => ({ type: r.type, startDate: isoToJalali(r.startDate), endDate: isoToJalali(r.endDate), startTime: r.startTime ?? "", endTime: r.endTime ?? "", leaveKind: r.leaveKind ?? "paid", destination: r.destination ?? "", eventRef: r.eventRef ?? "", reason: r.reason, attachments: r.attachments });

function RequestForm({ initial, replacing, onDone, onCancel }: { initial: Draft; replacing?: RoRequest; onDone: (id: string) => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [touched, setTouched] = useState(false);
  const [ack, setAck] = useState(false);
  const [fileError, setFileError] = useState("");
  const [saveError, setSaveError] = useState("");
  const submissionKey = useRef(crypto.randomUUID());
  const attemptedDraft = useRef<string | null>(null);
  const all = requestStore.use();
  const bal = leaveBalance(all.filter(r => r.id !== replacing?.id));
  const checked = useMemo(() => checkDraft(d, all, bal.pendingDays, replacing?.id), [d, all, bal.pendingDays, replacing?.id]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(p => ({ ...p, [k]: v }));
  const need = requiredFields[d.type];
  const err = (k: keyof typeof checked.errors) => (touched ? checked.errors[k] : undefined);
  const ledger = safeLedger();
  const eventOptions = useMemo(() => {
    const today = workplaceDateISO();
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, -i));
    if (d.eventRef && !days.includes(d.eventRef)) days.push(d.eventRef);
    return days.map(date => ({ date, rec: recordFor(date, ledger, all) })).filter(({ rec }) => rec.state !== "off" && rec.state !== "future" || rec.date === d.eventRef);
  }, [all, d.eventRef]);
  const liveId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const needsAck = checked.overlapping.length > 0;
  const hasErrors = Object.keys(checked.errors).length > 0;

  const addFiles = (files: FileList | null) => {
    if (!files) return; const accepted: string[] = []; let message = "";
    for (const f of Array.from(files)) { if (!attachmentOk(f)) message = `«${f.name}» پذیرفته نشد؛ فقط PDF، PNG یا JPG تا ۵ مگابایت مجاز است.`; else if (!d.attachments.includes(f.name)) accepted.push(f.name); }
    setFileError(message); if (accepted.length) set("attachments", [...d.attachments, ...accepted]);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault(); setTouched(true);
    if (hasErrors || (needsAck && !ack)) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    try {
    const latest = requestStore.refreshPersisted();
    const previouslySaved = latest.find(r => r.submissionKey === submissionKey.current && r.employeeCode === CURRENT_USER.code);
    if (previouslySaved) {
      if (attemptedDraft.current !== JSON.stringify(d)) throw new PersistenceFailure("conflict", "نسخه قبلی همین فرم ذخیره شده است؛ تغییرهای تازه ارسال نشدند. درخواست ذخیره‌شده را در فهرست بررسی کنید.");
      onDone(previouslySaved.id); return;
    }
    const latestBalance = leaveBalance(latest.filter(r => r.id !== replacing?.id));
    const fresh = checkDraft(d, latest, latestBalance.pendingDays, replacing?.id);
    const newOverlap = fresh.overlapping.some(r => !checked.overlapping.some(previous => previous.id === r.id));
    if (Object.keys(fresh.errors).length || newOverlap || fresh.overlapping.length && !ack) {
      if (newOverlap) setAck(false);
      throw new PersistenceFailure("conflict", "اطلاعات درخواست‌ها تغییر کرده است؛ خطاها، مانده و هم‌پوشانی تازه را بررسی و دوباره تأیید کنید.");
    }
    const timed = need.includes("startTime");
    attemptedDraft.current = JSON.stringify(d);
    const id = submitRequest({
      type: d.type, startDate: fresh.iso.start!, endDate: fresh.iso.end!, startTime: timed ? norm(d.startTime) : undefined,
      endTime: need.includes("endTime") ? norm(d.endTime) : undefined, leaveKind: d.type === "dailyLeave" ? d.leaveKind : undefined,
      destination: d.type === "mission" ? d.destination.trim() : undefined, eventRef: need.includes("eventRef") ? d.eventRef : undefined,
      reason: d.reason.trim(), attachments: d.attachments, days: fresh.days,
    }, replacing?.id, submissionKey.current, replacing);
    onDone(id);
    } catch (error) { setSaveError(persistenceMessage(error)); }
  };
  const fieldError = (msg?: string, id?: string) => msg ? <small id={id} className="ds-error" role="alert">{msg}</small> : null;
  return <form ref={formRef} className="request-form" onSubmit={submit} noValidate aria-describedby={liveId}>
    <div className="labeled"><label htmlFor="req-type">نوع درخواست</label><select id="req-type" aria-describedby="req-type-help" value={d.type} disabled={!!replacing} onChange={e => { setD({ ...emptyDraft(e.target.value as RequestType), reason: d.reason, attachments: d.attachments }); setAck(false); }}>
      {requestTypes.map(t => <option key={t} value={t}>{requestTypeLabels[t]}</option>)}</select><small id="req-type-help">{typeHelp[d.type]}</small></div>
    {need.includes("startDate") && <div className="field-grid">
      <JalaliField label={d.type === "dailyLeave" ? "از تاریخ" : "تاریخ"} value={d.startDate} onChange={v => set("startDate", v)} min={d.type === "overtime" ? addDays(workplaceDateISO(), -7) : workplaceDateISO()} error={err("startDate")} />
      {d.type === "dailyLeave" && <JalaliField label="تا تاریخ" value={d.endDate} onChange={v => set("endDate", v)} min={workplaceDateISO()} error={err("endDate")} />}
    </div>}
    {need.includes("eventRef") && <label>رویداد حضور مورد نظر
      <select value={d.eventRef} aria-invalid={!!err("eventRef")} aria-describedby={err("eventRef") ? `${liveId}-event-error` : undefined} onChange={e => set("eventRef", e.target.value)}>
        <option value="">انتخاب روز…</option>
        {eventOptions.map(({ date, rec }) => <option key={date} value={date}>{longDate(date)} • {rec.state === "missingPunch" ? "خروج ثبت نشده" : rec.state === "late" ? "تأخیر" : rec.state === "correction" ? "نیازمند ویرایش" : rec.state === "noPunch" ? "بدون ثبت" : "ثبت‌شده"}</option>)}
      </select>{fieldError(err("eventRef"), `${liveId}-event-error`)}</label>}
    {need.includes("startTime") && <div className="field-grid">
      <TimeField label={d.type === "missingPunch" ? "ساعت فراموش‌شده" : d.type === "correction" ? "ورود صحیح" : d.type === "overtime" ? "شروع" : "از ساعت"} value={d.startTime} onChange={v => set("startTime", v)} error={err("startTime")} />
      {need.includes("endTime") && <TimeField label={d.type === "correction" ? "خروج صحیح" : d.type === "overtime" ? "پایان" : "تا ساعت"} value={d.endTime} onChange={v => set("endTime", v)} error={err("endTime")} />}
    </div>}
    {d.type === "dailyLeave" && <label>نوع مرخصی<select value={d.leaveKind} aria-invalid={!!err("balance")} aria-describedby={err("balance") ? `${liveId}-balance-error` : undefined} onChange={e => set("leaveKind", e.target.value as "paid" | "unpaid")}><option value="paid">با حقوق</option><option value="unpaid">بدون حقوق</option></select></label>}
    {d.type === "mission" && <Field label="مقصد" value={d.destination} onChange={e => set("destination", e.target.value)} error={err("destination")} />}
    <div className="ds-field"><label htmlFor={`${liveId}-reason`}>{d.type === "mission" ? "شرح ماموریت" : "دلیل و توضیحات"}</label><textarea id={`${liveId}-reason`} rows={3} value={d.reason} aria-invalid={!!err("reason")} aria-describedby={err("reason") ? `${liveId}-reason-error` : undefined} onChange={e => set("reason", e.target.value)} placeholder="توضیح کوتاه و روشن بنویسید" />{fieldError(err("reason"), `${liveId}-reason-error`)}</div>
    <div className="attach-field"><label>پیوست (اختیاری)<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={e => { addFiles(e.target.files); e.target.value = ""; }} /></label>
      <small>PDF، PNG یا JPG تا {fa(ATTACHMENT_LIMIT / 1024 / 1024)} مگابایت؛ فقط نام پرونده در این نسخه نمایشی ذخیره می‌شود.</small>
      {fileError && <p className="field-error" role="alert">{fileError}</p>}
      {d.attachments.length > 0 && <ul className="chip-list">{d.attachments.map(a => <li key={a}><bdi>{a}</bdi><button type="button" aria-label={`حذف پیوست ${a}`} onClick={() => set("attachments", d.attachments.filter(x => x !== a))}>×</button></li>)}</ul>}</div>

    {d.type === "dailyLeave" && <div className={`impact-box ${checked.errors.balance ? "bad" : ""}`}><strong>اثر بر مانده مرخصی</strong>
      <span>{fa(bal.available)} روز مانده{bal.pendingDays ? ` − ${fa(bal.pendingDays)} روز در انتظار` : ""}{checked.paidDays ? ` − ${fa(checked.paidDays)} روز این درخواست` : ""} = <b>{fa(checked.balanceAfter)} روز</b></span>
      {touched && checked.errors.balance && <small id={`${liveId}-balance-error`} className="ds-error" role="alert">{checked.errors.balance}</small>}{d.leaveKind === "unpaid" && <small>مرخصی بدون حقوق از مانده کسر نمی‌شود.</small>}</div>}
    {needsAck && <div className="state-banner warn" role="alert"><ExclamationTriangleIcon /><div><strong>هم‌پوشانی با درخواست دیگر</strong>
      <ul>{checked.overlapping.map(o => <li key={o.id}>{requestTypeLabels[o.type]} • {requestSummary(o)} • <Badge status={o.status} /></li>)}</ul>
      <label className="check-row"><input type="checkbox" checked={ack} aria-invalid={touched && !ack} aria-describedby={touched && !ack ? `${liveId}-overlap-error` : undefined} onChange={e => setAck(e.target.checked)} /> با وجود هم‌پوشانی، ارسال شود</label>{touched && !ack && <small id={`${liveId}-overlap-error`} className="ds-error">برای ادامه این گزینه را تأیید کنید.</small>}</div></div>}
    <div className="route-preview" aria-label="مسیر تأیید"><strong>مسیر تأیید</strong><ol><li><span>۱</span>{CURRENT_USER.name}<small>ارسال</small></li><li><span>۲</span>{MANAGER_NAME}<small>تأیید نهایی مدیر مستقیم</small></li></ol></div>
    <div id={liveId} className="sr-live" aria-live="polite">{touched && hasErrors ? "فرم دارای خطا است؛ موارد مشخص‌شده را اصلاح کنید." : ""}</div>
    {touched && hasErrors && <p className="field-error" role="alert">لطفاً خطاهای فرم را اصلاح کنید.</p>}
    {saveError && <p className="field-error" role="alert">{saveError} فرم شما در این پنجره حفظ شده است؛ بستن پنجره یا بازخوانی صفحه ممکن است پیش‌نویس ذخیره‌نشده را از بین ببرد.</p>}
    <div className="form-actions"><Button variant="secondary" onClick={onCancel}>انصراف</Button><button className="primary-button">{saveError ? "تلاش دوباره برای ذخیره درخواست" : replacing ? "ویرایش و ارسال مجدد" : "ثبت و ارسال درخواست"}</button></div>
  </form>;
}

const filters: Array<["all" | RequestStatus, string]> = [["all", "همه"], ["pending", "در انتظار"], ["returned", "نیازمند ویرایش"], ["approved", "تأیید شده"], ["rejected", "رد شده"]];

export default function RequestsPage() {
  const all = requestStore.use();
  const storageProblem = requestStore.useProblem();
  const mine = all.filter(r => r.employeeCode === CURRENT_USER.code);
  const [filter, setFilter] = useState<"all" | RequestStatus>("all");
  const [open, setOpen] = useState<null | { draft: Draft; replacing?: RoRequest }>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const trigger = useRef<HTMLElement | null>(null);
  const bal = leaveBalance(all);
  const list = mine.filter(r => filter === "all" || r.status === filter);
  const detail = mine.find(r => r.id === detailId) ?? null;

  useEffect(() => {
    const q = new URLSearchParams(window.location.search); const type = q.get("new");
    if (type && (requestTypes as string[]).includes(type)) {
      const date = q.get("date") ?? "";
      const existing = date ? mine.find(r => r.status === "returned" && r.eventRef === date) : undefined;
      setOpen(existing ? { draft: fromRequest(existing), replacing: existing } : { draft: { ...emptyDraft(type as RequestType), eventRef: date } });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  const openNew = (e: { currentTarget: HTMLElement }) => { trigger.current = e.currentTarget; setOpen({ draft: emptyDraft() }); };
  const done = (id: string) => { setOpen(null); setNotice(`درخواست ${fa(id.replace("REQ-", ""))} برای ${MANAGER_NAME} ارسال شد.`); window.setTimeout(() => trigger.current?.focus(), 0); };

  return <>
    <header className="page-header"><div><h1 tabIndex={-1}>درخواست‌ها</h1><p>ثبت و پیگیری درخواست‌های کاری</p></div>
      <button type="button" className="primary-button compact" onClick={openNew}><PlusIcon /> درخواست جدید</button></header>
    {notice && <div className="toast success" role="status"><CheckCircledIcon /> {notice}</div>}
    {storageProblem && <div className="state-banner bad" role="alert"><p>{storageProblem} فهرست نمایش‌داده‌شده ممکن است آخرین وضعیت نباشد؛ هیچ داده‌ای خودکار حذف یا بازیابی نشده است.</p></div>}
    <div className="request-layout">
      <section className="card">
        <div className="summary-cards two"><div><strong>{fa(bal.available)} روز</strong><span>مانده مرخصی</span></div><div><strong>{fa(mine.filter(r => r.status === "pending").length)} مورد</strong><span>در انتظار تأیید</span></div></div>
        <div className="card-heading"><h2>درخواست‌های من</h2></div>
        <div className="filter-chips" role="group" aria-label="فیلتر وضعیت">{filters.map(([k, label]) => <button type="button" key={k} aria-pressed={filter === k} className={filter === k ? "active" : ""} onClick={() => setFilter(k)}>
          {label} <small>{fa(k === "all" ? mine.length : mine.filter(r => r.status === k).length)}</small></button>)}</div>
        {list.length === 0 ? <EmptyState icon={<FileTextIcon />} title="درخواستی پیدا نشد" action={filter !== "all" ? <button type="button" className="secondary-button compact" onClick={() => setFilter("all")}>نمایش همه</button> : <button type="button" className="primary-button compact" onClick={openNew}>ثبت اولین درخواست</button>}>با این فیلتر درخواستی وجود ندارد.</EmptyState>
          : <div className="request-list">{list.map(r => <button type="button" className="request-row" key={r.id} onClick={e => { trigger.current = e.currentTarget; setDetailId(r.id); }}>
            <span className="soft-icon"><FileTextIcon /></span><span><strong>{requestTypeLabels[r.type]}</strong><small>{requestSummary(r)}</small></span><Badge status={r.status} /><ChevronLeftIcon aria-hidden="true" /></button>)}</div>}
      </section>
      <aside className="card balance-card"><span className="overline">مانده مرخصی شما</span><h2>پس از تأیید درخواست‌های جاری</h2><strong>{fa(bal.afterPending)} <small>روز</small></strong>
        <p>{bal.pendingDays ? `${fa(bal.pendingDays)} روز مرخصی با حقوق در انتظار تأیید است و در این عدد کسر شده است.` : "درخواست مرخصی در انتظار تأییدی ندارید."}</p></aside>
    </div>
    <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.replacing ? "ویرایش درخواست" : "درخواست جدید"} eyebrow="فرم درخواست" triggerRef={trigger}>
      {open && <RequestForm initial={open.draft} replacing={open.replacing} onDone={done} onCancel={() => setOpen(null)} />}
    </Sheet>
    <Sheet open={!!detail} onClose={() => setDetailId(null)} title={detail ? requestTypeLabels[detail.type] : ""} eyebrow={detail ? `درخواست ${fa(detail.id.replace("REQ-", ""))}` : undefined} triggerRef={trigger} variant="drawer">
      {detail && <><div className="drawer-status"><Badge status={detail.status} /></div><RequestFacts r={detail} /><h3>تاریخچه</h3><HistoryTimeline history={detail.history} />
        {detail.status === "returned" && <button type="button" className="primary-button" onClick={() => { const r = detail; setDetailId(null); setOpen({ draft: fromRequest(r), replacing: r }); }}>ویرایش و ارسال مجدد</button>}
        </>}
    </Sheet>
  </>;
}
