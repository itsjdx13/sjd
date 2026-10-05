import { useMemo, useRef, useState } from "react";
import { CheckCircledIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Badge } from "../design/components";
import { CURRENT_USER, decideRequest, requestStore, requestTypeLabels, type RequestStatus, type RequestType, type RoRequest } from "./store";
import { HistoryTimeline, RequestFacts, requestSummary, requestTypes } from "./RequestsPage";
import { EmptyState, Sheet, Tabs, panelProps, dateTimeLabel, fa, useMedia } from "./ui";
import { PersistenceFailure, persistenceMessage } from "./persistence";

type Decision = Exclude<RequestStatus, "pending">;
const decisionText: Record<Decision, { verb: string; done: string; button: string }> = {
  approved: { verb: "تأیید", done: "تأیید شد", button: "تأیید درخواست" },
  rejected: { verb: "رد", done: "رد شد", button: "رد درخواست" },
  returned: { verb: "بازگشت برای ویرایش", done: "برای ویرایش برگشت خورد", button: "بازگشت برای ویرایش" },
};

export default function ApprovalsPage({ actorLabel }: { actorLabel: string }) {
  const all = requestStore.use();
  const storageProblem = requestStore.useProblem();
  const inbox = useMemo(() => all.filter(r => r.employeeCode !== CURRENT_USER.code), [all]);
  const [tab, setTab] = useState<"pending" | "decided" | "all">("pending");
  const [type, setType] = useState<"all" | RequestType>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const [announce, setAnnounce] = useState("");
  const [saveError, setSaveError] = useState("");
  const confirmationRecord = useRef<RoRequest | null>(null);
  const wide = useMedia("(min-width: 1024px)");
  const trigger = useRef<HTMLElement | null>(null);
  const confirmTrigger = useRef<HTMLElement | null>(null);

  const pendingCount = inbox.filter(r => r.status === "pending").length;
  const list = inbox.filter(r => (tab === "all" || (tab === "pending") === (r.status === "pending")) && (type === "all" || r.type === type)
    && (!query.trim() || r.employee.includes(query.trim()) || requestTypeLabels[r.type].includes(query.trim()) || r.id.includes(query.trim())));
  const selected = inbox.find(r => r.id === selectedId) ?? (wide ? list[0] : undefined) ?? null;
  const counts = { pending: pendingCount, decided: inbox.length - pendingCount, all: inbox.length };

  const ask = (decision: Decision, el: HTMLElement) => {
    if (decision !== "approved" && !comment.trim()) { setCommentError(decision === "rejected" ? "برای رد درخواست دلیل بنویسید." : "بنویسید چه چیزی باید ویرایش شود."); return; }
    setCommentError(""); setSaveError(""); confirmationRecord.current = selected; confirmTrigger.current = el; setConfirm(decision);
  };
  const commit = () => {
    const record = confirmationRecord.current;
    if (!record || !confirm) return;
    try {
    decideRequest(record.id, confirm, actorLabel, comment, record);
    setAnnounce(`درخواست ${record.employee} ${decisionText[confirm].done}. ${fa(Math.max(0, pendingCount - 1))} درخواست منتظر تصمیم است.`);
    setConfirm(null); setComment("");
    window.setTimeout(() => confirmTrigger.current?.focus(), 0);
    setSaveError("");
    } catch (error) {
      setSaveError(persistenceMessage(error));
      if (error instanceof PersistenceFailure && error.kind === "conflict") setConfirm(null);
    }
  };

  const detail = (r: RoRequest) => <>
    <div className="person-head"><span className="initials large" aria-hidden="true">{r.employee[0]}</span><div><h2>{r.employee}</h2><p>کد {fa(r.employeeCode.replace("RG-", ""))} • ارسال {dateTimeLabel(r.createdAt)}</p></div><Badge status={r.status} /></div>
    <RequestFacts r={r} />
    {r.type === "dailyLeave" && r.leaveKind !== "unpaid" && <p className="impact-box"><strong>اثر بر مانده</strong><span>{fa(r.days)} روز از مانده {r.employee} کسر می‌شود.</span></p>}
    <h3>تاریخچه</h3><HistoryTimeline history={r.history} />
    {r.status === "pending" ? <div className="decision-block">
      <label>نظر شما<textarea rows={3} value={comment} onChange={e => { setComment(e.target.value); setCommentError(""); }} aria-invalid={!!commentError} placeholder="برای رد یا بازگشت، نوشتن دلیل لازم است" /></label>
      {commentError && <p className="field-error" role="alert">{commentError}</p>}
      <div className="decision-actions">
        <button type="button" className="secondary-button return" onClick={e => ask("returned", e.currentTarget)}>بازگشت برای ویرایش</button>
        <button type="button" className="secondary-button reject" onClick={e => ask("rejected", e.currentTarget)}>رد درخواست</button>
        <button type="button" className="primary-button" onClick={e => ask("approved", e.currentTarget)}>تأیید درخواست</button>
      </div></div>
      : <div className={`decision-result ${r.status}`} role="status"><CheckCircledIcon /> این درخواست «{decisionText[r.status as Decision].done}» و دیگر قابل تغییر نیست.</div>}
  </>;

  return <>
    <header className="page-header"><div><h1 tabIndex={-1}>صندوق تأییدها</h1><p>{pendingCount ? `${fa(pendingCount)} درخواست منتظر تصمیم شماست` : "درخواست بی‌پاسخی ندارید"}</p></div></header>
    {storageProblem && <div className="state-banner bad" role="alert"><p>{storageProblem} وضعیت نمایش‌داده‌شده قابل اتکا نیست؛ تصمیم‌ها تا بازیابی دسترسی یا اطلاعات ذخیره نمی‌شوند.</p></div>}
    {!confirm && saveError && <p className="field-error" role="alert">{saveError}</p>}
    <div className="approval-layout">
      <section className="card approval-inbox" aria-label="فهرست درخواست‌ها">
        <Tabs idBase="inbox" label="وضعیت درخواست‌ها" value={tab} onChange={v => { setTab(v); setSelectedId(null); }} className="segment" tabs={[["pending", `منتظر ${fa(counts.pending)}`], ["decided", `بررسی‌شده ${fa(counts.decided)}`], ["all", "همه"]] as const} />
        <div {...panelProps("inbox", tab)} className="tab-panel">
        <div className="toolbar"><div className="search-field"><MagnifyingGlassIcon aria-hidden="true" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="نام یا نوع درخواست" aria-label="جستجوی درخواست" /></div>
          <select aria-label="فیلتر نوع" value={type} onChange={e => setType(e.target.value as "all" | RequestType)}><option value="all">همه نوع‌ها</option>{requestTypes.map(t => <option key={t} value={t}>{requestTypeLabels[t]}</option>)}</select></div>
        {list.length === 0 ? <EmptyState title={tab === "pending" && !query && type === "all" ? "همه درخواست‌ها بررسی شده‌اند" : "موردی پیدا نشد"}>{tab === "pending" ? "درخواست جدیدی که نیاز به تصمیم شما داشته باشد اینجا نمایش داده می‌شود." : "فیلترها را تغییر دهید."}</EmptyState>
          : list.map(r => <button type="button" key={r.id} className={`approval-item ${selected?.id === r.id ? "active" : ""}`} aria-current={selected?.id === r.id ? "true" : undefined}
            onClick={e => { trigger.current = e.currentTarget; setSelectedId(r.id); setComment(""); setCommentError(""); }}>
            <span className="initials" aria-hidden="true">{r.employee[0]}</span><span><strong>{r.employee}</strong><small>{requestTypeLabels[r.type]} • {requestSummary(r)}</small></span><Badge status={r.status} /></button>)}
        </div>
      </section>
      {wide && <section className="card approval-detail" aria-label="جزئیات درخواست">{selected ? detail(selected) : <EmptyState title="درخواستی انتخاب نشده">یک درخواست را از فهرست انتخاب کنید.</EmptyState>}</section>}
    </div>
    {!wide && <Sheet open={!!selectedId && !!selected} onClose={() => setSelectedId(null)} title={selected ? requestTypeLabels[selected.type] : ""} eyebrow="بررسی درخواست" triggerRef={trigger}>{selected && detail(selected)}</Sheet>}
    <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="تأیید تصمیم" triggerRef={confirmTrigger}>
      {confirm && confirmationRecord.current && <div className="confirm-content">
        <p>{decisionText[confirm].verb} درخواست {requestTypeLabels[confirmationRecord.current.type]} {confirmationRecord.current.employee}؟ این اقدام در تاریخچه با نام «{actorLabel}» ثبت می‌شود و قابل بازگشت نیست.</p>
        {comment.trim() && <p className="impact-box"><strong>نظر ثبت‌شونده</strong><span>{comment}</span></p>}
        {saveError && <p className="field-error" role="alert">{saveError} نظر و تصمیم انتخابی شما برای تلاش دوباره حفظ شده است.</p>}
        <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setConfirm(null)}>انصراف</button><button type="button" className="primary-button" onClick={commit}>{saveError ? "تلاش دوباره برای ذخیره تصمیم" : `بله، ${decisionText[confirm].verb} شود`}</button></div></div>}
    </Sheet>
    <div className="sr-live" aria-live="polite">{announce}</div>
  </>;
}
