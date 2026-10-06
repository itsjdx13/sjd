import { useId, useRef, useState, type FormEvent } from "react";
import { normalizeDigits } from "../design/locale";
import { correctLeaveBalance, requestStore } from "./store";
import { balanceFor, leaveFingerprint, readLeaveData, useLeaveRevision } from "./leave";
import { PersistenceFailure, persistenceMessage } from "./persistence";
import { dateTimeLabel, fa } from "./ui";

export function LeaveCorrectionForm({ code, onSaved, onCancel }: { code: string; onSaved: () => void; onCancel: () => void }) {
  const requests = requestStore.use();
  useLeaveRevision();
  const balance = balanceFor(requests, code);
  const baseline = useRef<string | null>(null);
  if (baseline.current === null) { try { baseline.current = leaveFingerprint(requests, code); } catch { /* display the storage notice */ } }
  const operationId = useRef(crypto.randomUUID());
  const [target, setTarget] = useState(balance.available === undefined ? "" : String(balance.available));
  const [reason, setReason] = useState(""), [reviewed, setReviewed] = useState(false), [touched, setTouched] = useState(false), [saveError, setSaveError] = useState("");
  const form = useRef<HTMLFormElement>(null), id = useId();
  const normalized = normalizeDigits(target).replace(/٫/g, ".");
  const value = normalized.trim() ? Number(normalized) : NaN;
  const amountError = !Number.isFinite(value) || !Number.isSafeInteger(Math.round(value * 100)) || value < 0 || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001 ? "عدد غیرمنفی با حداکثر دو رقم اعشار وارد کنید." : value < balance.pendingDays ? "مقدار جدید نمی‌تواند کمتر از روزهای رزروشده باشد." : "";
  const reasonError = reason.trim().length < 10 || reason.trim().length > 500 ? "دلیل را بین ۱۰ تا ۵۰۰ نویسه بنویسید." : "";
  const submit = (event: FormEvent) => {
    event.preventDefault(); setTouched(true);
    if (amountError || reasonError || !reviewed) { requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return; }
    try {
      if (!baseline.current) throw new PersistenceFailure("corrupt", "مانده قابل خواندن نیست؛ اصلاح ذخیره نشد.");
      correctLeaveBalance({ id: operationId.current, code, target: value, reason, actor: "منابع انسانی (نمایشی)", expected: baseline.current });
      onSaved();
    } catch (error) {
      setSaveError(persistenceMessage(error));
      if (error instanceof PersistenceFailure && error.kind === "conflict") {
        try { baseline.current = leaveFingerprint(requestStore.getPersisted(), code); } catch { baseline.current = null; }
        setReviewed(false);
      }
    }
  };
  return <form ref={form} className="request-form" onSubmit={submit} noValidate>
    <p className="muted-text">اصلاح محلیِ مانده روزانه با حقوق است؛ در همه صفحه‌ها و اعتبارسنجی درخواست استفاده می‌شود. سهم سالانه یا تبدیل مرخصی ساعتی محاسبه نمی‌شود.</p>
    <div className="impact-box"><strong>مانده فعلی: {balance.available === undefined ? "ثبت نشده" : `${fa(balance.available)} روز`}</strong><span>{fa(balance.pendingDays)} روز رزرو درخواست‌ها • پس از رزرو: {balance.afterPending === undefined ? "ثبت نشده" : fa(balance.afterPending)}</span></div>
    <label>مانده جدید پیش از رزرو درخواست‌ها<input inputMode="decimal" value={target} aria-invalid={touched && !!amountError} aria-describedby={touched && amountError ? `${id}-amount` : undefined} onChange={e => { setTarget(e.target.value); setReviewed(false); }} />
      {touched && amountError && <small id={`${id}-amount`} className="ds-error" role="alert">{amountError}</small>}</label>
    <label>دلیل اصلاح مانده<textarea value={reason} aria-invalid={touched && !!reasonError} aria-describedby={touched && reasonError ? `${id}-reason` : undefined} onChange={e => { setReason(e.target.value); setReviewed(false); }} />
      {touched && reasonError && <small id={`${id}-reason`} className="ds-error" role="alert">{reasonError}</small>}</label>
    {!amountError && <p className="muted-text">پس از ذخیره: {fa(value)} روز مانده • {fa(value - balance.pendingDays)} روز پس از رزرو. تغییر: {balance.available === undefined ? "ثبت مانده اولیه" : `${fa(Math.round((value - balance.available) * 100) / 100)} روز`}</p>}
    <label className="check-row"><input type="checkbox" checked={reviewed} aria-invalid={touched && !reviewed} aria-describedby={touched && !reviewed ? `${id}-review` : undefined} onChange={e => setReviewed(e.target.checked)} />مقدار، دلیل و اثر بر درخواست‌ها را بررسی کردم.</label>
    {touched && !reviewed && <small id={`${id}-review`} className="ds-error" role="alert">پیش از ثبت، اثر اصلاح را تأیید کنید.</small>}
    {(balance.problem || saveError) && <p className="ds-error" role="alert">{saveError || balance.problem}</p>}
    <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>انصراف</button><button className="primary-button">{saveError ? "تلاش دوباره برای ذخیره" : "ثبت اصلاح مانده"}</button></div>
  </form>;
}

export function LeaveCorrectionHistory({ code }: { code: string }) {
  const requests = requestStore.use(); useLeaveRevision();
  try {
    const history = readLeaveData(requests).corrections.filter(c => c.employeeCode === code).slice().reverse();
    return <section className="leave-history"><h3>تاریخچه اصلاح مانده</h3>{history.length === 0 ? <p className="muted-text">اصلاحی ثبت نشده است.</p> : <ol className="status-timeline">{history.map(c => <li key={c.id}><span aria-hidden="true" /><div><strong>{c.before === null ? "ثبت نشده" : fa(c.before)} ← {fa(c.after)} روز</strong><small>{dateTimeLabel(c.at)} • {c.actor}</small><p>{c.reason}</p></div></li>)}</ol>}</section>;
  } catch { return <p className="ds-error" role="alert">تاریخچه قابل خواندن نیست؛ داده‌ای حذف نشد.</p>; }
}
